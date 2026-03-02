// TrustBoost — server/index.js
import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { shopifyApp } from '@shopify/shopify-app-express';
import { SQLiteSessionStorage } from '@shopify/shopify-app-session-storage-sqlite';
import { ApiVersion, DeliveryMethod } from '@shopify/shopify-api';
import { getDb, getOrCreateSettings } from './database.js';
import apiRouter from './routes/api.js';
import { createBillingCharge, activateBillingCharge } from './billing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CLIENT_DIST = path.join(ROOT, 'client/dist');
const DATA_DIR = path.join(ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES?.split(',') || ['read_products','write_script_tags','read_orders','read_analytics'],
    hostName: process.env.HOST?.replace(/https?:\/\//, ''),
    hostScheme: 'https',
    apiVersion: ApiVersion.January25,
    isEmbeddedApp: true,
  },
  auth: { path: '/api/auth', callbackPath: '/api/auth/callback' },
  webhooks: { path: '/api/webhooks' },
  sessionStorage: new SQLiteSessionStorage(path.join(DATA_DIR, 'sessions.db')),
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'","'unsafe-inline",'cdn.shopify.com','*.myshopify.com'], frameSrc: ["'self",'https://*.myshopify.com','https://admin.shopify.com'], connectSrc: ["'self",'*.myshopify.com'] } }, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api/storefront', cors({ origin: '*' }));

app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(shopify.config.auth.callbackPath, shopify.auth.callback(), async (req, res, next) => {
  const session = res.locals.shopify.session;
  try { getOrCreateSettings(session.shop); await installScriptTag(session); } catch (err) { console.error('[Auth]', err.message); }
  next();
}, shopify.redirectToShopifyOrAppRoot());

shopify.processWebhooks({ webhookHandlers: {
  APP_UNINSTALLED: { deliveryMethod: DeliveryMethod.Http, callbackUrl: '/api/webhooks', callback: async (topic, shop) => { const db = getDb(); ['sessions','settings','badge_configs','script_tags'].forEach(t => db.prepare(`DELETE FROM ${t} WHERE shop = ?`).run(shop)); } },
  CUSTOMERS_DATA_REQUEST: { deliveryMethod: DeliveryMethod.Http, callbackUrl: '/api/webhooks', callback: async () => {} },
  CUSTOMERS_REDACT: { deliveryMethod: DeliveryMethod.Http, callbackUrl: '/api/webhooks', callback: async () => {} },
  SHOP_REDACT: { deliveryMethod: DeliveryMethod.Http, callbackUrl: '/api/webhooks', callback: async (topic, shop) => { getDb().prepare('DELETE FROM analytics_events WHERE shop = ?').run(shop); } },
}});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/billing/start', shopify.validateAuthenticatedSession(), async (req, res) => {
  try { const charge = await createBillingCharge(res.locals.shopify.session, shopify); res.json({ confirmation_url: charge.confirmation_url }); }
  catch (err) { res.status(500).json({ error: 'Failed to create billing charge' }); }
});

app.get('/billing/callback', async (req, res) => {
  const { shop, charge_id } = req.query;
  if (!shop || !charge_id) return res.status(400).send('Missing parameters');
  try {
    const session = await shopify.config.sessionStorage.loadSession(shopify.api.session.getOfflineId(shop));
    if (!session) throw new Error('Session not found');
    await activateBillingCharge(session, charge_id, shopify);
    res.redirect(`/?shop=${shop}&host=${req.query.host || ''}`);
  } catch (err) { res.redirect(`/?shop=${shop}&billing_error=1`); }
});

app.use('/api', shopify.validateAuthenticatedSession(), apiRouter);

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', shopify.ensureInstalledOnShop(), (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
} else {
  app.get('/', (req, res) => res.send('TrustBoost server running.'));
}

async function installScriptTag(session) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM script_tags WHERE shop = ?').get(session.shop);
  const src = `${process.env.HOST}/api/storefront/badges.js`;
  const client = new shopify.api.clients.Rest({ session });
  if (existing?.script_tag_id) { try { await client.delete({ path: `script_tags/${existing.script_tag_id}` }); } catch {} }
  const result = await client.post({ path: 'script_tags', data: { script_tag: { event: 'onload', src, display_scope: 'online_store' } }, type: 'application/json' });
  const tagId = result.body.script_tag.id;
  db.prepare(`INSERT OR REPLACE INTO script_tags (shop, script_tag_id, src, updated_at) VALUES (?, ?, ?, datetime('now'))`).run(session.shop, String(tagId), src);
  console.log(`[ScriptTag] Installed for ${session.shop}: ${tagId}`);
}

app.listen(PORT, () => console.log(`TrustBoost server running on port ${PORT}`));
export default app;
