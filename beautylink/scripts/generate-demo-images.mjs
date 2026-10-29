// Generates the bundled demo / stock imagery in public/demo as lightweight SVGs.
// Run: node scripts/generate-demo-images.mjs
// These are illustrations, not photos — owners are expected to upload their own work.
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "demo");
fs.mkdirSync(OUT, { recursive: true });

const INK = "#3A2A22";

function frame({ w = 800, h = 800, from, to, glow = "#ffffff", glowX = 0.7, glowY = 0.25, body, grain = 0.06 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
<radialGradient id="glow" cx="${glowX}" cy="${glowY}" r="0.6"><stop offset="0" stop-color="${glow}" stop-opacity="0.75"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.14  0 0 0 ${grain} 0"/></filter>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<rect width="${w}" height="${h}" fill="url(#glow)"/>
${body}
<rect width="${w}" height="${h}" filter="url(#grain)"/>
</svg>`;
}

// Closed eye with a fan of lashes. density/curl control the look.
function lashes({ cx = 400, cy = 400, width = 420, count = 34, len = 70, curl = 22, stroke = INK, sw = 2.2 }) {
  const half = width / 2;
  const lid = `M ${cx - half} ${cy} Q ${cx} ${cy + 120} ${cx + half} ${cy}`;
  let lines = "";
  for (let i = 0; i < count; i++) {
    const t = 0.06 + (i / (count - 1)) * 0.88;
    // point on quadratic lid curve
    const x0 = cx - half, x1 = cx, x2 = cx + half, y0 = cy, y1 = cy + 120, y2 = cy;
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * x1 + t ** 2 * x2;
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * y1 + t ** 2 * y2;
    const lean = (t - 0.5) * 1.6; // outer lashes lean outward
    const l = len * (0.65 + Math.sin(t * Math.PI) * 0.45) * (0.9 + ((i * 37) % 10) / 50);
    const ex = x + lean * l * 0.55;
    const ey = y + l;
    const qx = x + lean * l * 0.1 + curl * Math.sign(lean || 1) * 0.2;
    const qy = y + l * 0.75;
    lines += `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${ex.toFixed(1)} ${(ey - curl).toFixed(1)}" />`;
  }
  return `<g fill="none" stroke="${stroke}" stroke-linecap="round" stroke-width="${sw}"><path d="${lid}" stroke-width="${sw + 1}"/>${lines}</g>`;
}

function brow({ cx = 400, cy = 330, width = 440, stroke = INK }) {
  let hairs = "";
  const n = 150;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = cx - width / 2 + t * width;
    const arch = Math.sin(Math.min(t / 0.68, 1) * Math.PI * 0.5) * 70 - (t > 0.68 ? (t - 0.68) * 160 : 0);
    const y = cy + 40 - arch;
    const thick = 52 * (1 - t * 0.8);
    const jitter = ((i * 53) % 17) - 8;
    const angle = 0.9 - t * 1.2;
    const len = thick + 6;
    hairs += `<path d="M ${(x + jitter * 0.6).toFixed(1)} ${(y + thick / 2 + jitter).toFixed(1)} l ${(Math.cos(angle) * len).toFixed(1)} ${(-Math.sin(angle) * len * 0.8).toFixed(1)}"/>`;
  }
  return `<g fill="none" stroke="${stroke}" stroke-linecap="round" stroke-width="1.6">${hairs}</g>`;
}

function almondNails({ x = 160, y = 260, colors, scale = 1 }) {
  return colors
    .map((c, i) => {
      const nx = x + i * 100 * scale;
      const ny = y + Math.abs(2 - i) * 22 * scale;
      return `<g transform="translate(${nx} ${ny}) scale(${scale})">
<path d="M 40 0 C 70 0 80 60 80 120 L 80 250 C 80 270 66 280 40 280 C 14 280 0 270 0 250 L 0 120 C 0 60 10 0 40 0 Z" fill="${c}"/>
<path d="M 22 40 C 26 30 32 24 38 22" stroke="#ffffff" stroke-opacity="0.65" stroke-width="5" fill="none" stroke-linecap="round"/>
</g>`;
    })
    .join("");
}

function bottle({ x, y, w = 120, h = 220, fill = "#E9CFC6", cap = INK, label = true }) {
  return `<g transform="translate(${x} ${y})">
<rect x="${w * 0.32}" y="0" width="${w * 0.36}" height="${h * 0.24}" rx="8" fill="${cap}"/>
<rect x="0" y="${h * 0.22}" width="${w}" height="${h * 0.78}" rx="${w * 0.22}" fill="${fill}"/>
<rect x="0" y="${h * 0.22}" width="${w}" height="${h * 0.78}" rx="${w * 0.22}" fill="none" stroke="${INK}" stroke-opacity="0.15" stroke-width="2"/>
${label ? `<rect x="${w * 0.18}" y="${h * 0.5}" width="${w * 0.64}" height="${h * 0.22}" rx="6" fill="#ffffff" fill-opacity="0.55"/>` : ""}
<path d="M ${w * 0.14} ${h * 0.34} q 6 -8 16 -10" stroke="#fff" stroke-opacity="0.7" stroke-width="5" fill="none" stroke-linecap="round"/>
</g>`;
}

