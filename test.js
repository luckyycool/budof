/**
 * Automated TDD Test Suite for Budof Engines
 * Runs pure Node.js assertions without third-party test runners.
 */

import assert from 'node:assert';
import { formatCurrency, formatCompactCurrency, formatPercent, formatMonths } from './js/utils/formatters.js';
import { calculateRunway, TAX_BENEFITS_MULTIPLIER } from './js/engine/runway-simulator.js';
import { calculateUnitEconomics } from './js/engine/unit-economics.js';
import { calculatePricingTiers } from './js/engine/pricing-calculator.js';
import { TycoonGame } from './js/engine/tycoon-game.js';
import { STARTUP_EVENTS } from './js/engine/tycoon-events.js';

import fs from 'node:fs';

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

  // Gross burn = 8050 + 2000 = 10050. Net burn = 10050 - 5000 = 5050/mo.
  // Starting cash 50000 / 5050 = ~9.9 months
  assert.strictEqual(result.isDefaultAlive, false);
  assert.ok(result.runwayMonths >= 9.8 && result.runwayMonths <= 10.0, `Expected ~9.9 months, got ${result.runwayMonths}`);
  assert.strictEqual(result.zeroCashMonth, 10);
});

test('Runway Simulator: Accurately flags "Default Alive" when revenue outpaces burn', () => {
  const result = calculateRunway({
    startingCash: 200000,
    currentMRR: 8000,
    monthlyGrowthRate: 0.15, // 15% monthly growth
    monthlyOpEx: 3000,
    headcount: [
      { id: '1', role: 'Engineer', monthlySalary: 6000, startMonth: 1 } // 6900
    ]
  });

  // Initial gross burn = 6900 + 3000 = 9900.
  // With 15% growth, revenue will cross 9900 within 2-3 months while cash is still ~$195k+
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

  // Payroll = 10000 * 1.15 = 11500
  assert.strictEqual(result.monthlyProjections[0].payroll, 11500);
  assert.strictEqual(result.monthlyProjections[0].netBurn, 11500);
});

// 3. Unit Economics Engine Tests
test('Unit Economics: Computes LTV, LTV:CAC, and Payback accurately', () => {
  const result = calculateUnitEconomics({
    cac: 600,
    arpu: 100,
    grossMarginPct: 80, // 80%
    monthlyChurnPct: 2.5 // 2.5%
  });

  // Lifetime = 1 / 0.025 = 40 months
  // LTV = (100 * 0.8) / 0.025 = 80 / 0.025 = $3,200
  // LTV:CAC = 3200 / 600 = 5.33x
  // Payback = 600 / (100 * 0.8) = 600 / 80 = 7.5 months
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

  // Magic Number = 65000 / 50000 = 1.30
  // Rule of 40 = 45 + 5 = 50%
  assert.strictEqual(result.magicNumber, 1.3);
  assert.strictEqual(result.ruleOf40Score, 50);
  assert.strictEqual(result.meetsRuleOf40, true);
});

test('Unit Economics: Safeguards against 0% churn divide-by-zero', () => {
  const result = calculateUnitEconomics({
    cac: 500,
    arpu: 50,
    grossMarginPct: 80,
    monthlyChurnPct: 0 // Boundary condition
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
    annualDiscountPct: 20, // 20% off
    annualAdoptionPct: 30  // 30% choose annual
  });

  // Blended monthly ARPU = (0.6*30) + (0.3*80) + (0.1*300) = 18 + 24 + 30 = 72
  assert.strictEqual(result.blendedMonthlyARPU, 72);
  assert.ok(result.mrr > 0);
  assert.ok(result.upfrontAnnualCash > 0);
  assert.strictEqual(result.tiers.length, 3);
});

// 5. Tycoon State Machine Tests
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

  // Cannot fire last founder
  game.fire('founders');
  assert.strictEqual(game.team.founders, 1);
  const fired = game.fire('founders');
  assert.strictEqual(fired, false);
  assert.strictEqual(game.team.founders, 1);
});

test('Tycoon Engine: Advance turns and simulate cash depletion', () => {
  const game = new TycoonGame({ startingCash: 5000, startingMRR: 100 });
  // Spend heavy marketing to force cash depletion
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
  // Try pitching with only $1k MRR (should fail)
  const reject = game.pitchInvestors('angel');
  assert.strictEqual(reject.success, false);

  // Boost MRR to $3500 and pitch again
  game.mrr = 3500;
  game.productQuality = 60;
  const accept = game.pitchInvestors('angel');
  assert.strictEqual(accept.success, true);
  assert.strictEqual(accept.cashAdded, 150000);
  assert.strictEqual(game.equityDilutionPct, 8);
});

// 6. Startup Events Tests
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

// 7. Static Asset & SEO Integrity Tests
test('Static Assets: index.html has complete metadata & schema', () => {
  assert.ok(fs.existsSync('./index.html'), 'index.html must exist');
  const html = fs.readFileSync('./index.html', 'utf-8');
  assert.ok(html.includes('<title>Budof'), 'index.html must have Budof title');
  assert.ok(html.includes('https://budof.com/'), 'Canonical URL must point to budof.com');
  assert.ok(html.includes('schema.org'), 'Must include JSON-LD schema');
  assert.ok(html.includes('id="runway-canvas"'), 'Must include canvas element');
  assert.ok(html.includes('id="ad-top-slot"'), 'Must include ad-top-slot element');
});

test('Static Assets: Swiss Daylight styles.css integrity', () => {
  assert.ok(fs.existsSync('./styles.css'), 'styles.css must exist');
  const css = fs.readFileSync('./styles.css', 'utf-8');
  assert.ok(css.includes('--bg-canvas: #FBFBF9;'), 'Must define Swiss Alabaster #FBFBF9');
  assert.ok(css.includes('--emerald-primary: #059669;'), 'Must define Emerald primary #059669');
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
});

console.log(`\nAll ${passedTests} automated tests PASSED successfully!\n`);
