// client/src/components/BadgePreview.jsx
import React from 'react';

const ICONS = {
  secure_checkout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  free_shipping: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 4v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  money_back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
  free_returns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>',
  verified_business: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  ssl_secured: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  support_247: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.36 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  fast_delivery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  satisfaction: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  custom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
};

export default function BadgePreview({ badges = [], settings = {} }) {
  const { icon_size=28, badge_color='#333333', label_color='#333333', background_color='transparent', border_enabled=false, border_color='#e5e7eb', border_radius=8, padding_x=16, padding_y=12, gap=24, show_labels=true, show_sublabels=false, custom_css='' } = settings;
  if (!badges || badges.length === 0) return <div style={{ padding: '16px', color: '#999', fontSize: '14px' }}>No active badges to preview.</div>;
  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:`${gap}px`, padding:`${padding_y}px ${padding_x}px`, background:background_color, border:border_enabled?`1px solid ${border_color}`:'none', borderRadius:border_enabled?`${border_radius}px`:0, alignItems:'center', justifyContent:'center' }}>
        {badges.map(badge => (
          <a key={badge.id} href={badge.link_url||'#'} style={{ display:'inline-flex', alignItems:'center', gap:'8px', textDecoration:'none', color:label_color, cursor:'pointer' }} onClick={e => e.preventDefault()}>
            <span style={{ width:`${icon_size}px`, height:`${icon_size}px`, color:badge_color, flexShrink:0 }} dangerouslySetInnerHTML={{ __html: badge.icon || ICONS[badge.badge_type] || ICONS.custom }} />
            {show_labels && <span style={{ display:'flex', flexDirection:'column', gap:'2px' }}><span style={{ fontSize:'13px', fontWeight:500 }}>{badge.label}</span>{show_sublabels && badge.sublabel && <span style={{ fontSize:'11px', opacity:0.7 }}>{badge.sublabel}</span>}</span>}
          </a>
        ))}
      </div>
      {custom_css && <style>{custom_css}</style>}
    </div>
  );
}
