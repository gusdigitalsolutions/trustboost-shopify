// client/src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Page, Layout, Card, Text, Select, RangeSlider, Checkbox, TextField, Button, Badge, Banner, Divider, BlockStack, InlineStack, Spinner, Toast, Frame } from '@shopify/polaris';
import { useApi } from '../hooks/useApi';

const POSITIONS = [{value:'below_add_to_cart',label:'Below Add to Cart'},{value:'above_add_to_cart',label:'Above Add to Cart'},{value:'below_price',label:'Below Price'},{value:'bottom_of_page',label:'Bottom of Page'}];
const THEMES = [{value:'minimal',label:'Minimal'},{value:'card',label:'Card'},{value:'pill',label:'Pill'},{value:'bordered',label:'Bordered'}];

export default function Settings() {
  const { get, put } = useApi();
  const [settings, setSettings] = useState(null);
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    Promise.all([get('/api/settings'), get('/api/billing/status')])
      .then(([s, b]) => { setSettings(s.settings); setPlan(b.plan); setForm(s.settings); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { const res = await put('/api/settings', form); setSettings(res.settings); setToast('Settings saved'); }
    catch { setToast('Error saving settings'); } finally { setSaving(false); }
  };

  const update = (key) => (val) => setForm(f => ({ ...f, [key]: val }));
  if (loading) return <Page><Spinner /></Page>;

  return (
    <Frame>
      <Page title="Settings" primaryAction={{ content: saving ? 'Saving...' : 'Save Settings', onAction: handleSave, loading: saving }}>
        <Layout>
          <Layout.Section>
            <Card><BlockStack gap="400">
              <Text variant="headingMd">Display</Text><Divider />
              <Select label="Position" options={POSITIONS} value={form.position||'below_add_to_cart'} onChange={update('position')} />
              <Select label="Style Theme" options={THEMES} value={form.style_theme||'minimal'} onChange={update('style_theme')} />
              <RangeSlider label={`Icon Size: ${form.icon_size||28}px`} min={16} max={48} step={2} value={form.icon_size||28} onChange={update('icon_size')} />
              <RangeSlider label={`Gap: ${form.gap||24}px`} min={8} max={64} step={4} value={form.gap||24} onChange={update('gap')} />
              <Checkbox label="Show labels" checked={Boolean(form.show_labels)} onChange={update('show_labels')} />
              <Checkbox label="Show sublabels" checked={Boolean(form.show_sublabels)} onChange={update('show_sublabels')} />
            </BlockStack></Card>
          </Layout.Section>
          <Layout.Section>
            <Card><BlockStack gap="400">
              <Text variant="headingMd">Colors</Text><Divider />
              <TextField label="Badge Icon Color" value={form.badge_color||'#333333'} onChange={update('badge_color')} autoComplete="off" />
              <TextField label="Label Color" value={form.label_color||'#333333'} onChange={update('label_color')} autoComplete="off" />
              <TextField label="Background Color" value={form.background_color||'transparent'} onChange={update('background_color')} autoComplete="off" />
            </BlockStack></Card>
          </Layout.Section>
          <Layout.Section>
            <Card><BlockStack gap="400">
              <Text variant="headingMd">Border</Text><Divider />
              <Checkbox label="Show border" checked={Boolean(form.border_enabled)} onChange={update('border_enabled')} />
              {form.border_enabled && <>
                <TextField label="Border Color" value={form.border_color||'#e5e7eb'} onChange={update('border_color')} autoComplete="off" />
                <RangeSlider label={`Border Radius: ${form.border_radius||8}px`} min={0} max={24} step={1} value={form.border_radius||8} onChange={update('border_radius')} />
              </>}
            </BlockStack></Card>
          </Layout.Section>
          <Layout.Section>
            <Card><BlockStack gap="400">
              <InlineStack align="space-between"><Text variant="headingMd">Plan</Text><Badge status={plan==='pro'?'success':'attention'}>{plan==='pro'?'Pro':'Free'}</Badge></InlineStack><Divider />
              {plan === 'pro' ? <Banner status="success"><p>You're on TrustBoost Pro.</p></Banner> : <Banner title="Upgrade to Pro — $4.99/mo" status="info" action={{ content: 'Upgrade Now', url: '/billing/start' }}><p>Unlimited badges, all pages, analytics, A/B testing.</p></Banner>}
            </BlockStack></Card>
          </Layout.Section>
          <Layout.Section>
            <Card><BlockStack gap="400">
              <Text variant="headingMd">Custom CSS</Text><Divider />
              <TextField label="Custom CSS" value={form.custom_css||''} onChange={update('custom_css')} multiline={6} placeholder=".tb-widget { ... }" autoComplete="off" />
            </BlockStack></Card>
          </Layout.Section>
        </Layout>
        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </Frame>
  );
}
