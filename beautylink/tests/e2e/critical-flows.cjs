const { chromium, devices } = require('playwright');
const { DatabaseSync } = require('node:sqlite');
const assert = require('assert');
// Run against a freshly reset database:  npm run db:reset && npm run dev, then  npm run test:e2e
const B = process.env.BASE_URL || 'http://localhost:3000';
const SP = process.env.SCREENSHOT_DIR || require('os').tmpdir();
const db = new DatabaseSync(process.env.DATABASE_PATH || require('path').join(__dirname, '../../data/beautylink.db'));
const count = (sql, ...a) => db.prepare(sql).get(...a).n;
const log = (...a) => console.log('✓', ...a);
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const watch = (p) => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/example\.com|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); }); };

  // 1. Visitor on a phone
  const visitor = await browser.newContext({ ...devices['iPhone 13'] });
  // Block external navigation so tests don't depend on network; record where we were sent.
  const outbound = [];
  await visitor.route(/^https?:\/\/(?!localhost)/, r => { outbound.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>external</h1>' }); });
  let p = await visitor.newPage(); watch(p);
  const before = count("SELECT COUNT(*) n FROM page_events WHERE is_sample=0");
  await p.goto(B + '/amybeauty');
  await p.waitForTimeout(800);
  assert.equal(count("SELECT COUNT(*) n FROM page_events WHERE is_sample=0 AND event_type='page_view'"), 1, 'page view recorded');
  log('public page loads on mobile; page_view recorded');
  const card = p.locator('li', { has: p.getByRole('heading', { name: 'Gel manicure' }) });
  await card.getByRole('link', { name: /Book this treatment/ }).click();
  await p.waitForURL(/example\.com/);
  assert.match(p.url(), /example\.com\/demo-booking\/amy-beauty-studio\/gel-manicure/);
  await new Promise(r => setTimeout(r, 500));
  const ev = db.prepare("SELECT e.event_type, e.target, s.name FROM page_events e LEFT JOIN services s ON s.id=e.service_id WHERE e.is_sample=0 ORDER BY e.id DESC LIMIT 1").get();
  assert.deepEqual([ev.event_type, ev.target, ev.name], ['booking_click', 'service', 'Gel manicure']);
  log('service booking button navigates to its own URL and logs booking_click for that service');
  await p.goto(B + '/amybeauty');
  const lift = p.locator('li', { has: p.getByRole('heading', { name: 'Lash lift & tint' }) });
  assert.equal(await lift.getByRole('link', { name: /Book this treatment/ }).getAttribute('href'), 'https://example.com/demo-booking/amy-beauty-studio');
  log('service without own link falls back to general booking URL');
  assert.equal(await p.getByRole('heading', { name: /Lash infill/ }).count(), 0);
  log('hidden service not shown');
  await p.getByRole('link', { name: 'Instagram' }).first().click();
  await p.waitForTimeout(500);
  assert.equal(db.prepare("SELECT event_type, target FROM page_events WHERE is_sample=0 ORDER BY id DESC LIMIT 1").get().target, 'instagram');
  log('social click logged');

  // 2. Owner via demo
  const owner = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  p = await owner.newPage(); watch(p);
  await p.goto(B + '/login');
  await p.getByRole('button', { name: 'Explore the demo dashboard' }).click();
  await p.waitForURL(B + '/dashboard');
  await p.screenshot({ path: SP + '/d-overview.png', fullPage: true });
  log('demo login -> dashboard');
  await p.goto(B + '/dashboard/services');
  await p.screenshot({ path: SP + '/d-services.png', fullPage: true });
  await p.locator('li', { hasText: 'Classic lash extensions' }).getByRole('link', { name: 'Edit' }).click();
  await p.waitForURL(/services\/[0-9a-f-]+$/);
  // invalid link first
  await p.getByLabel('Price', { exact: true }).fill('49');
  await p.getByLabel(/Booking link for this service/).fill('javascript:alert(1)');
  await p.getByRole('button', { name: 'Save changes' }).click();
  await p.getByText(/"javascript:" links are not allowed/).first().waitFor();
  assert.equal(await p.getByLabel('Price', { exact: true }).inputValue(), '49', 'values kept after validation error');
  await p.screenshot({ path: SP + '/d-service-error.png', fullPage: true });
  log('dangerous URL rejected with clear error; form values preserved');
  await p.getByLabel(/Booking link for this service/).fill('www.fresha.com/book-now/amy-test/classic');
  await p.getByRole('button', { name: 'Save changes' }).click();
  await p.waitForURL(/services\?saved=/);
  log('service saved');
  // Preview
  const pv = await owner.newPage(); watch(pv);
  await pv.goto(B + '/amybeauty?preview=1');
  const lashCard = pv.locator('li', { has: pv.getByRole('heading', { name: 'Classic lash extensions' }) });
  await lashCard.getByText('£49').waitFor();
  assert.equal(await lashCard.getByRole('link', { name: /Book this treatment/ }).getAttribute('href'), 'https://www.fresha.com/book-now/amy-test/classic');
  await lashCard.getByText('Opens Fresha').waitFor();
  log('public page reflects new price + link (with provider label)');
  // Unpublish
  await p.goto(B + '/dashboard');
  p.once('dialog', d => d.accept());
  await p.getByRole('button', { name: 'Unpublish' }).first().click();
  await p.getByRole('button', { name: 'Publish page' }).first().waitFor();
  const anon = await browser.newPage();
  const res = await anon.goto(B + '/amybeauty');
  assert.equal(res.status(), 404);
  await anon.getByText("This page isn’t available").waitFor();
  const r2 = await pv.goto(B + '/amybeauty');
  assert.equal(r2.status(), 200, 'owner can still preview');
  log('unpublish hides page from public (404) but owner can preview');
  await p.getByRole('button', { name: 'Publish page' }).first().click();
  await p.getByRole('button', { name: 'Unpublish' }).first().waitFor();
  assert.equal((await anon.goto(B + '/amybeauty')).status(), 200);
  log('republished');
  // Hide a service & reorder
  await p.goto(B + '/dashboard/services');
  await p.getByRole('button', { name: 'Hide Brow shaping from your page' }).click();
  await p.getByRole('button', { name: 'Show Brow shaping on your page' }).waitFor();
  await p.getByRole('button', { name: 'Move Gel manicure up' }).click();
  await p.waitForTimeout(800);
  const order = db.prepare("SELECT s.name FROM services s JOIN businesses b ON b.id=s.business_id WHERE b.slug='amybeauty' ORDER BY display_order").all().map(r => r.name);
  assert.deepEqual(order.slice(0, 3), ['Classic lash extensions', 'Gel manicure', 'Brow shaping']);
  log('hide + reorder work');
  // Theme
  await p.goto(B + '/dashboard/appearance');
  await p.getByText('Noir', { exact: true }).click();
  await p.getByRole('button', { name: 'Save appearance' }).click();
  await p.getByText('Appearance saved.').waitFor();
  await p.screenshot({ path: SP + '/d-appearance.png', fullPage: true });
  await pv.goto(B + '/amybeauty');
  assert.equal(await pv.locator('[data-theme="noir"]').count() > 0, true);
  await pv.setViewportSize({ width: 390, height: 844 });
  await pv.screenshot({ path: SP + '/pub-noir.png' });
  log('theme switch applies to public page');
  // Links validation
  await p.goto(B + '/dashboard/links');
  await p.getByLabel('WhatsApp number').fill('12');
  await p.getByRole('button', { name: 'Save links' }).click();
  await p.getByText(/doesn't look complete/).waitFor();
  log('links validation');
  // Gallery add from library
  await p.goto(B + '/dashboard/gallery');
  await p.getByRole('button', { name: 'Choose from library' }).click();
  await p.getByRole('button', { name: 'Pedicure' }).click();
  await p.locator('#caption').fill('Summer toes');
  await p.getByRole('button', { name: 'Add to gallery' }).click();
  await p.getByText('Image added to your gallery.').waitFor();
  log('gallery add');
  // Upload a real PNG to a service
  await p.goto(B + '/dashboard/services/new');
  await p.getByLabel('Service name').fill('Test upload service');
  await p.getByLabel('Price', { exact: true }).fill('20');
  await p.locator('input[name=image_file]').setInputFiles({ name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  await p.getByRole('button', { name: 'Add service' }).click();
  await p.waitForURL(/services\?saved=/);
  const up = db.prepare("SELECT image_url FROM services WHERE name='Test upload service'").get().image_url;
  assert.match(up, /^\/api\/uploads\/.+\.png$/);
  const ir = await anon.request.get(B + up);
  assert.equal(ir.headers()['content-type'], 'image/png');
  log('image upload stored and served');
  // Analytics
  await p.goto(B + '/dashboard/analytics');
  await p.getByText('Booking clicks are not bookings.').waitFor();
  await p.screenshot({ path: SP + '/d-analytics.png', fullPage: true });
  await p.getByRole('link', { name: 'Hide sample data' }).click();
  await p.waitForURL(/sample=0/);
  const views = await p.locator('dt:text("Page views") + dd').first().innerText();
  assert.equal(views.trim(), '1');
  log('analytics: real-only view shows 1 page view');
  // Content
  await p.goto(B + '/dashboard/content');
  await p.screenshot({ path: SP + '/d-content.png', fullPage: true });

  // 3. New user signup -> onboarding
  const nu = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  p = await nu.newPage(); watch(p);
  await p.goto(B + '/signup');
  await p.getByLabel('Email').fill('test' + Date.now() + '@example.com');
  await p.getByLabel('Password').fill('short');
  await p.getByRole('button', { name: 'Create account' }).click();
  await p.getByText('Use at least 8 characters.').waitFor();
  await p.getByLabel('Password').fill('correct horse battery');
  await p.getByRole('button', { name: 'Create account' }).click();
  await p.waitForURL(/onboarding/);
  const slug = 'nails-by-zoe-' + (Date.now() % 100000);
  await p.getByLabel('Business name').fill('Nails by Zoe');
  await p.getByLabel('Your page address').fill(slug);
  await p.getByLabel('What do you do?').selectOption('Nail technician');
  await p.getByLabel(/Location/).fill('Leeds');
  await p.getByRole('button', { name: 'Create my page' }).click();
  await p.waitForURL(/dashboard\?welcome=1/);
  await p.screenshot({ path: SP + '/d-new-overview.png', fullPage: true });
  assert.equal((await anon.goto(B + '/' + slug)).status(), 404, 'new page unpublished by default');
  await p.goto(B + '/dashboard/services');
  await p.getByText('No services yet').waitFor();
  await p.goto(B + '/dashboard/links');
  await p.getByLabel('WhatsApp number').fill('07700 900456');
  await p.getByRole('button', { name: 'Save links' }).click();
  await p.getByText('Links saved.').waitFor();
  await p.goto(B + '/dashboard/services/new');
  await p.getByLabel('Service name').fill('BIAB overlay');
  await p.getByLabel('Price', { exact: true }).fill('35');
  await p.getByText(/the button will show “Enquire on WhatsApp”/).waitFor();
  await p.getByRole('button', { name: 'Add service' }).click();
  await p.waitForURL(/services\?saved=/);
  await p.goto(B + '/dashboard');
  await p.getByRole('button', { name: 'Publish page' }).first().click();
  await p.getByRole('button', { name: 'Unpublish' }).first().waitFor();
  await anon.goto(B + '/' + slug);
  const wa = await anon.locator('li', { has: anon.getByRole('heading', { name: 'BIAB overlay' }) }).getByRole('link').getAttribute('href');
  assert.match(wa, /^https:\/\/wa\.me\/447700900456\?text=/);
  await anon.setViewportSize({ width: 390, height: 844 });
  await anon.screenshot({ path: SP + '/pub-new.png', fullPage: true });
  log('signup -> onboarding -> publish; no booking URL shows WhatsApp fallback');
  // Isolation: new user cannot edit demo's service by id
  const demoSvc = db.prepare("SELECT s.id FROM services s JOIN businesses b ON b.id=s.business_id WHERE b.is_demo=1 LIMIT 1").get().id;
  const r404 = await p.goto(B + '/dashboard/services/' + demoSvc);
  assert.equal(r404.status(), 404);
  log("owners can't open another business's service");

  // Events API hardening
  const api = await anon.request.post(B + '/api/events', { headers: { 'user-agent': 'Mozilla/5.0 (iPhone) Safari' }, data: { businessId: 'x', type: 'page_view' } });
  assert.equal(api.status(), 400);
  const unpub = db.prepare("SELECT id FROM businesses WHERE is_demo=1").get().id;
  assert.equal((await anon.request.post(B + '/api/events', { headers: { 'user-agent': 'Mozilla/5.0 (iPhone) Safari' }, data: { businessId: unpub, type: 'hack' } })).status(), 400);
  log('events API validates input');

  if (errors.length) { console.log('BROWSER ERRORS:', errors); process.exitCode = 1; } else log('no browser console errors');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
