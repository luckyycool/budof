# 📐 Budof (`budof.com`) — Operational Finance & Startup Modeling Suite

**Budof** (Business Unit Dynamics & Operational Finance) is a 100% client-side, zero-subscription web application engineered for startup founders, finance operators, and venture builders.

It models 36-month dynamic runway, unit economics (CAC, LTV, Magic Number, Rule of 40), tiered pricing elasticity, and includes a turn-based 24-Month Startup Tycoon simulation game.

---

## 🌟 Key Features

1. **Dynamic Runway & 36-Month Burn Forecaster:**
   - Real-time sliders for starting cash, MRR, growth rate, and OpEx.
   - Dynamic hiring roadmap with +15% employer tax & benefits buffer.
   - Calculates exact zero-cash date or flags Paul Graham's "Default Alive" status.
   - Native 60-FPS HTML5 Retina Canvas line & area charts (<10KB, 0 external dependencies).

2. **SaaS Unit Economics Engine:**
   - Computes LTV, LTV:CAC ratio, CAC Payback Period (Months).
   - Magic Number (sales efficiency indicator) and Rule of 40 scoring.
   - Algorithmic diagnosis cards with color-coded alerts and actionable optimization advice.

3. **Tier Pricing & MRR Elasticity Forecaster:**
   - Models customer distribution across Starter, Pro, and Enterprise tiers.
   - Annual billing upfront cash collections vs recurring monthly revenue.
   - Churn reduction factor from annual lock-in.

4. **Startup Tycoon Simulation Game (24 Months):**
   - Turn-based simulation managing headcount (Engineers, Marketers, Sales Reps).
   - Monthly discretionary allocation (Marketing, R&D).
   - 20+ authentic startup events (outages, viral surges, enterprise deals, poach threats).
   - Angel, Seed, and Series A investor pitching simulator with realistic criteria.

5. **Monetization & Compliance Architecture:**
   - Zero Cumulative Layout Shift (CLS = 0) fixed-dimension ad containers for Google AdSense.
   - High-ticket B2B affiliate partner cards (Mercury, Gusto, Stripe Atlas).
   - `ads.txt` publisher verification (`pub-0897820292119776`).
   - 1-Click Executive PDF / Board Deck generator & CSV data exporter.

---

## 🚀 $0 Cloudflare Pages Deployment

Deploy directly to Cloudflare Pages with zero build step:
- **Build command:** *(Leave empty)*
- **Build output directory:** `.` (root directory)
- **Custom domain:** `budof.com`

---

## 🧪 Automated Testing

Run the automated TDD test suite verifying all financial formulas:

```bash
node test.js
```
