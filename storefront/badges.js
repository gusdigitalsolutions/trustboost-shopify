/**
 * TrustBoost Storefront Widget
 * Ultra-lightweight trust badge renderer for Shopify storefronts
 * < 4KB gzipped, zero dependencies, inline SVGs, zero layout shift
 * (c) 2026 Gus Digital Solutions
 */
(function () {
  'use strict';
  var config = typeof __TB_CONFIG__ !== 'undefined' ? __TB_CONFIG__ : null;
  if (!config || !config.badges || config.badges.length === 0) return;
  var settings = config.settings || {};
  var badges = config.badges;
  var shop = settings.shop || '';

  var ICONS = {
    secure_checkout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    free_shipping: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 4v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    money_back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
    free_returns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>',
    verified_business: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
    ssl_secured: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    support_247: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.36 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    fast_delivery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    satisfaction: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    custom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  };

  function getPageType() {
    var path = window.location.pathname;
    if (path.indexOf('/products/') !== -1) return 'product';
    if (path.indexOf('/cart') !== -1) return 'cart';
    if (path.indexOf('/collections/') !== -1) return 'collection';
    if (path === '/' || path === '') return 'home';
    return 'other';
  }

  function getPageBadges(pageType) {
    return badges.filter(function (b) { return b.enabled && (b.page_type === pageType || b.page_type === 'all'); });
  }

  function buildCSS(s) {
    var size = (s.icon_size||28)+'px', badgeColor=s.badge_color||'#333', labelColor=s.label_color||'#333', bg=s.background_color||'transparent';
    var border=s.border_enabled?('1px solid '+(s.border_color||'#e5e7eb')):'none', radius=(s.border_radius||0)+'px';
    var px=(s.padding_x||16)+'px', py=(s.padding_y||12)+'px', gap=(s.gap||24)+'px';
    return '.tb-widget{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:'+gap+';padding:'+py+' '+px+';background:'+bg+';border:'+border+';border-radius:'+radius+'}'  +
      '.tb-badge{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:'+labelColor+';cursor:pointer;transition:opacity .15s}'
      +'.tb-badge:hover{opacity:.75}.tb-icon{width:'+size+';height:'+size+';color:'+badgeColor+';flex-shrink:0;display:flex;align-items:center}.tb-icon svg{width:100%;height:100%}'
      +'.tb-text{display:flex;flex-direction:column;gap:2px}.tb-label{font-size:13px;font-weight:500;line-height:1.2}.tb-sublabel{font-size:11px;opacity:.7;line-height:1.2}'
      +'@media(prefers-color-scheme:dark){.tb-badge{color:#e5e7eb}.tb-icon{color:#9ca3af}}'+(s.custom_css||'');
  }

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escAttr(s) { return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  function buildHTML(pageBadges, s) {
    var showLabels = s.show_labels !== false, showSublabels = s.show_sublabels === true;
    var badgeHTML = pageBadges.map(function (b) {
      var icon = b.icon ? '<img src="'+b.icon+'" width="'+(s.icon_size||28)+'" height="'+(s.icon_size||28)+'" alt="" loading="lazy" />' : (ICONS[b.badge_type]||ICONS.custom);
      var textHTML = showLabels ? '<span class="tb-text"><span class="tb-label">'+escHtml(b.label)+'</span>'+(showSublabels&&b.sublabel?'<span class="tb-sublabel">'+escHtml(b.sublabel)+'</span>':'')+'</span>' : '';
      var href = b.link_url ? ' href="'+escAttr(b.link_url)+'"' : '', tag = b.link_url ? 'a' : 'span';
      return '<'+tag+href+' class="tb-badge" data-tb-badge="'+b.id+'"><span class="tb-icon">'+icon+'</span>'+textHTML+'</'+tag+'>';
    }).join('');
    return '<div class="tb-widget" role="list" aria-label="Trust badges">'+badgeHTML+'</div>';
  }

  var sessionId = (function () { try { var k='_tb_sid', s=sessionStorage.getItem(k); if (!s) { s=Math.random().toString(36).slice(2); sessionStorage.setItem(k,s); } return s; } catch { return 'anon'; } })();

  function trackEvent(badgeId, badgeType, eventType, pageType) {
    var url='/api/analytics/event', payload=JSON.stringify({shop:shop,badge_id:badgeId,badge_type:badgeType,event_type:eventType,page_type:pageType,session_id:sessionId});
    if (eventType==='click'&&navigator.sendBeacon) { navigator.sendBeacon(url,new Blob([payload],{type:'application/json'})); }
    else { fetch(url,{method:'POST',body:payload,headers:{'Content-Type':'application/json'},keepalive:true}).catch(function(){}); }
  }

  function inject(widget) {
    var position=settings.position||'below_add_to_cart', inserted=false;
    var selectors={below_add_to_cart:['[data-product-form]','.product-form','#AddToCartForm','.product__form-wrapper','form[action*="/cart/add"]'],above_add_to_cart:['[data-product-form]','.product-form','#AddToCartForm','.product__form-wrapper','form[action*="/cart/add"]'],below_price:['.price','[data-product-price]','.product__price','.price-section'],bottom_of_page:['main','#MainContent','.main-content','body']};
    var targets=selectors[position]||selectors.below_add_to_cart;
    for (var i=0;i<targets.length;i++) {
      var el=document.querySelector(targets[i]);
      if (el) { if (position==='above_add_to_cart'||position==='below_price') { el.parentNode.insertBefore(widget,el.nextSibling); } else { el.appendChild(widget); } inserted=true; break; }
    }
    if (!inserted) { (document.querySelector('main')||document.body).appendChild(widget); }
  }

  function init() {
    var pageType=getPageType(), pageBadges=getPageBadges(pageType);
    if (pageBadges.length===0) return;
    var style=document.createElement('style'); style.textContent=buildCSS(settings); document.head.appendChild(style);
    var wrapper=document.createElement('div'); wrapper.id='trustboost-widget'; wrapper.innerHTML=buildHTML(pageBadges,settings);
    var widget=wrapper.firstChild;
    requestAnimationFrame(function() {
      inject(widget);
      pageBadges.forEach(function(b) { trackEvent(b.id,b.badge_type,'impression',pageType); });
      widget.addEventListener('click',function(e) {
        var el=e.target.closest('[data-tb-badge]'); if (!el) return;
        var badge=pageBadges.find(function(b){return String(b.id)===el.getAttribute('data-tb-badge');});
        if (badge) trackEvent(badge.id,badge.badge_type,'click',pageType);
      });
    });
  }

  if (document.readyState==='loading') { document.addEventListener('DOMContentLoaded',init); } else { init(); }
})();