function dropper({ x, y, fill = "#D9B79F" }) {
  return `<g transform="translate(${x} ${y})">
<rect x="45" y="0" width="30" height="70" rx="14" fill="${INK}"/>
<rect x="38" y="62" width="44" height="22" rx="6" fill="#C9A98C"/>
<rect x="0" y="84" width="120" height="190" rx="30" fill="${fill}" fill-opacity="0.92"/>
<rect x="0" y="150" width="120" height="124" rx="30" fill="#ffffff" fill-opacity="0.25"/>
<path d="M 18 112 q 6 -10 18 -12" stroke="#fff" stroke-opacity="0.8" stroke-width="6" fill="none" stroke-linecap="round"/>
</g>`;
}

const drop = (x, y, s = 1, fill = "#ffffff") =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M 0 -30 C 12 -12 20 0 20 10 C 20 22 11 30 0 30 C -11 30 -20 22 -20 10 C -20 0 -12 -12 0 -30 Z" fill="${fill}" fill-opacity="0.85"/>`;

const arch = (x, y, w, h, fill, opacity = 1) =>
  `<path d="M ${x} ${y + h} L ${x} ${y + w / 2} A ${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} L ${x + w} ${y + h} Z" fill="${fill}" fill-opacity="${opacity}"/>`;

function stem(x, y, h, lean = 0, color = "#8E7A63") {
  const leaves = [0.35, 0.55, 0.75]
    .map((t, i) => {
      const lx = x + lean * t;
      const ly = y - h * t;
      const dir = i % 2 ? 1 : -1;
      return `<path d="M ${lx} ${ly} q ${dir * 30} -10 ${dir * 46} -38 q ${-dir * 26} 4 ${-dir * 46} 38 Z" fill="${color}" fill-opacity="0.75"/>`;
    })
    .join("");
  return `<path d="M ${x} ${y} q ${lean / 2} ${-h / 2} ${lean} ${-h}" stroke="${color}" stroke-width="3" fill="none"/>${leaves}`;
}

const sparkle = (x, y, s = 1, fill = INK) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M 0 -20 C 2 -4 4 -2 20 0 C 4 2 2 4 0 20 C -2 4 -4 2 -20 0 C -4 -2 -2 -4 0 -20 Z" fill="${fill}"/>`;

