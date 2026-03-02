# TrustBoost

**The fastest trust badge app on Shopify. One request. Under 4KB. Zero page speed impact.**

Built by [Gus Digital Solutions](https://gusdigitalsolutions.com) — gus@gusdigitalsolutions.com

---

## Why TrustBoost?

Every other trust badge app is bloated. Yotpo adds 26 HTTP requests, 641KB of data, and 3+ seconds of load time. Most badges look fake and aren't even clickable. Reddit merchants call them "total crap."

TrustBoost is the opposite:

| Metric | TrustBoost | Typical Badge App |
|---|---|---|
| HTTP requests | **1** | 20–30 |
| JavaScript size | **< 4KB gzipped** | 200KB+ |
| External requests | **Zero** | Multiple CDN/analytics calls |
| Layout shift (CLS) | **0** | Often significant |
| Load time impact | **Negligible** | 2–4 seconds |
| Badge links | **Real `<a>` tags** | Images only |
| Dark mode | **Built-in** | Rarely |

### How it works

1. A single `<script>` tag is installed via Shopify ScriptTag API
2. That script fetches **one** cached endpoint: `/api/storefront/badges.js?shop=...`
3. The server injects your badge config **inline** into the response — no second request
4. All SVG icons are inline — **zero external image requests**
5. The widget renders after the DOM is ready, async, non-blocking — **zero layout shift**

---

## License

MIT — © 2026 [Gus Digital Solutions](https://gusdigitalsolutions.com)
