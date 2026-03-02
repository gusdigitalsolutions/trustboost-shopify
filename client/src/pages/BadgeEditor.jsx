// client/src/pages/BadgeEditor.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, Text, Button, TextField, Select, Checkbox, Badge, Banner, Modal, BlockStack, InlineStack, Divider, Spinner, Toast, Frame } from '@shopify/polaris';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApi } from '../hooks/useApi';
import BadgePreview from '../components/BadgePreview';

const BADGE_TYPES = [
  { value: 'secure_checkout', label: 'Secure Checkout' }, { value: 'free_shipping', label: 'Free Shipping' },
  { value: 'money_back', label: 'Money-Back Guarantee' }, { value: 'free_returns', label: 'Free Returns' },
  { value: 'verified_business', label: 'Verified Business' }, { value: 'ssl_secured', label: 'SSL Secured' },
  { value: 'support_247', label: '24/7 Support' }, { value: 'fast_delivery', label: 'Fast Delivery' },
  { value: 'satisfaction', label: 'Satisfaction Guaranteed' }, { value: 'custom', label: 'Custom' },
];

const DEFAULT_LABELS = { secure_checkout:'Secure Checkout', free_shipping:'Free Shipping', money_back:'30-Day Money Back', free_returns:'Free Returns', verified_business:'Verified Business', ssl_secured:'SSL Secured', support_247:'24/7 Support', fast_delivery:'Fast Delivery', satisfaction:'Satisfaction Guaranteed', custom:'Custom Badge' };

function SortableBadgeRow({ badge, onEdit, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: badge.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <InlineStack gap="200" align="space-between" blockAlign="center">
        <InlineStack gap="200" blockAlign="center">
          <span {...attributes} {...listeners} style={{ cursor: 'grab', padding: '4px' }}>⠿</span>
          <Badge status={badge.enabled ? 'success' : 'attention'}>{badge.enabled ? 'On' : 'Off'}</Badge>
          <Text>{badge.label}</Text><Text color="subdued" variant="bodySm">{badge.badge_type}</Text>
        </InlineStack>
        <InlineStack gap="200">
          <Button size="slim" onClick={() => onToggle(badge)}>{badge.enabled ? 'Disable' : 'Enable'}</Button>
          <Button size="slim" onClick={() => onEdit(badge)}>Edit</Button>
          <Button size="slim" destructive onClick={() => onDelete(badge.id)}>Delete</Button>
        </InlineStack>
      </InlineStack>
    </div>
  );
}

export default function BadgeEditor() {
  const { get, post, put, del } = useApi();
  const [badges, setBadges] = useState([]);
  const [settings, setSettings] = useState(null);
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ badge_type: 'secure_checkout', label: '', sublabel: '', link_url: '', page_type: 'product', enabled: true });
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const load = useCallback(async () => {
    try { const [b, s] = await Promise.all([get('/api/badges'), get('/api/settings')]); setBadges(b.badges||[]); setSettings(s.settings); setPlan(b.plan); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingBadge(null); setForm({ badge_type: 'secure_checkout', label: 'Secure Checkout', sublabel: '', link_url: '', page_type: 'product', enabled: true }); setModalOpen(true); };
  const openEdit = (b) => { setEditingBadge(b); setForm({ badge_type: b.badge_type, label: b.label, sublabel: b.sublabel||'', link_url: b.link_url||'', page_type: b.page_type, enabled: Boolean(b.enabled) }); setModalOpen(true); };

  const handleSave = async () => {
    try { editingBadge ? await put(`/api/badges/${editingBadge.id}`, form) : await post('/api/badges', form); setToast(editingBadge ? 'Badge updated' : 'Badge created'); setModalOpen(false); load(); }
    catch (e) { setToast('Error: ' + (e.message||'Unknown error')); }
  };

  const handleDelete = async (id) => { if (!confirm('Delete this badge?')) return; await del(`/api/badges/${id}`); setToast('Badge deleted'); load(); };
  const handleToggle = async (b) => { await put(`/api/badges/${b.id}`, { enabled: !b.enabled }); load(); };
  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const reordered = arrayMove(badges, badges.findIndex(b => b.id === active.id), badges.findIndex(b => b.id === over.id));
    setBadges(reordered);
    await put('/api/badges/reorder', { order: reordered.map((b, i) => ({ id: b.id, order_index: i })) });
  };

  if (loading) return <Page><Spinner /></Page>;
  return (
    <Frame>
      <Page title="Badge Editor" primaryAction={{ content: 'Add Badge', onAction: openCreate }}>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Your Badges ({badges.length})</Text><Divider />
                {badges.length === 0 ? <Banner><p>No badges yet. Click "Add Badge" to get started.</p></Banner> : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={badges.map(b => b.id)} strategy={verticalListSortingStrategy}>
                      <BlockStack gap="200">{badges.map(b => <SortableBadgeRow key={b.id} badge={b} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />)}</BlockStack>
                    </SortableContext>
                  </DndContext>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section secondary><Card><BlockStack gap="300"><Text variant="headingMd">Live Preview</Text><BadgePreview badges={badges.filter(b => b.enabled)} settings={settings} /></BlockStack></Card></Layout.Section>
        </Layout>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingBadge ? 'Edit Badge' : 'Add Badge'} primaryAction={{ content: 'Save', onAction: handleSave }} secondaryActions={[{ content: 'Cancel', onAction: () => setModalOpen(false) }]}>
          <Modal.Section>
            <BlockStack gap="300">
              <Select label="Badge Type" options={BADGE_TYPES} value={form.badge_type} onChange={v => setForm(f => ({...f, badge_type:v, label:DEFAULT_LABELS[v]||v}))} />
              <TextField label="Label" value={form.label} onChange={v => setForm(f => ({...f, label:v}))} autoComplete="off" />
              <TextField label="Sublabel (optional)" value={form.sublabel} onChange={v => setForm(f => ({...f, sublabel:v}))} autoComplete="off" />
              <TextField label="Link URL (optional)" value={form.link_url} onChange={v => setForm(f => ({...f, link_url:v}))} placeholder="/policies/refund-policy" autoComplete="off" />
              <Select label="Page Type" options={[{value:'product',label:'Product Page'},{value:'cart',label:'Cart Page',disabled:plan!=='pro'},{value:'collection',label:'Collection Page',disabled:plan!=='pro'},{value:'home',label:'Home Page',disabled:plan!=='pro'},{value:'all',label:'All Pages',disabled:plan!=='pro'}]} value={form.page_type} onChange={v => setForm(f => ({...f, page_type:v}))} />
              <Checkbox label="Enabled" checked={form.enabled} onChange={v => setForm(f => ({...f, enabled:v}))} />
            </BlockStack>
          </Modal.Section>
        </Modal>
        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}
      </Page>
    </Frame>
  );
}
