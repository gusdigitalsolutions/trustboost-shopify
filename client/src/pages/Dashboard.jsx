// client/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Page, Layout, Card, Text, Button, Badge, Banner, BlockStack, InlineStack, Divider, Spinner } from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import BadgePreview from '../components/BadgePreview';

export default function Dashboard() {
  const navigate = useNavigate();
  const { get } = useApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([get('/api/badges'), get('/api/settings'), get('/api/analytics?days=7')])
      .then(([b, s, a]) => setData({ badges: b.badges||[], settings: s.settings, plan: b.plan, limits: b.limits, analytics: a }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Page><Spinner /></Page>;
  const { badges, settings, plan, limits, analytics } = data;
  const enabledCount = badges.filter(b => b.enabled).length;
  const isPro = plan === 'pro';
  const totalImpressions = analytics?.summary?.reduce((s, b) => s + (b.impressions||0), 0) || 0;
  const totalClicks = analytics?.summary?.reduce((s, b) => s + (b.clicks||0), 0) || 0;
  const ctr = totalImpressions > 0 ? ((totalClicks/totalImpressions)*100).toFixed(1) : '0.0';

  return (
    <Page title="TrustBoost Dashboard" primaryAction={{ content: 'Edit Badges', onAction: () => navigate('/badges') }}>
      <Layout>
        {!isPro && <Layout.Section><Banner title="Upgrade to Pro — $4.99/mo" status="info" action={{ content: 'Upgrade Now', url: '/billing/start' }}><p>Unlock unlimited badges, all page types, analytics, and A/B testing.</p></Banner></Layout.Section>}
        <Layout.Section>
          <InlineStack gap="400" wrap>
            <Card><BlockStack gap="100"><Text variant="headingLg">{enabledCount}</Text><Text color="subdued">Active Badges</Text></BlockStack></Card>
            <Card><BlockStack gap="100"><Text variant="headingLg">{totalImpressions.toLocaleString()}</Text><Text color="subdued">Impressions (7d)</Text></BlockStack></Card>
            <Card><BlockStack gap="100"><Text variant="headingLg">{totalClicks.toLocaleString()}</Text><Text color="subdued">Clicks (7d)</Text></BlockStack></Card>
            <Card><BlockStack gap="100"><Text variant="headingLg">{ctr}%</Text><Text color="subdued">CTR (7d)</Text></BlockStack></Card>
          </InlineStack>
        </Layout.Section>
        <Layout.Section><Card><BlockStack gap="400"><Text variant="headingMd">Live Preview</Text><BadgePreview badges={badges.filter(b => b.enabled)} settings={settings} /></BlockStack></Card></Layout.Section>
        <Layout.Section secondary>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Quick Setup</Text><Divider />
              {[{label:'App installed',done:true},{label:'Badge added',done:badges.length>0},{label:'Badge enabled',done:enabledCount>0},{label:'Style configured',done:settings?.style_theme!=='minimal'}].map((step, i) => (
                <InlineStack key={i} gap="200" align="start"><Badge status={step.done?'success':'attention'}>{step.done?'Done':'Pending'}</Badge><Text>{step.label}</Text></InlineStack>
              ))}
              <Button onClick={() => navigate('/badges')}>Go to Badge Editor</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
