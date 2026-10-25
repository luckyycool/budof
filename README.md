# 📐 Budof (`budof.com`) — Operational Finance & Startup Modeling Suite

**Budof** (Business Unit Dynamics & Operational Finance) is a 100% client-side, zero-subscription web application engineered for startup founders, finance operators, and venture builders.

It models 36-month dynamic runway, unit economics (CAC, LTV, Magic Number, Rule of 40), tiered pricing elasticity, and includes a turn-based 24-Month Startup Tycoon simulation game.

---

## 🌐 Multi-Page Static SEO Architecture (7 Canonical Landing Pages)

Budof is structured with static subdirectories deployable directly to Cloudflare Pages ($0 cost) with full indexability for Googlebot:

1. **Master Suite Hub:** `https://budof.com/` (`/index.html`)
2. **Startup Runway Calculator:** `https://budof.com/runway-calculator/` (`/runway-calculator/index.html`)
   - *Title:* "Startup Runway Calculator & 36-Month Burn Forecaster | Budof"
   - 36-month cash balance, dynamic hiring roadmap (+15% tax/benefits overhead), Paul Graham's Default Alive detection.
3. **SaaS Unit Economics:** `https://budof.com/saas-unit-economics/` (`/saas-unit-economics/index.html`)
   - *Title:* "SaaS CAC, LTV & Payback Period Calculator | Budof"
   - CAC, LTV, Payback Months, Bessemer Magic Number, and Rule of 40 scoring with algorithmic diagnosis.
4. **Fundraising & Dilution:** `https://budof.com/fundraising-calculator/` (`/fundraising-calculator/index.html`)
   - *Title:* "Startup Fundraising Target & Runway Extension Calculator | Budof"
   - Target round sizing, pre/post-money valuation, option pool shuffle dilution, hiring runway impact.
5. **SaaS ARR Valuation:** `https://budof.com/saas-valuation/` (`/saas-valuation/index.html`)
   - *Title:* "SaaS ARR Valuation Multiple Estimator & Industry Benchmarks | Budof"
   - Bear/Base/Bull valuation multiples and quartile industry benchmarks.
6. **Startup Tycoon Simulation Game:** `https://budof.com/startup-tycoon/` (`/startup-tycoon/index.html`)
   - *Title:* "Startup Tycoon Game Online — 24-Month Business Simulator | Budof"
   - 24-month turn-based simulation with `VideoGame` schema. Hire team, balance burn, survive crises, and pitch VCs.
7. **Founder Deals & Perks:** `https://budof.com/deals-perks/` (`/deals-perks/index.html`)
   - *Title:* "Startup Deals, Cloud Credits & Founder Banking Perks | Budof"
   - High-yield startup banking (4.5%–5% APY), legal formation perks, and $100k+ cloud credits guide.

---

## 🌟 Technical Highlights

- **Zero External Dependencies:** Built with pure vanilla HTML5, CSS3 (Swiss Daylight Design System), and JavaScript ES6.
- **Dual Execution Compatibility:** Works 100% reliably under both local `file:///` protocol and live `https://` on Cloudflare Pages.
- **SEO & Social Optimization:** Full JSON-LD structured data (`WebApplication`, `VideoGame`, `FAQPage`), complete `sitemap.xml` with priority scores, `robots.txt`, `ads.txt`, `_headers`, and 1200x630 social preview card (`og-image.png` & `og-banner.svg`).
- **Client-Side Privacy:** No external tracking or database. User company data and hiring plans remain inside the user's browser.
- **Unified Cloudflare Worker & Assets Standard:** Configured with `wrangler.jsonc` (`run_worker_first: false`). Serves all static web tools from Cloudflare's Edge CDN with unlimited requests for $0, while remaining future-ready for Cloudflare D1 SQL database and KV user account bindings via `worker.js`.

---

## 🚀 Cloudflare Deployment ($0 Free Tier)

Budof can be deployed via **Cloudflare Workers (Recommended)** or **Cloudflare Pages**:

### Option 1: Cloudflare Workers with Static Assets (Unified Standard)
1. In Cloudflare Dashboard, go to **Workers & Pages** ➔ **Create application** ➔ **Worker** (or connect GitHub repository).
2. Cloudflare automatically reads `wrangler.jsonc`:
   - `assets.directory`: `.`
   - `assets.run_worker_first`: `false` (guarantees unlimited free static delivery without consuming worker request quota).
   - `main`: `worker.js` (routes `/api/*` for future D1 database).
3. Connect custom domain `budof.com` in **Worker Settings** ➔ **Domains & Routes**.

### Option 2: Cloudflare Pages
1. In Cloudflare Dashboard, go to **Workers & Pages** ➔ **Pages** ➔ **Connect to Git**.
2. Select repository `luckyycool/budof`.
3. Build Settings:
   - **Framework preset:** `None`
   - **Build command:** *(Leave empty)*
   - **Build output directory:** `.` (root directory)
4. Set custom domain `budof.com`.

---

## 🧪 Automated Testing

Run the automated TDD test suite verifying all financial formulas, DOM elements, multi-page static SEO integrity, and Cloudflare Worker asset bindings:

```bash
node test.js
```
