// TrustBoost — server/routes/api.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { getDb, getOrCreateSettings, parseSettings, getEnabledBadges } from '../database.js';
import { canAddBadge, requiresPro, PLANS } from '../billing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const analyticsLimiter = rateLimit({ windowMs: 60000, max: 100, message: { error: 'Too many requests' } });
const upload = multer({ dest: path.join(__dirname, '../../data/uploads/'), limits: { fileSize: 500 * 1024 }, fileFilter: (req, file, cb) => cb(null, ['image/svg+xml','image/png','image/jpeg','image/webp'].includes(file.mimetype)) });

router.get('/badges', (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const db = getDb();
  const badges = db.prepare('SELECT * FROM badge_configs WHERE shop = ? ORDER BY order_index ASC, id ASC').all(shop);
  const settings = parseSettings(getOrCreateSettings(shop));
  res.json({ badges, plan: settings.plan, limits: PLANS[settings.plan] });
});

router.post('/badges', (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const canAdd = canAddBadge(shop);
  if (!canAdd.allowed) return res.status(402).json({ error: 'upgrade_required', message: canAdd.reason });
  const { badge_type, label, sublabel, link_url, position, page_type, enabled, order_index, custom_css } = req.body;
  if (!badge_type || !label) return res.status(400).json({ error: 'badge_type and label are required' });
  const db = getDb();
  const maxOrder = db.prepare('SELECT MAX(order_index) as m FROM badge_configs WHERE shop = ?').get(shop);
  const result = db.prepare('INSERT INTO badge_configs (shop, badge_type, label, sublabel, link_url, position, page_type, enabled, order_index, custom_css) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(shop, badge_type, label, sublabel||'', link_url||'', position||'below_add_to_cart', page_type||'product', enabled!==false?1:0, order_index??((maxOrder?.m??-1)+1), custom_css||'');
  res.status(201).json({ badge: db.prepare('SELECT * FROM badge_configs WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/badges/reorder', (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });
  const db = getDb();
  const update = db.prepare("UPDATE badge_configs SET order_index = ?, updated_at = datetime('now') WHERE id = ? AND shop = ?");
  db.transaction((items) => items.forEach(({ id, order_index }) => update.run(order_index, id, shop)))(order);
  res.json({ ok: true });
});

router.post('/badges/upload-icon', requiresPro('custom_icons'), upload.single('icon'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filename = `${uuidv4()}${path.extname(req.file.originalname)||'.png'}`;
  fs.renameSync(req.file.path, path.join(__dirname, '../../data/uploads/', filename));
  res.json({ url: `/uploads/${filename}` });
});

router.get('/badges/:id', (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const badge = getDb().prepare('SELECT * FROM badge_configs WHERE id = ? AND shop = ?').get(req.params.id, shop);
  if (!badge) return res.status(404).json({ error: 'Badge not found' });
  res.json({ badge });
});

router.put('/badges/:id', (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const db = getDb();
  const badge = db.prepare('SELECT * FROM badge_configs WHERE id = ? AND shop = ?').get(req.params.id, shop);
  if (!badge) return res.status(404).json({ error: 'Badge not found' });
  const { badge_type, label, sublabel, link_url, position, page_type, enabled, order_index, custom_css, icon } = req.body;
  db.prepare(`UPDATE badge_configs SET badge_type=COALESCE(?,badge_type), label=COALESCE(?,label), sublabel=COALESCE(?,sublabel), link_url=COALESCE(?,link_url), position=COALESCE(?,position), page_type=COALESCE(?,page_type), enabled=COALESCE(?,enabled), order_index=COALESCE(?,order_index), custom_css=COALESCE(?,custom_css), icon=COALESCE(?,icon), updated_at=datetime('now') WHERE id=? AND shop=?`).run(badge_type, label, sublabel, link_url, position, page_type, enabled!==undefined?(enabled?1:0):undefined, order_index, custom_css, icon, req.params.id, shop);
  res.json({ badge: db.prepare('SELECT * FROM badge_configs WHERE id = ?').get(req.params.id) });
});

router.delete('/badges/:id', (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const db = getDb();
  if (!db.prepare('SELECT * FROM badge_configs WHERE id = ? AND shop = ?').get(req.params.id, shop)) return res.status(404).json({ error: 'Badge not found' });
  db.prepare('DELETE FROM badge_configs WHERE id = ? AND shop = ?').run(req.params.id, shop);
  res.json({ ok: true });
});

router.get('/settings', (req, res) => {
  const shop = res.locals.shopify.session.shop;
  res.json({ settings: parseSettings(getOrCreateSettings(shop)), plans: PLANS });
});

router.put('/settings', (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const db = getDb();
  const allowed = ['position','style_theme','icon_size','show_labels','show_sublabels','badge_color','label_color','background_color','border_enabled','border_color','border_radius','padding_x','padding_y','gap','pages','custom_css'];
  const updates = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
  if (updates.pages && Array.isArray(updates.pages)) updates.pages = JSON.stringify(updates.pages);
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });
  db.prepare(`UPDATE settings SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE shop = ?`).run(...Object.values(updates), shop);
  res.json({ settings: parseSettings(getOrCreateSettings(shop)) });
});

router.get('/analytics', requiresPro('analytics'), (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const { days = 30, badge_id } = req.query;
  const db = getDb();
  const since = `datetime('now', '-${parseInt(days)} days')`;
  let q = `SELECT badge_id, badge_type, event_type, COUNT(*) as count, DATE(created_at) as date FROM analytics_events WHERE shop = ? AND created_at >= ${since}`;
  const params = [shop];
  if (badge_id) { q += ' AND badge_id = ?'; params.push(badge_id); }
  q += ' GROUP BY badge_id, event_type, DATE(created_at) ORDER BY date DESC';
  const events = db.prepare(q).all(...params);
  const summary = db.prepare(`SELECT badge_id, badge_type, SUM(CASE WHEN event_type='impression' THEN count ELSE 0 END) as impressions, SUM(CASE WHEN event_type='click' THEN count ELSE 0 END) as clicks FROM (${q}) GROUP BY badge_id`).all(...params);
  res.json({ events, summary, days: parseInt(days) });
});

router.post('/analytics/event', analyticsLimiter, express.json(), (req, res) => {
  const { shop, badge_id, badge_type, event_type, page_type, session_id, ab_variant } = req.body;
  if (!shop || !event_type || !['impression','click'].includes(event_type)) return res.status(400).json({ error: 'Invalid event data' });
  const db = getDb();
  if (db.prepare('SELECT plan FROM settings WHERE shop = ?').get(shop)?.plan !== 'pro') return res.status(200).json({ ok: true, ignored: true });
  db.prepare('INSERT INTO analytics_events (shop, badge_id, badge_type, event_type, page_type, session_id, ab_variant) VALUES (?, ?, ?, ?, ?, ?, ?)').run(shop, badge_id||null, badge_type||null, event_type, page_type||null, session_id||null, ab_variant||'control');
  res.json({ ok: true });
});

router.get('/billing/status', (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const settings = getDb().prepare('SELECT plan, billing_status, billing_charge_id FROM settings WHERE shop = ?').get(shop);
  res.json({ plan: settings?.plan||'free', status: settings?.billing_status||'inactive', limits: PLANS[settings?.plan||'free'] });
});

router.get('/storefront/badges.js', (req, res) => {
  const { shop } = req.query;
  if (!shop) { res.set('Content-Type','application/javascript'); return res.send('// TrustBoost: shop parameter required'); }
  const settings = parseSettings(getOrCreateSettings(shop));
  const badges = getEnabledBadges(shop);
  const widgetPath = path.join(__dirname, '../../storefront/badges.js');
  let widgetCode = ''; try { widgetCode = fs.readFileSync(widgetPath, 'utf8'); } catch {}
  res.set('Content-Type','application/javascript; charset=utf-8');
  res.set('Cache-Control','public, max-age=300, stale-while-revalidate=3600');
  res.set('X-Content-Type-Options','nosniff');
  res.send(`(function(){var __TB_CONFIG__=${JSON.stringify({ settings, badges })};\n${widgetCode}\n})()`);
});

export default router;