const files = {
  // ---------- service imagery ----------
  "service-classic-lashes.svg": frame({
    from: "#F7E9E3", to: "#E7C9BF",
    body: `<circle cx="400" cy="420" r="250" fill="#ffffff" fill-opacity="0.35"/>${lashes({ cy: 330, count: 30, len: 72 })}${sparkle(600, 200, 1.1)}`,
  }),
  "service-volume-lashes.svg": frame({
    from: "#EBD8CF", to: "#CDA899", glowX: 0.3,
    body: `<circle cx="400" cy="420" r="260" fill="#ffffff" fill-opacity="0.28"/>${lashes({ cy: 330, count: 64, len: 92, sw: 1.8 })}${sparkle(210, 210, 0.9)}${sparkle(620, 600, 0.6)}`,
  }),
  "service-lash-lift.svg": frame({
    from: "#F4ECE4", to: "#DCC6B2",
    body: `<circle cx="400" cy="400" r="240" fill="none" stroke="${INK}" stroke-opacity="0.15" stroke-width="2"/>${lashes({ cy: 340, count: 26, len: 80, curl: 60 })}`,
  }),
  "service-brows.svg": frame({
    from: "#F3E6DC", to: "#D9BBA6", glowX: 0.25,
    body: `<ellipse cx="400" cy="420" rx="300" ry="220" fill="#ffffff" fill-opacity="0.3"/>${brow({ cy: 300 })}
<path d="M 220 470 Q 400 560 590 470" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  }),
  "service-gel-manicure.svg": frame({
    from: "#FBF1EC", to: "#EBCFC6",
    body: `${almondNails({ x: 170, y: 250, colors: ["#C98C83", "#E3B3A8", "#B46F67", "#EBC3B8", "#D79F94"] })}`,
  }),
  "service-signature-facial.svg": frame({
    from: "#F5EEE6", to: "#E2CDBB", glowX: 0.3,
    body: `<circle cx="470" cy="420" r="230" fill="#ffffff" fill-opacity="0.35"/>${dropper({ x: 300, y: 250 })}${bottle({ x: 470, y: 330, w: 130, h: 210, fill: "#F2DCD3" })}${drop(560, 230, 0.8)}${drop(620, 280, 0.5)}`,
  }),
  "service-brow-lamination.svg": frame({
    from: "#EFE3D8", to: "#CBB29C",
    body: `${brow({ cy: 330, width: 480 })}${sparkle(620, 560, 0.9)}`,
  }),
  "service-pedicure.svg": frame({
    from: "#F7EDE6", to: "#E6CFC1", glowX: 0.4,
    body: `${almondNails({ x: 220, y: 260, colors: ["#B9655E", "#D88F86", "#E7B9AE", "#F0D2C9"], scale: 0.95 })}`,
  }),

  // ---------- gallery ----------
  "gallery-nude-set.svg": frame({
    from: "#F5E9E2", to: "#E1C2B6",
    body: almondNails({ x: 170, y: 230, colors: ["#E9C7BC", "#DDB2A5", "#D19D8F", "#C58979", "#B97566"] }),
  }),
  "gallery-lash-detail.svg": frame({
    from: "#E9D5CB", to: "#BF9887", glowX: 0.2, glowY: 0.8,
    body: `${lashes({ cy: 320, count: 54, len: 100, width: 520, sw: 1.8 })}`,
  }),
  "gallery-skincare-shelf.svg": frame({
    from: "#F2EAE0", to: "#D7C2AE",
    body: `<rect x="80" y="560" width="640" height="14" rx="7" fill="${INK}" fill-opacity="0.75"/>${bottle({ x: 130, y: 330, w: 120, h: 230, fill: "#EAD3C5" })}${dropper({ x: 300, y: 286, fill: "#C9A086" })}${bottle({ x: 470, y: 380, w: 110, h: 180, fill: "#F3E4DA" })}${bottle({ x: 600, y: 420, w: 90, h: 140, fill: "#D7B3A1", label: false })}`,
  }),
  "gallery-arches.svg": frame({
    from: "#F7EFE8", to: "#E8D2C5", glowX: 0.8,
    body: `${arch(140, 250, 220, 450, "#E6C1B6")}${arch(420, 180, 240, 520, "#D7B4A0", 0.9)}${stem(260, 700, 300, 30)}${sparkle(560, 140, 0.8)}`,
  }),
  "gallery-chrome-nails.svg": frame({
    from: "#EDE4DC", to: "#C6B2A3",
    body: almondNails({ x: 170, y: 250, colors: ["#F4EEE9", "#E0D3CA", "#CDBDB1", "#E9DED6", "#D6C6BA"] }) + sparkle(640, 200, 1) + sparkle(160, 640, 0.6),
  }),
  "gallery-brow-result.svg": frame({
    from: "#F1E2D7", to: "#CFAF98", glowX: 0.6,
    body: `${brow({ cy: 300 })}<path d="M 220 470 Q 400 560 590 470" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>${sparkle(620, 620, 0.8)}`,
  }),

  // ---------- branding ----------
  "amy-logo.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7E8E1"/><stop offset="1" stop-color="#E4C3B7"/></linearGradient></defs>
<circle cx="200" cy="200" r="200" fill="url(#g)"/>
<circle cx="200" cy="200" r="168" fill="none" stroke="${INK}" stroke-opacity="0.35" stroke-width="2"/>
<text x="200" y="250" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="150" font-style="italic" fill="${INK}">A</text>
<text x="200" y="305" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22" letter-spacing="7" fill="${INK}">BEAUTY</text>
</svg>`,
  "amy-cover.svg": frame({
    w: 1600, h: 700, from: "#F8EEE8", to: "#E6C9BD", glowX: 0.25, glowY: 0.3,
    body: `${arch(980, 140, 260, 620, "#E9CFC5")}${arch(1260, 240, 220, 520, "#D9B6A6", 0.85)}${arch(120, 320, 200, 440, "#EFDAD1", 0.8)}
<g transform="translate(560 140) scale(0.9)">${lashes({ cx: 400, cy: 230, count: 40, len: 80, width: 460, sw: 2 })}</g>
${stem(1150, 760, 380, 40)}${stem(1210, 760, 300, -30)}${sparkle(860, 120, 1.2)}${sparkle(1500, 160, 0.7)}`,
  }),
  "cover-linen.svg": frame({
    w: 1600, h: 700, from: "#F3ECE2", to: "#D6C3AC", glowX: 0.8,
    body: `${arch(200, 180, 280, 600, "#E6D6C2")}${arch(1100, 120, 300, 680, "#CDB59A", 0.8)}${stem(700, 760, 420, 60)}${stem(760, 760, 340, -40)}`,
  }),
  "cover-sage.svg": frame({
    w: 1600, h: 700, from: "#F1F1EA", to: "#C9D0BF", glowX: 0.3,
    body: `${arch(1150, 160, 280, 600, "#DCE1D3")}${stem(400, 760, 460, 50, "#7F8C72")}${stem(470, 760, 360, -30, "#7F8C72")}${stem(1350, 760, 300, 20, "#7F8C72")}`,
  }),
  "cover-noir.svg": frame({
    w: 1600, h: 700, from: "#2A221D", to: "#120F0D", glow: "#D9C1A3", glowX: 0.7, glowY: 0.2, grain: 0.12,
    body: `${arch(1000, 160, 280, 600, "#3A2F28")}${arch(1280, 260, 220, 500, "#4A3C33", 0.8)}${sparkle(300, 220, 1.4, "#D9C1A3")}${sparkle(420, 420, 0.7, "#D9C1A3")}`,
  }),
};

for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), svg.replace(/\n\s*/g, "\n"));
}
console.log(`Wrote ${Object.keys(files).length} images to ${OUT}`);
