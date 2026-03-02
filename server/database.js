// TrustBoost — server/database.js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/trustboost.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db;
export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, shop TEXT NOT NULL, state TEXT, is_online INTEGER DEFAULT 0, scope TEXT, expires TEXT, access_token TEXT, online_access_info TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_sessions_shop ON sessions(shop);
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, shop TEXT NOT NULL UNIQUE, position TEXT DEFAULT 'below_add_to_cart', style_theme TEXT DEFAULT 'minimal', icon_size INTEGER DEFAULT 28, show_labels INTEGER DEFAULT 1, show_sublabels INTEGER DEFAULT 0, badge_color TEXT DEFAULT '#333333', label_color TEXT DEFAULT '#333333', background_color TEXT DEFAULT 'transparent', border_enabled INTEGER DEFAULT 0, border_color TEXT DEFAULT '#e5e7eb', border_radius INTEGER DEFAULT 8, padding_x INTEGER DEFAULT 16, padding_y INTEGER DEFAULT 12, gap INTEGER DEFAULT 24, pages TEXT DEFAULT '["product"]', plan TEXT DEFAULT 'free', billing_charge_id TEXT, billing_status TEXT DEFAULT 'inactive', custom_css TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_settings_shop ON settings(shop);
    CREATE TABLE IF NOT EXISTS badge_configs (id INTEGER PRIMARY KEY AUTOINCREMENT, shop TEXT NOT NULL, badge_type TEXT NOT NULL, position TEXT DEFAULT 'below_add_to_cart', page_type TEXT DEFAULT 'product', icon TEXT, label TEXT NOT NULL, sublabel TEXT DEFAULT '', link_url TEXT DEFAULT '', enabled INTEGER DEFAULT 1, order_index INTEGER DEFAULT 0, custom_css TEXT DEFAULT '', ab_variant TEXT DEFAULT 'control', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_badge_configs_shop ON badge_configs(shop);
    CREATE TABLE IF NOT EXISTS analytics_events (id INTEGER PRIMARY KEY AUTOINCREMENT, shop TEXT NOT NULL, badge_id INTEGER, badge_type TEXT, event_type TEXT NOT NULL CHECK(event_type IN ('impression', 'click')), page_type TEXT, session_id TEXT, ab_variant TEXT DEFAULT 'control', created_at TEXT DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_analytics_shop ON analytics_events(shop);
    CREATE TABLE IF NOT EXISTS script_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, shop TEXT NOT NULL UNIQUE, script_tag_id TEXT, src TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
  `);
  console.log('[DB] Schema initialized at', DB_PATH);
}

export function getOrCreateSettings(shop) {
  const db = getDb();
  let s = db.prepare('SELECT * FROM settings WHERE shop = ?').get(shop);
  if (!s) { db.prepare('INSERT INTO settings (shop) VALUES (?)').run(shop); s = db.prepare('SELECT * FROM settings WHERE shop = ?').get(shop); }
  return s;
}

export function parseSettings(settings) {
  if (!settings) return null;
  return { ...settings, pages: safeJsonParse(settings.pages, ['product']), show_labels: Boolean(settings.show_labels), show_sublabels: Boolean(settings.show_sublabels), border_enabled: Boolean(settings.border_enabled) };
}

export function getEnabledBadges(shop) {
  return getDb().prepare('SELECT * FROM badge_configs WHERE shop = ? AND enabled = 1 ORDER BY order_index ASC, id ASC').all(shop);
}

function safeJsonParse(val, fallback) { try { return JSON.parse(val); } catch { return fallback; } }

if (process.argv[1] === fileURLToPath(import.meta.url)) { getDb(); console.log('[DB] Database setup complete.'); process.exit(0); }

export default getDb;
