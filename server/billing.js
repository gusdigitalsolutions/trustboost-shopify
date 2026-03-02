// TrustBoost — server/billing.js
import { getDb } from './database.js';

export const PLANS = {
  free: { name: 'Free', price: 0, badge_limit: 3, pages: ['product'], analytics: false, ab_testing: false, custom_icons: false, priority_support: false },
  pro: { name: 'Pro', price: 4.99, badge_limit: Infinity, pages: ['product','cart','collection','home','all'], analytics: true, ab_testing: true, custom_icons: true, priority_support: true },
};

export async function createBillingCharge(session, shopify) {
  const client = new shopify.api.clients.Rest({ session });
  const charge = await client.post({ path: 'recurring_application_charges', data: { recurring_application_charge: { name: 'TrustBoost Pro', price: 4.99, return_url: `${process.env.HOST}/billing/callback?shop=${session.shop}`, test: process.env.NODE_ENV !== 'production', trial_days: 0, terms: 'TrustBoost Pro: Unlimited trust badges, all pages, analytics, and A/B testing.' } }, type: 'application/json' });
  return charge.body.recurring_application_charge;
}

export async function activateBillingCharge(session, chargeId, shopify) {
  const client = new shopify.api.clients.Rest({ session });
  const charge = await client.post({ path: `recurring_application_charges/${chargeId}/activate`, data: {}, type: 'application/json' });
  getDb().prepare(`UPDATE settings SET plan = 'pro', billing_charge_id = ?, billing_status = 'active', updated_at = datetime('now') WHERE shop = ?`).run(String(chargeId), session.shop);
  return charge.body.recurring_application_charge;
}

export async function cancelBilling(session, shopify) {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings WHERE shop = ?').get(session.shop);
  if (settings?.billing_charge_id) { try { await new shopify.api.clients.Rest({ session }).delete({ path: `recurring_application_charges/${settings.billing_charge_id}` }); } catch (err) {} }
  db.prepare(`UPDATE settings SET plan = 'free', billing_charge_id = NULL, billing_status = 'inactive', updated_at = datetime('now') WHERE shop = ?`).run(session.shop);
}

export async function getBillingStatus(session, shopify) {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings WHERE shop = ?').get(session.shop);
  if (!settings?.billing_charge_id) return { plan: 'free', status: 'inactive' };
  try {
    const charge = await new shopify.api.clients.Rest({ session }).get({ path: `recurring_application_charges/${settings.billing_charge_id}` });
    const status = charge.body.recurring_application_charge.status;
    if (status === 'active') return { plan: 'pro', status: 'active', charge: charge.body.recurring_application_charge };
    db.prepare(`UPDATE settings SET plan = 'free', billing_status = ? WHERE shop = ?`).run(status, session.shop);
    return { plan: 'free', status };
  } catch (err) { return { plan: settings.plan || 'free', status: settings.billing_status || 'unknown' }; }
}

export function requiresPro(feature) {
  return (req, res, next) => {
    const shop = req.query.shop || req.body?.shop || res.locals.shopify?.session?.shop;
    if (!shop) return res.status(401).json({ error: 'Unauthorized' });
    const settings = getDb().prepare('SELECT plan FROM settings WHERE shop = ?').get(shop);
    if ((settings?.plan || 'free') !== 'pro') return res.status(402).json({ error: 'upgrade_required', feature, message: 'This feature requires TrustBoost Pro ($4.99/mo).' });
    next();
  };
}

export function canAddBadge(shop) {
  const db = getDb();
  const plan = db.prepare('SELECT plan FROM settings WHERE shop = ?').get(shop)?.plan || 'free';
  const limit = PLANS[plan]?.badge_limit ?? 3;
  if (limit === Infinity) return { allowed: true };
  const count = db.prepare('SELECT COUNT(*) as c FROM badge_configs WHERE shop = ?').get(shop);
  if (count.c >= limit) return { allowed: false, reason: `Free plan is limited to ${limit} badges. Upgrade to Pro for unlimited badges.` };
  return { allowed: true };
}
