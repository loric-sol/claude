import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seedDemo } from "./seed";

/**
 * Prototype storage layer: a single SQLite file using Node's built-in
 * `node:sqlite` driver (no native dependencies). The schema mirrors
 * `supabase/schema.sql`, which is the intended production database.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  is_demo       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,           -- sha256 of the cookie token, never the token itself
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS businesses (
  id                  TEXT PRIMARY KEY,
  owner_user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  category            TEXT NOT NULL,
  location            TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  logo_url            TEXT,
  cover_image_url     TEXT,
  theme               TEXT NOT NULL DEFAULT 'blush',
  general_booking_url TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  whatsapp_number     TEXT,
  address             TEXT,
  instagram_handle    TEXT,
  tiktok_handle       TEXT,
  website_url         TEXT,
  published           INTEGER NOT NULL DEFAULT 0,
  is_demo             INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS businesses_owner_idx ON businesses(owner_user_id);

CREATE TABLE IF NOT EXISTS services (
  id               TEXT PRIMARY KEY,
  business_id      TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  price_pence      INTEGER NOT NULL CHECK (price_pence >= 0),
  price_from       INTEGER NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'GBP',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  image_url        TEXT,
  booking_url      TEXT,
  display_order    INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS services_business_idx ON services(business_id, display_order);

CREATE TABLE IF NOT EXISTS gallery_images (
  id            TEXT PRIMARY KEY,
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  caption       TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS gallery_business_idx ON gallery_images(business_id, display_order);

-- Testimonials entered by the owner. is_sample marks seeded demo content.
CREATE TABLE IF NOT EXISTS reviews (
  id            TEXT PRIMARY KEY,
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  author_name   TEXT NOT NULL,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT '',
  is_sample     INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS faqs (
  id            TEXT PRIMARY KEY,
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Anonymous analytics. No IP addresses, user agents or names are stored.
CREATE TABLE IF NOT EXISTS page_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id  TEXT REFERENCES services(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('page_view','booking_click','social_click','contact_click')),
  target      TEXT,                 -- e.g. 'general', 'service', 'instagram', 'whatsapp'
  visitor_id  TEXT,                 -- random first-party id, null when Do Not Track is set
  session_id  TEXT,
  is_sample   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS events_business_time_idx ON page_events(business_id, created_at);
`;

const globalForDb = globalThis as unknown as { __beautylinkDb?: DatabaseSync };

function open(): DatabaseSync {
  const file = process.env.DATABASE_PATH || path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "beautylink.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  const hasDemo = db.prepare("SELECT 1 FROM businesses WHERE is_demo = 1 LIMIT 1").get();
  if (!hasDemo && demoModeEnabled()) seedDemo(db);
  return db;
}

export function db(): DatabaseSync {
  if (!globalForDb.__beautylinkDb) globalForDb.__beautylinkDb = open();
  return globalForDb.__beautylinkDb;
}

export function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE !== "false";
}

export function transaction<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN");
  try {
    const result = fn();
    d.exec("COMMIT");
    return result;
  } catch (err) {
    d.exec("ROLLBACK");
    throw err;
  }
}

export const nowIso = () => new Date().toISOString();
