// client/src/pages/Analytics.jsx
import React, { useState, useEffect } from 'react';
import { Page, Layout, Card, Text, Select, Banner, Spinner, DataTable, BlockStack, InlineStack } from '@shopify/polaris';
import { useApi } from '../hooks/useApi';

export default function Analytics() {
  const { get } = useApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');
  const [plan, setPlan] = useState('free');

  useEffect(() => { get('/api/billing/status').then(r => setPlan(r.plan)).catch(() => {}); }, []);
  useEffect(() => {
    if (plan !== 'pro') { setLoading(false); return; }
    setLoading(true);
    get(`/api/analytics?days=${days}`).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [days, plan]);

  if (plan !== 'pro') return (
    <Page title="Analytics"><Layout><Layout.Section>
      <Banner title="Analytics requires TrustBoost Pro" status="warning" action={{ content: 'Upgrade to Pro — $4.99/mo', url: '/billing/start' }}>
        <p>Track impressions, clicks, and CTR per badge.</p>
      </Banner>
    </Layout.Section></Layout></Page>
  );

  const totalImp = data?.summary?.reduce((s, b) => s + (b.impressions||0), 0) || 0;
  const totalClk = data?.summary?.reduce((s, b) => s + (b.clicks||0), 0) || 0;

  return (
    <Page title="Analytics" subtitle="Badge performance over time">
      <Layout>
        {loading ? <Layout.Section><Spinner /></Layout.Section> : (
          <>
            <Layout.Section>
              <InlineStack gap="400" wrap>
                <Card><BlockStack gap="100"><Text variant="headingLg">{totalImp.toLocaleString()}</Text><Text color="subdued">Total Impressions</Text></BlockStack></Card>
                <Card><BlockStack gap="100"><Text variant="headingLg">{totalClk.toLocaleString()}</Text><Text color="subdued">Total Clicks</Text></BlockStack></Card>
                <Card><BlockStack gap="100"><Text variant="headingLg">{totalImp > 0 ? ((totalClk/totalImp)*100).toFixed(1)+'%' : '0.0%'}</Text><Text color="subdued">Overall CTR</Text></BlockStack></Card>
              </InlineStack>
            </Layout.Section>
            <Layout.Section>
              <Card><BlockStack gap="300">
                <Text variant="headingMd">Per-Badge Performance</Text>
                {data?.summary?.length ? (
                  <DataTable columnContentTypes={['text','numeric','numeric','text']} headings={['Badge','Impressions','Clicks','CTR']} rows={data.summary.map(b => [b.badge_type, (b.impressions||0).toLocaleString(), (b.clicks||0).toLocaleString(), b.impressions>0?((b.clicks/b.impressions)*100).toFixed(1)+'%':'0.0%'])} />
                ) : <Text color="subdued">No data yet.</Text>}
              </BlockStack></Card>
            </Layout.Section>
          </>
        )}
      </Layout>
    </Page>
  );
}
