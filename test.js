/**
 * Automated TDD Test Suite for Budof Engines
 * Runs pure Node.js assertions without third-party test runners.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { formatCurrency, formatCompactCurrency, formatPercent, formatMonths } from './js/utils/formatters.js';
import { calculateRunway, TAX_BENEFITS_MULTIPLIER } from './js/engine/runway-simulator.js';
import { calculateUnitEconomics } from './js/engine/unit-economics.js';
import { calculatePricingTiers } from './js/engine/pricing-calculator.js';
import { calculateFundraisingTarget } from './js/engine/fundraising-calculator.js';
import { calculateEquityDilution } from './js/engine/dilution-calculator.js';
import { calculateHiringImpact } from './js/engine/hiring-impact-calculator.js';
import { INDUSTRY_PRESETS } from './js/engine/presets.js';
import { SAAS_BENCHMARKS, calculateSaaSValuation } from './js/engine/valuation.js';
import { FOUNDER_PERKS } from './js/engine/deals.js';
import { FOUNDER_FAQS, generateFAQSchema } from './js/engine/faqs.js';
import { SoundEngine } from './js/engine/audio.js';
import { TycoonGame } from './js/engine/tycoon-game.js';
import { STARTUP_EVENTS } from './js/engine/tycoon-events.js';

let passedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('\n--- Running Budof TDD Engine Test Suite ---\n');

// 1. Formatters Tests
test('Formatters: Currency and compact amounts', () => {
  assert.strictEqual(formatCurrency(1250000), '$1,250,000');
  assert.strictEqual(formatCurrency(-4500), '-$4,500');
  assert.strictEqual(formatCurrency(0), '$0');

  assert.strictEqual(formatCompactCurrency(1500000), '$1.5M');
  assert.strictEqual(formatCompactCurrency(250000), '$250K');
  assert.strictEqual(formatCompactCurrency(850), '$850');
  assert.strictEqual(formatPercent(12.5), '12.5%');
  assert.strictEqual(formatMonths(Infinity), 'Default Alive (∞)');
  assert.strictEqual(formatMonths(14.2), '14.2 months');
});

// 2. Runway Simulator Tests
test('Runway Simulator: Calculates zero-cash month when Net Burn > 0', () => {
  const result = calculateRunway({
    startingCash: 50000,
    currentMRR: 5000,
    monthlyGrowthRate: 0.0, // No growth
    monthlyOpEx: 2000,
    headcount: [
      { id: '1', role: 'Dev', monthlySalary: 7000, startMonth: 1 } // 7000 * 1.15 = 8050
    ]
  });

  assert.strictEqual(result.isDefaultAlive, false);
  assert.ok(result.runwayMonths >= 9.8 && result.runwayMonths <= 10.0, `Expected ~9.9 months, got ${result.runwayMonths}`);
  assert.strictEqual(result.zeroCashMonth, 10);
});

test('Runway Simulator: Accurately flags "Default Alive" when revenue outpaces burn', () => {
  const result = calculateRunway({
    startingCash: 200000,
    currentMRR: 8000,
    monthlyGrowthRate: 0.15,
    monthlyOpEx: 3000,
    headcount: [
      { id: '1', role: 'Engineer', monthlySalary: 6000, startMonth: 1 }
    ]
  });

  assert.strictEqual(result.isDefaultAlive, true);
  assert.strictEqual(result.zeroCashMonth, null);
  assert.ok(result.breakevenMonth <= 4, `Expected breakeven within 4 months, got ${result.breakevenMonth}`);
});

test('Runway Simulator: Applies 15% tax/benefit overhead correctly', () => {
  assert.strictEqual(TAX_BENEFITS_MULTIPLIER, 1.15);
  const result = calculateRunway({
    startingCash: 100000,
    currentMRR: 0,
    monthlyGrowthRate: 0,
    monthlyOpEx: 0,
    headcount: [
      { id: '1', role: 'Engineer', monthlySalary: 10000, startMonth: 1 }
    ]
  });

  assert.strictEqual(result.monthlyProjections[0].payroll, 11500);
  assert.strictEqual(result.monthlyProjections[0].netBurn, 11500);
});

// 3. Unit Economics Engine Tests
test('Unit Economics: Computes LTV, LTV:CAC, and Payback accurately', () => {
  const result = calculateUnitEconomics({
    cac: 600,
    arpu: 100,
    grossMarginPct: 80,
    monthlyChurnPct: 2.5
  });

  assert.strictEqual(result.customerLifetimeMonths, 40);
  assert.strictEqual(result.ltv, 3200);
  assert.strictEqual(result.ltvCacRatio, 5.33);
  assert.strictEqual(result.paybackMonths, 7.5);
  assert.strictEqual(result.ltvStatus, 'optimal');
  assert.strictEqual(result.paybackStatus, 'optimal');
});

test('Unit Economics: Handles Magic Number and Rule of 40', () => {
  const result = calculateUnitEconomics({
    cac: 500,
    arpu: 80,
    grossMarginPct: 75,
    monthlyChurnPct: 3.0,
    salesMarketingSpend: 50000,
    netNewARRQuarter: 65000,
    annualGrowthRatePct: 45,
    fcfMarginPct: 5
  });

  assert.strictEqual(result.magicNumber, 1.3);
  assert.strictEqual(result.ruleOf40Score, 50);
  assert.strictEqual(result.meetsRuleOf40, true);
});

test('Unit Economics: Safeguards against 0% churn divide-by-zero', () => {
  const result = calculateUnitEconomics({
    cac: 500,
    arpu: 50,
    grossMarginPct: 80,
    monthlyChurnPct: 0
  });

  assert.ok(!isNaN(result.ltv));
  assert.ok(!isNaN(result.customerLifetimeMonths));
  assert.ok(result.ltv > 0);
});

// 4. Pricing Calculator Tests
test('Pricing Calculator: Tier distribution and annual discounting', () => {
  const result = calculatePricingTiers({
    totalCustomers: 100,
    starterPrice: 30,
    starterShare: 60,
    proPrice: 80,
    proShare: 30,
    enterprisePrice: 300,
    enterpriseShare: 10,
    annualDiscountPct: 20,
    annualAdoptionPct: 30
  });

  assert.strictEqual(result.blendedMonthlyARPU, 72);
  assert.ok(result.mrr > 0);
  assert.ok(result.upfrontAnnualCash > 0);
  assert.strictEqual(result.tiers.length, 3);
});

// 5. Industry Presets Tests
test('Industry Presets: 5 verified production templates exist', () => {
  const presetKeys = Object.keys(INDUSTRY_PRESETS);
  assert.strictEqual(presetKeys.length, 5);
  for (const key of presetKeys) {
    const p = INDUSTRY_PRESETS[key];
    assert.ok(p.id, `Preset ${key} must have id`);
    assert.ok(p.name, `Preset ${key} must have name`);
    assert.ok(p.startingCash > 0, `Preset ${key} startingCash must be > 0`);
    assert.ok(p.currentMRR > 0, `Preset ${key} currentMRR must be > 0`);
    assert.ok(p.headcount.length > 0, `Preset ${key} headcount must have entries`);
    assert.ok(p.unitEconomics, `Preset ${key} unitEconomics must exist`);
  }
});

// 6. SaaS Benchmarks & Valuation Tests
test('SaaS Benchmarks: Verified industry percentiles', () => {
  assert.strictEqual(SAAS_BENCHMARKS.length, 6);
  for (const b of SAAS_BENCHMARKS) {
    assert.ok(b.metric);
    assert.ok(b.topQuartile);
    assert.ok(b.median);
    assert.ok(b.bottomQuartile);
  }

  const val = calculateSaaSValuation(1000000, 60, 45);
  assert.ok(val.valuationBear > 0);
  assert.ok(val.valuationBase > val.valuationBear);
  assert.ok(val.valuationBull > val.valuationBase);
});

// 7. Founder Calculators Tests
test('Founder Calculators: Fundraising target calculation', () => {
  const result = calculateFundraisingTarget({
    targetRunwayMonths: 18,
    netMonthlyBurn: 20000,
    safetyBufferPct: 20
  });

  // Baseline = 18 * 20000 = 360000. Buffer = 360000 * 0.2 = 72000. Total = 432000.
  assert.strictEqual(result.baselineCapitalNeeded, 360000);
  assert.strictEqual(result.safetyBufferAmount, 72000);
  assert.strictEqual(result.totalTargetToRaise, 432000);
  assert.strictEqual(result.roundTier, 'Late Angel / Pre-Seed');
  assert.ok(result.impliedPostMoney > result.totalTargetToRaise);
});

test('Founder Calculators: Cap table equity dilution', () => {
  const result = calculateEquityDilution({
    preMoneyValuation: 4000000,
    investmentAmount: 1000000,
    optionPoolPct: 10,
    founderCount: 2
  });

  // Post-Money = 5M. Investor = 1M / 5M = 20%.
  // Founder equity = (1 - 0.20) * (100 - 10) = 0.8 * 90 = 72.0%.
  assert.strictEqual(result.postMoney, 5000000);
  assert.strictEqual(result.investorOwnershipPct, 20);
  assert.strictEqual(result.founderEquityPct, 72);
  assert.strictEqual(result.equityPerFounder, 36);
  assert.strictEqual(result.valuePerOnePercent, 50000);
});

test('Founder Calculators: Hiring runway impact calculation', () => {
  const baseParams = {
    startingCash: 100000,
    currentMRR: 5000,
    monthlyGrowthRate: 0,
    monthlyOpEx: 2000,
    headcount: [{ id: '1', role: 'Dev', monthlySalary: 5000, startMonth: 1 }]
  };

  const result = calculateHiringImpact(baseParams, { monthlySalary: 6000 });
  // Fully loaded cost = 6000 * 1.15 = 6900
  assert.strictEqual(result.fullyLoadedMonthlyCost, 6900);
  assert.strictEqual(result.requiredMRRToBreakeven, 6900);
  assert.ok(result.runwayMonthsLost > 0, 'Runway months lost must be positive');
});

// 8. Founder Perks & FAQs Tests
test('Founder Perks & FAQs: Directory and Schema validation', () => {
  assert.strictEqual(FOUNDER_PERKS.length, 6);
  for (const p of FOUNDER_PERKS) {
    assert.ok(p.id);
    assert.ok(p.partner);
    assert.ok(p.url.startsWith('https://'));
    assert.ok(p.value);
  }

  assert.strictEqual(FOUNDER_FAQS.length, 6);
  const schema = generateFAQSchema();
  assert.strictEqual(schema['@type'], 'FAQPage');
  assert.strictEqual(schema.mainEntity.length, 6);
});

// 7. Procedural Sound Engine Tests
test('Sound Engine: Methods defined for UI & Tycoon audio feedback', () => {
  const sound = new SoundEngine();
  assert.strictEqual(typeof sound.toggleMute, 'function');
  assert.strictEqual(typeof sound.playTurnTick, 'function');
  assert.strictEqual(typeof sound.playCashRegister, 'function');
  assert.strictEqual(typeof sound.playCrisisChime, 'function');
  assert.strictEqual(typeof sound.playVictoryJingle, 'function');
});

// 8. Tycoon State Machine Tests
test('Tycoon Engine: Initializes with valid initial values', () => {
  const game = new TycoonGame();
  assert.strictEqual(game.month, 1);
  assert.strictEqual(game.status, 'active');
  assert.strictEqual(game.team.founders, 2);
  assert.strictEqual(game.team.engineers, 1);
  assert.ok(game.cash > 0);
  assert.ok(game.mrr > 0);
});

test('Tycoon Engine: Hire and Fire team members', () => {
  const game = new TycoonGame();
  const initialEngineers = game.team.engineers;
  game.hire('engineers');
  assert.strictEqual(game.team.engineers, initialEngineers + 1);

  game.fire('engineers');
  assert.strictEqual(game.team.engineers, initialEngineers);

  game.fire('founders');
  assert.strictEqual(game.team.founders, 1);
  const fired = game.fire('founders');
  assert.strictEqual(fired, false);
  assert.strictEqual(game.team.founders, 1);
});

test('Tycoon Engine: Advance turns and simulate cash depletion', () => {
  const game = new TycoonGame({ startingCash: 5000, startingMRR: 100 });
  game.setBudget('marketing', 10000);

  let turns = 0;
  while (game.status === 'active' && turns < 24) {
    game.advanceTurn();
    turns++;
  }

  assert.strictEqual(game.status, 'bankrupt');
  assert.strictEqual(game.cash, 0);
});

test('Tycoon Engine: Angel round criteria and dilution', () => {
  const game = new TycoonGame({ startingCash: 50000, startingMRR: 1000 });
  const reject = game.pitchInvestors('angel');
  assert.strictEqual(reject.success, false);

  game.mrr = 3500;
  game.productQuality = 60;
  const accept = game.pitchInvestors('angel');
  assert.strictEqual(accept.success, true);
  assert.strictEqual(accept.cashAdded, 150000);
  assert.strictEqual(game.equityDilutionPct, 8);
});

// 9. Startup Events Tests
test('Startup Events Library: Valid configuration and options', () => {
  assert.ok(STARTUP_EVENTS.length >= 10, 'Must have at least 10 startup events');
  for (const evt of STARTUP_EVENTS) {
    assert.ok(evt.id, 'Event must have ID');
    assert.ok(evt.title, 'Event must have Title');
    assert.strictEqual(evt.choices.length, 2, 'Event must have 2 balanced choices');
    assert.strictEqual(typeof evt.choices[0].apply, 'function');
    assert.strictEqual(typeof evt.choices[1].apply, 'function');
  }
});

// 10. Static Asset & Bundle Integrity Tests
test('DOM IDs: All getElementById references in bundle.js exist in index.html', () => {
  const html = fs.readFileSync('./index.html', 'utf-8');
  const bundle = fs.readFileSync('./bundle.js', 'utf-8');

  const idMatches = bundle.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g);
  const usedIds = new Set();
  for (const m of idMatches) {
    usedIds.add(m[1]);
  }

  const missingIds = [];
  for (const id of usedIds) {
    if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
      missingIds.push(id);
    }
  }

  assert.strictEqual(missingIds.length, 0, `Missing DOM IDs in index.html: ${missingIds.join(', ')}`);
});

test('Static Assets: index.html has complete metadata, presets, schema & bundle reference', () => {
  assert.ok(fs.existsSync('./index.html'), 'index.html must exist');
  const html = fs.readFileSync('./index.html', 'utf-8');
  assert.ok(html.includes('<title>Budof'), 'index.html must have Budof title');
  assert.ok(html.includes('https://budof.com/'), 'Canonical URL must point to budof.com');
  assert.ok(html.includes('schema.org'), 'Must include JSON-LD schema');
  assert.ok(html.includes('id="runway-canvas"'), 'Must include canvas element');
  assert.ok(html.includes('id="presets-pills-bar"'), 'Must include presets pills element');
  assert.ok(html.includes('src="bundle.js"'), 'Must link to self-contained bundle.js for file:/// support');
  assert.ok(html.includes('ca-pub-0897820292119776'), 'Must include AdSense verification script');
});

test('Static Assets: Compiled bundle.js exists and is valid', () => {
  assert.ok(fs.existsSync('./bundle.js'), 'bundle.js must exist');
  const bundle = fs.readFileSync('./bundle.js', 'utf-8');
  assert.ok(bundle.includes('Budof Standalone Production Bundle'), 'Must be compiled standalone bundle');
  assert.ok(bundle.length > 50000, 'Bundle must contain all engines');
});

test('Static Assets: Swiss Daylight styles.css integrity', () => {
  assert.ok(fs.existsSync('./styles.css'), 'styles.css must exist');
  const css = fs.readFileSync('./styles.css', 'utf-8');
  assert.ok(css.includes('--bg-canvas: #FBFBF9;'), 'Must define Swiss Alabaster #FBFBF9');
  assert.ok(css.includes('--emerald-primary: #059669;'), 'Must define Emerald primary #059669');
  assert.ok(css.includes('.presets-bar-wrapper'), 'Must include presets styling');
  assert.ok(css.includes('@media print'), 'Must provide executive print stylesheet');
});

test('Static Assets: SEO & Cloudflare deployment files', () => {
  assert.ok(fs.existsSync('./ads.txt'), 'ads.txt must exist');
  const ads = fs.readFileSync('./ads.txt', 'utf-8');
  assert.ok(ads.includes('pub-0897820292119776'), 'ads.txt must contain publisher ID');

  assert.ok(fs.existsSync('./robots.txt'), 'robots.txt must exist');
  assert.ok(fs.existsSync('./sitemap.xml'), 'sitemap.xml must exist');
  assert.ok(fs.existsSync('./_headers'), '_headers must exist');
  assert.ok(fs.existsSync('./favicon.svg'), 'favicon.svg must exist');
  assert.ok(fs.existsSync('./og-image.png'), 'og-image.png must exist');
  assert.ok(fs.existsSync('./og-banner.svg'), 'og-banner.svg must exist');
  assert.ok(fs.statSync('./og-image.png').size > 10000, 'og-image.png must be non-empty image');
  assert.ok(fs.statSync('./og-banner.svg').size > 1000, 'og-banner.svg must be non-empty SVG');
});

// 11. Multi-Page Static SEO Architecture Tests
test('Multi-Page Architecture: All 6 dedicated tool subdirectories and index.html exist', () => {
  const tools = [
    'runway-calculator',
    'saas-unit-economics',
    'fundraising-calculator',
    'saas-valuation',
    'startup-tycoon',
    'deals-perks'
  ];

  for (const tool of tools) {
    const dirPath = `./${tool}`;
    const filePath = `./${tool}/index.html`;
    assert.ok(fs.existsSync(dirPath), `Directory ${dirPath} must exist`);
    assert.ok(fs.existsSync(filePath), `File ${filePath} must exist`);
  }
});

test('Multi-Page SEO: Dedicated titles, canonical URLs, relative assets & schema validation', () => {
  const pageSpecs = [
    {
      path: './runway-calculator/index.html',
      title: 'Startup Runway Calculator & 36-Month Burn Forecaster | Budof',
      canonical: 'https://budof.com/runway-calculator/',
      schemaCheck: 'WebApplication'
    },
    {
      path: './saas-unit-economics/index.html',
      title: 'SaaS CAC, LTV & Payback Period Calculator | Budof',
      canonical: 'https://budof.com/saas-unit-economics/',
      schemaCheck: 'WebApplication'
    },
    {
      path: './fundraising-calculator/index.html',
      title: 'Startup Fundraising Target & Runway Extension Calculator | Budof',
      canonical: 'https://budof.com/fundraising-calculator/',
      schemaCheck: 'WebApplication'
    },
    {
      path: './saas-valuation/index.html',
      title: 'SaaS ARR Valuation Multiple Estimator & Industry Benchmarks | Budof',
      canonical: 'https://budof.com/saas-valuation/',
      schemaCheck: 'WebApplication'
    },
    {
      path: './startup-tycoon/index.html',
      title: 'Startup Tycoon Game Online — 24-Month Business Simulator | Budof',
      canonical: 'https://budof.com/startup-tycoon/',
      schemaCheck: 'VideoGame'
    },
    {
      path: './deals-perks/index.html',
      title: 'Startup Deals, Cloud Credits & Founder Banking Perks | Budof',
      canonical: 'https://budof.com/deals-perks/',
      schemaCheck: 'WebApplication'
    }
  ];

  for (const spec of pageSpecs) {
    const html = fs.readFileSync(spec.path, 'utf-8');
    assert.ok(
      html.includes(`<title>${spec.title}</title>`) || html.includes(`<title>${spec.title.replace(/&/g, '&amp;')}</title>`),
      `${spec.path} must have exact dedicated title: ${spec.title}`
    );
    assert.ok(html.includes(`<link rel="canonical" href="${spec.canonical}">`), `${spec.path} must have canonical URL ${spec.canonical}`);
    assert.ok(html.includes('href="../styles.css"'), `${spec.path} must link to relative ../styles.css for file:/// and Cloudflare support`);
    assert.ok(html.includes('src="../bundle.js"'), `${spec.path} must link to relative ../bundle.js for file:/// and Cloudflare support`);
    assert.ok(html.includes(spec.schemaCheck), `${spec.path} must include ${spec.schemaCheck} schema`);
    assert.ok(html.includes('https://budof.com/og-image.png'), `${spec.path} must include OpenGraph social preview image`);
  }
});

test('Multi-Page Hub: Master index.html links cleanly to all 6 specialized tools', () => {
  const html = fs.readFileSync('./index.html', 'utf-8');
  assert.ok(html.includes('href="runway-calculator/"'), 'Hub must link to runway-calculator/');
  assert.ok(html.includes('href="saas-unit-economics/"'), 'Hub must link to saas-unit-economics/');
  assert.ok(html.includes('href="fundraising-calculator/"'), 'Hub must link to fundraising-calculator/');
  assert.ok(html.includes('href="saas-valuation/"'), 'Hub must link to saas-valuation/');
  assert.ok(html.includes('href="startup-tycoon/"'), 'Hub must link to startup-tycoon/');
  assert.ok(html.includes('href="deals-perks/"'), 'Hub must link to deals-perks/');
  assert.ok(html.includes('https://budof.com/og-image.png'), 'Hub must reference og-image.png');
});

test('Sitemap Integrity: sitemap.xml contains all 7 canonical URLs with proper priority scores', () => {
  const sitemap = fs.readFileSync('./sitemap.xml', 'utf-8');
  const expectedUrls = [
    { url: 'https://budof.com/', priority: '1.0' },
    { url: 'https://budof.com/runway-calculator/', priority: '0.9' },
    { url: 'https://budof.com/saas-unit-economics/', priority: '0.9' },
    { url: 'https://budof.com/fundraising-calculator/', priority: '0.9' },
    { url: 'https://budof.com/saas-valuation/', priority: '0.9' },
    { url: 'https://budof.com/startup-tycoon/', priority: '0.9' },
    { url: 'https://budof.com/deals-perks/', priority: '0.9' }
  ];

  for (const item of expectedUrls) {
    assert.ok(sitemap.includes(`<loc>${item.url}</loc>`), `sitemap.xml must contain ${item.url}`);
    assert.ok(sitemap.includes(`<priority>${item.priority}</priority>`), `sitemap.xml must have priority ${item.priority} for ${item.url}`);
  }
});

test('Cloudflare Workers & Static Assets: wrangler.jsonc configuration integrity', () => {
  assert.ok(fs.existsSync('./wrangler.jsonc'), 'wrangler.jsonc must exist in repository root');
  const content = fs.readFileSync('./wrangler.jsonc', 'utf-8');
  const config = JSON.parse(content);
  assert.strictEqual(config.name, 'budof', 'Worker name must be budof');
  assert.strictEqual(config.main, 'worker.js', 'Worker entry point must be worker.js');
  assert.ok(config.assets, 'assets configuration must be defined');
  assert.strictEqual(config.assets.directory, '.', 'assets directory must be root (.)');
  assert.strictEqual(config.assets.binding, 'ASSETS', 'assets binding must be ASSETS');
  assert.strictEqual(config.assets.run_worker_first, false, 'run_worker_first must be FALSE for unlimited free edge static delivery');
});

test('Cloudflare Workers Entry Point: worker.js syntax and exports', async () => {
  assert.ok(fs.existsSync('./worker.js'), 'worker.js must exist in repository root');
  const workerModule = await import('./worker.js');
  assert.ok(workerModule.default, 'worker.js must export default object');
  assert.strictEqual(typeof workerModule.default.fetch, 'function', 'worker.js must export fetch function');

  // Test ads.txt handler
  const mockAdsRequest = new Request('https://budof.com/ads.txt');
  const adsResponse = await workerModule.default.fetch(mockAdsRequest, {}, {});
  assert.strictEqual(adsResponse.status, 200);
  const adsText = await adsResponse.text();
  assert.ok(adsText.includes('pub-0897820292119776'), 'ads.txt must deliver publisher ID directly');

  // Test API health route
  const mockApiRequest = new Request('https://budof.com/api/health');
  const apiResponse = await workerModule.default.fetch(mockApiRequest, {}, {});
  assert.strictEqual(apiResponse.status, 200);
  const apiJson = await apiResponse.json();
  assert.strictEqual(apiJson.status, 'healthy');
  assert.strictEqual(apiJson.service, 'budof-engine');
});

console.log(`\nAll ${passedTests} automated tests PASSED successfully!\n`);
