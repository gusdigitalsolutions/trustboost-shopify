// client/src/hooks/useApi.js
import { useCallback } from 'react';
const getShop = () => new URLSearchParams(window.location.search).get('shop') || '';
export function useApi() {
  const request = useCallback(async (method, url, body) => {
    const shop = getShop();
    const sep = url.includes('?') ? '&' : '?';
    const fullUrl = shop ? `${url}${sep}shop=${shop}` : url;
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(fullUrl, opts);
    if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw Object.assign(new Error(err.error||'Request failed'), { status: res.status, data: err }); }
    return res.json();
  }, []);
  return { get: (url) => request('GET', url), post: (url, body) => request('POST', url, body), put: (url, body) => request('PUT', url, body), del: (url) => request('DELETE', url) };
}
