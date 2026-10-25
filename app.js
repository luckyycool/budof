/**
 * Budof — Master SPA Application Controller
 * High-performance, reactive financial simulation suite.
 */

import { formatCurrency, formatCompactCurrency, formatPercent, formatMonths, formatNumber } from './js/utils/formatters.js';
import { calculateRunway } from './js/engine/runway-simulator.js';
import { calculateUnitEconomics } from './js/engine/unit-economics.js';
import { calculatePricingTiers } from './js/engine/pricing-calculator.js';
import { INDUSTRY_PRESETS } from './js/engine/presets.js';
import { SAAS_BENCHMARKS, calculateSaaSValuation } from './js/engine/valuation.js';
import { SoundEngine } from './js/engine/audio.js';
import { TycoonGame } from './js/engine/tycoon-game.js';
import { FinancialChartRenderer } from './js/engine/chart-renderer.js';
import { exportRunwayToCSV, printExecutiveReport } from './js/utils/exporter.js';

// --- State Variables ---
let chartRenderer = null;
let currentRunwayResult = null;
let activePresetKey = 'bootstrapped_profitable';

const soundEngine = new SoundEngine();
const tycoon = new TycoonGame();

let headcountData = JSON.parse(JSON.stringify(INDUSTRY_PRESETS.bootstrapped_profitable.headcount));

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupPresets();
  setupRunwaySimulator();
  setupUnitEconomics();
  setupPricingCalculator();
  setupBenchmarksAndValuation();
  setupTycoonSimulator();
  setupExportAndLegal();
  handleUrlHash();
});

// --- Tab Navigation & Hash Routing ---
function switchTab(targetId) {
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === targetId);
  });
  panels.forEach(p => {
    p.classList.toggle('active', p.id === targetId);
  });

  if (targetId === 'tab-runway' && chartRenderer) {
    setTimeout(() => chartRenderer.render(), 50);
  }

  // Update URL hash cleanly without page reload
  try {
    const cleanHash = targetId.replace('tab-', '');
    if (window.location.hash.slice(1) !== cleanHash) {
      history.replaceState(null, null, `#${cleanHash}`);
    }
  } catch {}
}

function handleUrlHash() {
  const hash = (window.location.hash || '').replace('#', '');
  if (!hash) return;
  const targetId = `tab-${hash}`;
  if (document.getElementById(targetId)) {
    switchTab(targetId);
  }
}

function setupNavigation() {
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const footerTabLinks = document.querySelectorAll('.footer-tab-link');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  footerTabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  window.addEventListener('hashchange', handleUrlHash);
}

// --- MODULE: INDUSTRY PRESETS (1-Click Real-World Models) ---
function setupPresets() {
  const presetContainer = document.getElementById('presets-pills-bar');
  if (!presetContainer) return;

  presetContainer.innerHTML = '';
  Object.keys(INDUSTRY_PRESETS).forEach(key => {
    const p = INDUSTRY_PRESETS[key];
    const btn = document.createElement('button');
    btn.className = `preset-pill ${key === activePresetKey ? 'active' : ''}`;
    btn.innerHTML = `<span class="preset-icon">${p.icon}</span> <strong>${p.name}</strong>`;
    btn.title = p.tagline;

    btn.addEventListener('click', () => {
      activePresetKey = key;
      document.querySelectorAll('.preset-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyPreset(key);
    });

    presetContainer.appendChild(btn);
  });
}

function applyPreset(key) {
  const preset = INDUSTRY_PRESETS[key];
  if (!preset) return;

  // 1. Runway parameters
  const sliderCash = document.getElementById('input-starting-cash');
  const sliderMRR = document.getElementById('input-current-mrr');
  const sliderGrowth = document.getElementById('input-growth-rate');
  const sliderOpEx = document.getElementById('input-monthly-opex');

  if (sliderCash) sliderCash.value = preset.startingCash;
  if (sliderMRR) sliderMRR.value = preset.currentMRR;
  if (sliderGrowth) sliderGrowth.value = (preset.monthlyGrowthRate * 100).toFixed(1);
  if (sliderOpEx) sliderOpEx.value = preset.monthlyOpEx;

  // Headcount
  headcountData = JSON.parse(JSON.stringify(preset.headcount));
  renderHeadcountUI(triggerRunwayUpdate);
  triggerRunwayUpdate();

  // 2. Unit Economics parameters
  const ue = preset.unitEconomics;
  if (ue) {
    const sliderCAC = document.getElementById('input-cac');
    const sliderARPU = document.getElementById('input-arpu');
    const sliderGM = document.getElementById('input-gross-margin');
    const sliderChurn = document.getElementById('input-churn-rate');
    const inputSMSpend = document.getElementById('input-sm-spend');
    const inputNetARR = document.getElementById('input-net-arr');
    const inputGrowth = document.getElementById('input-annual-growth');
    const inputFCF = document.getElementById('input-fcf-margin');

    if (sliderCAC) sliderCAC.value = ue.cac;
    if (sliderARPU) sliderARPU.value = ue.arpu;
    if (sliderGM) sliderGM.value = ue.grossMarginPct;
    if (sliderChurn) sliderChurn.value = ue.monthlyChurnPct;
    if (inputSMSpend) inputSMSpend.value = ue.smSpend;
    if (inputNetARR) inputNetARR.value = ue.netARR;
    if (inputGrowth) inputGrowth.value = ue.annualGrowth;
    if (inputFCF) inputFCF.value = ue.fcfMargin;

    triggerUnitEconomicsUpdate();
  }

  // Preset announcement banner
  const banner = document.getElementById('preset-status-banner');
  if (banner) {
    banner.innerHTML = `Loaded Verified Financial Template: <strong>${preset.name}</strong> (${preset.tagline})`;
  }
}

let triggerRunwayUpdate = () => {};
let triggerUnitEconomicsUpdate = () => {};

// --- MODULE 1: RUNWAY SIMULATOR ---
function setupRunwaySimulator() {
  const canvas = document.getElementById('runway-canvas');
  if (canvas) {
    chartRenderer = new FinancialChartRenderer(canvas);
  }

  const sliderCash = document.getElementById('input-starting-cash');
  const sliderMRR = document.getElementById('input-current-mrr');
  const sliderGrowth = document.getElementById('input-growth-rate');
  const sliderOpEx = document.getElementById('input-monthly-opex');

  const displayCash = document.getElementById('display-starting-cash');
  const displayMRR = document.getElementById('display-current-mrr');
  const displayGrowth = document.getElementById('display-growth-rate');
  const displayOpEx = document.getElementById('display-monthly-opex');

  function update() {
    const startingCash = Number(sliderCash.value);
    const currentMRR = Number(sliderMRR.value);
    const monthlyGrowth = Number(sliderGrowth.value) / 100;
    const monthlyOpEx = Number(sliderOpEx.value);

    displayCash.textContent = formatCurrency(startingCash);
    displayMRR.textContent = formatCurrency(currentMRR);
    displayGrowth.textContent = formatPercent(Number(sliderGrowth.value), 1);
    displayOpEx.textContent = formatCurrency(monthlyOpEx);

    currentRunwayResult = calculateRunway({
      startingCash,
      currentMRR,
      monthlyGrowthRate: monthlyGrowth,
      monthlyOpEx,
      headcount: headcountData,
      horizonMonths: 36
    });

    // Update KPIs
    const kpiRunway = document.getElementById('kpi-runway-months');
    const kpiRunwaySub = document.getElementById('kpi-runway-subtext');
    const kpiNetBurn = document.getElementById('kpi-net-burn');
    const kpiBreakeven = document.getElementById('kpi-breakeven-status');
    const kpiDefaultAlive = document.getElementById('kpi-default-alive');

    kpiRunway.textContent = formatMonths(currentRunwayResult.runwayMonths);
    if (currentRunwayResult.isDefaultAlive) {
      kpiRunway.className = 'kpi-value green mono';
      kpiRunwaySub.textContent = 'Infinite Runway (Profitable before zero)';
      kpiDefaultAlive.textContent = 'Default Alive';
      kpiDefaultAlive.className = 'kpi-value green mono';
    } else {
      kpiRunway.className = currentRunwayResult.runwayMonths <= 6 ? 'kpi-value crimson mono' : 'kpi-value mono';
      kpiRunwaySub.textContent = currentRunwayResult.zeroCashMonth ? `Zero Cash at Month ${currentRunwayResult.zeroCashMonth}` : 'Depletes within horizon';
      kpiDefaultAlive.textContent = 'Default Dead';
      kpiDefaultAlive.className = 'kpi-value crimson mono';
    }

    kpiNetBurn.textContent = formatCurrency(currentRunwayResult.initialNetBurn);
    kpiNetBurn.className = currentRunwayResult.initialNetBurn <= 0 ? 'kpi-value green mono' : 'kpi-value crimson mono';

    if (currentRunwayResult.breakevenMonth) {
      kpiBreakeven.textContent = `Month ${currentRunwayResult.breakevenMonth}`;
      kpiBreakeven.className = 'kpi-value green mono';
    } else {
      kpiBreakeven.textContent = 'Beyond M36';
      kpiBreakeven.className = 'kpi-value mono';
    }

    // Chart update
    if (chartRenderer) {
      chartRenderer.setData(currentRunwayResult.monthlyProjections);
    }

    // Populate Data Table
    renderRunwayTable(currentRunwayResult.monthlyProjections);
  }

  triggerRunwayUpdate = update;
  [sliderCash, sliderMRR, sliderGrowth, sliderOpEx].forEach(s => s && s.addEventListener('input', update));

  // Headcount list UI
  renderHeadcountUI(update);

  const btnAddHire = document.getElementById('btn-add-hire');
  const inputRole = document.getElementById('new-hire-role');
  const inputSalary = document.getElementById('new-hire-salary');

  if (btnAddHire) {
    btnAddHire.addEventListener('click', () => {
      const role = (inputRole.value || '').trim() || 'Software Engineer';
      const salary = Number(inputSalary.value) || 5000;
      headcountData.push({
        id: Date.now().toString(),
        role,
        monthlySalary: salary,
        startMonth: 1
      });
      inputRole.value = '';
      renderHeadcountUI(update);
      update();
    });
  }

  update();
}

function renderHeadcountUI(onUpdateCallback) {
  const container = document.getElementById('headcount-list');
  if (!container) return;

  container.innerHTML = '';
  headcountData.forEach((member, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px dashed #E2E8F0; font-size:12px;';
    row.innerHTML = `
      <div>
        <strong>${member.role}</strong>
        <span style="color:#64748B; margin-left:4px;">${formatCurrency(member.monthlySalary)}/mo (M${member.startMonth}+)</span>
      </div>
      <button class="btn-remove" data-id="${member.id}" title="Remove role">✕</button>
    `;

    row.querySelector('.btn-remove').addEventListener('click', () => {
      headcountData.splice(idx, 1);
      renderHeadcountUI(onUpdateCallback);
      onUpdateCallback();
    });

    container.appendChild(row);
  });
}

function renderRunwayTable(projections) {
  const tbody = document.getElementById('projection-table-body');
  if (!tbody || !projections) return;

  tbody.innerHTML = '';
  projections.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">Month ${p.month}</td>
      <td class="mono" style="color:#10B981;">${formatCurrency(p.revenue)}</td>
      <td class="mono">${formatCurrency(p.payroll)}</td>
      <td class="mono">${formatCurrency(p.opex)}</td>
      <td class="mono">${formatCurrency(p.grossBurn)}</td>
      <td class="mono" style="color:${p.netBurn <= 0 ? '#059669' : '#DC2626'};">${formatCurrency(p.netBurn)}</td>
      <td class="mono" style="font-weight:700; color:${p.endingCash <= 0 ? '#DC2626' : '#0F172A'};">${formatCurrency(p.endingCash)}</td>
      <td>
        <span style="font-size:11px; padding:2px 6px; border-radius:4px; font-weight:600; background:${p.isBankrupt ? '#FEF2F2; color:#DC2626;' : p.isProfitable ? '#ECFDF5; color:#047857;' : '#F1F5F9; color:#475569;'}">
          ${p.isBankrupt ? 'Bankrupt' : p.isProfitable ? 'Profitable' : 'Burning Cash'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- MODULE 2: SAAS UNIT ECONOMICS ---
function setupUnitEconomics() {
  const sliderCAC = document.getElementById('input-cac');
  const sliderARPU = document.getElementById('input-arpu');
  const sliderGM = document.getElementById('input-gross-margin');
  const sliderChurn = document.getElementById('input-churn-rate');

  const inputSMSpend = document.getElementById('input-sm-spend');
  const inputNetARR = document.getElementById('input-net-arr');
  const inputGrowth = document.getElementById('input-annual-growth');
  const inputFCF = document.getElementById('input-fcf-margin');

  const displayCAC = document.getElementById('display-cac');
  const displayARPU = document.getElementById('display-arpu');
  const displayGM = document.getElementById('display-gross-margin');
  const displayChurn = document.getElementById('display-churn-rate');

  function update() {
    const cac = Number(sliderCAC.value);
    const arpu = Number(sliderARPU.value);
    const gm = Number(sliderGM.value);
    const churn = Number(sliderChurn.value);

    displayCAC.textContent = formatCurrency(cac);
    displayARPU.textContent = formatCurrency(arpu);
    displayGM.textContent = `${gm}%`;
    displayChurn.textContent = `${churn.toFixed(1)}%`;

    const result = calculateUnitEconomics({
      cac,
      arpu,
      grossMarginPct: gm,
      monthlyChurnPct: churn,
      salesMarketingSpend: Number(inputSMSpend.value),
      netNewARRQuarter: Number(inputNetARR.value),
      annualGrowthRatePct: Number(inputGrowth.value),
      fcfMarginPct: Number(inputFCF.value)
    });

    // Update KPI UI
    const kpiLTVCAC = document.getElementById('kpi-ltv-cac');
    const kpiPayback = document.getElementById('kpi-payback-months');
    const kpiLTV = document.getElementById('kpi-ltv-val');
    const kpiLifeSub = document.getElementById('kpi-lifetime-subtext');
    const kpiMagic = document.getElementById('kpi-magic-number');
    const kpiRule40 = document.getElementById('kpi-rule-of-40');
    const kpiRuleSub = document.getElementById('kpi-rule-subtext');

    kpiLTVCAC.textContent = `${result.ltvCacRatio}x`;
    kpiLTVCAC.className = result.ltvCacRatio >= 3.0 ? 'kpi-value green mono' : result.ltvCacRatio >= 1.5 ? 'kpi-value mono' : 'kpi-value crimson mono';

    kpiPayback.textContent = `${result.paybackMonths} mos`;
    kpiPayback.className = result.paybackMonths <= 12 ? 'kpi-value green mono' : result.paybackMonths <= 18 ? 'kpi-value mono' : 'kpi-value crimson mono';

    kpiLTV.textContent = formatCurrency(result.ltv);
    kpiLifeSub.textContent = `Avg ${result.customerLifetimeMonths} months lifespan`;

    kpiMagic.textContent = result.magicNumber !== null ? `${result.magicNumber}` : 'N/A';
    kpiMagic.className = result.magicNumber >= 1.0 ? 'kpi-value green mono' : 'kpi-value mono';

    kpiRule40.textContent = `${result.ruleOf40Score}%`;
    kpiRule40.className = result.meetsRuleOf40 ? 'kpi-value green mono' : 'kpi-value mono';
    kpiRuleSub.textContent = result.meetsRuleOf40 ? 'Elite Venture Benchmark Met (>=40%)' : 'Below Rule of 40 Benchmark (<40%)';

    // Render Diagnosis Cards
    const diagList = document.getElementById('unit-diagnosis-list');
    diagList.innerHTML = '';
    result.diagnosis.forEach(d => {
      const card = document.createElement('div');
      const isOk = d.status === 'success';
      const isWarn = d.status === 'warning' || d.status === 'info';
      card.style.cssText = `padding: 12px 14px; border-radius: 6px; font-size: 13px; border: 1px solid ${isOk ? '#A7F3D0' : isWarn ? '#FDE68A' : '#FECACA'}; background: ${isOk ? '#ECFDF5' : isWarn ? '#FFFBEB' : '#FEF2F2'}; color: #0F172A;`;
      card.innerHTML = `<strong>${d.metric}:</strong> ${d.text}`;
      diagList.appendChild(card);
    });
  }

  triggerUnitEconomicsUpdate = update;
  [sliderCAC, sliderARPU, sliderGM, sliderChurn, inputSMSpend, inputNetARR, inputGrowth, inputFCF].forEach(elem => {
    if (elem) elem.addEventListener('input', update);
  });

  update();
}

// --- MODULE 3: TIER PRICING & MRR ELASTICITY ---
function setupPricingCalculator() {
  const inputCust = document.getElementById('pricing-total-customers');
  const inputStarter = document.getElementById('pricing-starter-price');
  const inputPro = document.getElementById('pricing-pro-price');
  const inputEnterprise = document.getElementById('pricing-enterprise-price');

  const sliderDiscount = document.getElementById('pricing-annual-discount');
  const sliderAdoption = document.getElementById('pricing-annual-adoption');

  const displayDiscount = document.getElementById('display-annual-discount');
  const displayAdoption = document.getElementById('display-annual-adoption');

  function update() {
    const totalCustomers = Number(inputCust.value);
    const starterPrice = Number(inputStarter.value);
    const proPrice = Number(inputPro.value);
    const enterprisePrice = Number(inputEnterprise.value);

    const discount = Number(sliderDiscount.value);
    const adoption = Number(sliderAdoption.value);

    displayDiscount.textContent = `${discount}%`;
    displayAdoption.textContent = `${adoption}%`;

    const result = calculatePricingTiers({
      totalCustomers,
      starterPrice,
      proPrice,
      enterprisePrice,
      annualDiscountPct: discount,
      annualAdoptionPct: adoption
    });

    document.getElementById('pricing-blended-arpu').textContent = `$${result.blendedEffectiveARPU}`;
    document.getElementById('pricing-mrr').textContent = formatCurrency(result.mrr);
    document.getElementById('pricing-arr').textContent = `${formatCurrency(result.arr)} ARR`;
    document.getElementById('pricing-upfront-cash').textContent = formatCurrency(result.upfrontAnnualCash);
    document.getElementById('pricing-churn-reduction').textContent = `-${result.estimatedChurnReductionPct}%`;

    // Tier Cards
    const breakdownContainer = document.getElementById('pricing-tiers-breakdown');
    breakdownContainer.innerHTML = '';
    result.tiers.forEach(t => {
      const col = document.createElement('div');
      col.style.cssText = 'padding: 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-card);';
      col.innerHTML = `
        <h4 style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${t.name}</h4>
        <div style="font-size: 20px; font-weight: 800; color: var(--emerald-primary); margin: 4px 0;" class="mono">${formatCurrency(t.price)}/mo</div>
        <p style="font-size: 12px; color: var(--text-muted);">${t.customers} accounts (${t.sharePct}% volume)</p>
      `;
      breakdownContainer.appendChild(col);
    });
  }

  [inputCust, inputStarter, inputPro, inputEnterprise, sliderDiscount, sliderAdoption].forEach(el => {
    if (el) el.addEventListener('input', update);
  });

  update();
}

// --- MODULE 5: SAAS BENCHMARKS & VALUATION ENCYCLOPEDIA ---
function setupBenchmarksAndValuation() {
  const tableBody = document.getElementById('benchmarks-table-body');
  if (tableBody) {
    tableBody.innerHTML = '';
    SAAS_BENCHMARKS.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${b.metric}</strong><p style="font-size:11px; color:#64748B; margin-top:2px;">${b.importance}</p></td>
        <td class="mono" style="color:#059669; font-weight:700;">${b.topQuartile}</td>
        <td class="mono" style="color:#0F172A; font-weight:600;">${b.median}</td>
        <td class="mono" style="color:#DC2626;">${b.bottomQuartile}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  const sliderARR = document.getElementById('val-arr-input');
  const sliderGrowth = document.getElementById('val-growth-input');
  const sliderR40 = document.getElementById('val-r40-input');

  function updateValuation() {
    if (!sliderARR) return;
    const arr = Number(sliderARR.value) || 500000;
    const growth = Number(sliderGrowth.value) || 50;
    const r40 = Number(sliderR40.value) || 35;

    const val = calculateSaaSValuation(arr, growth, r40);

    const elBear = document.getElementById('val-result-bear');
    const elBase = document.getElementById('val-result-base');
    const elBull = document.getElementById('val-result-bull');

    if (elBear) elBear.textContent = `${formatCompactCurrency(val.valuationBear)} (${val.bearMultiple}x)`;
    if (elBase) elBase.textContent = `${formatCompactCurrency(val.valuationBase)} (${val.baseMultiple}x)`;
    if (elBull) elBull.textContent = `${formatCompactCurrency(val.valuationBull)} (${val.bullMultiple}x)`;
  }

  [sliderARR, sliderGrowth, sliderR40].forEach(el => {
    if (el) el.addEventListener('input', updateValuation);
  });

  updateValuation();
}

// --- MODULE 4: STARTUP TYCOON SIMULATOR ---
function setupTycoonSimulator() {
  const hudMonth = document.getElementById('tycoon-hud-month');
  const hudCash = document.getElementById('tycoon-hud-cash');
  const hudMRR = document.getElementById('tycoon-hud-mrr');
  const hudBurn = document.getElementById('tycoon-hud-burn');
  const hudCustomers = document.getElementById('tycoon-hud-customers');
  const hudQuality = document.getElementById('tycoon-hud-quality');
  const hudProgress = document.getElementById('tycoon-progress-bar');
  const hudAudioBtn = document.getElementById('btn-tycoon-audio');

  const countFounders = document.getElementById('team-count-founders');
  const countEngineers = document.getElementById('team-count-engineers');
  const countMarketers = document.getElementById('team-count-marketers');
  const countSales = document.getElementById('team-count-sales');

  const sliderMarketing = document.getElementById('tycoon-budget-marketing');
  const sliderRD = document.getElementById('tycoon-budget-rd');
  const displayMarketing = document.getElementById('display-tycoon-marketing');
  const displayRD = document.getElementById('display-tycoon-rd');

  const btnAdvance = document.getElementById('btn-advance-month');
  const btnReset = document.getElementById('btn-reset-game');

  // Event modal
  const eventModal = document.getElementById('event-modal-overlay');
  const eventTitle = document.getElementById('event-modal-title');
  const eventBadge = document.getElementById('event-modal-badge');
  const eventBody = document.getElementById('event-modal-body');
  const choiceBtn0 = document.getElementById('btn-choice-0');
  const choiceBtn1 = document.getElementById('btn-choice-1');
  const choiceTitle0 = document.getElementById('choice-title-0');
  const choiceDesc0 = document.getElementById('choice-desc-0');
  const choiceTitle1 = document.getElementById('choice-title-1');
  const choiceDesc1 = document.getElementById('choice-desc-1');

  if (hudAudioBtn) {
    hudAudioBtn.textContent = soundEngine.muted ? '🔇 Sound: Off' : '🔊 Sound: On';
    hudAudioBtn.addEventListener('click', () => {
      const isMuted = soundEngine.toggleMute();
      hudAudioBtn.textContent = isMuted ? '🔇 Sound: Off' : '🔊 Sound: On';
    });
  }

  function renderHUD() {
    hudMonth.textContent = `Month ${tycoon.month} / ${tycoon.maxMonths}`;
    hudCash.textContent = formatCurrency(tycoon.cash);
    hudCash.className = tycoon.cash <= 15000 ? 'hud-tile-val mono crimson' : 'hud-tile-val mono green';

    hudMRR.textContent = formatCurrency(tycoon.mrr);
    const netBurn = tycoon.getNetBurn();
    hudBurn.textContent = formatCurrency(-netBurn);
    hudBurn.className = netBurn <= 0 ? 'hud-tile-val mono green' : 'hud-tile-val mono crimson';

    hudCustomers.textContent = formatNumber(tycoon.customers);
    hudQuality.textContent = `${tycoon.productQuality} / 100`;

    if (hudProgress) {
      const progressPct = ((tycoon.month - 1) / (tycoon.maxMonths - 1)) * 100;
      hudProgress.style.width = `${progressPct}%`;
    }

    countFounders.textContent = tycoon.team.founders;
    countEngineers.textContent = tycoon.team.engineers;
    countMarketers.textContent = tycoon.team.marketers;
    countSales.textContent = tycoon.team.sales;

    displayMarketing.textContent = formatCurrency(tycoon.budget.marketing);
    displayRD.textContent = formatCurrency(tycoon.budget.rAndD);

    // Update cap table summary
    const elFounderEq = document.getElementById('cap-founder-equity');
    const elInvestorEq = document.getElementById('cap-investor-equity');
    if (elFounderEq) elFounderEq.textContent = `${100 - tycoon.equityDilutionPct}%`;
    if (elInvestorEq) elInvestorEq.textContent = `${tycoon.equityDilutionPct}%`;
  }

  function addLog(text) {
    const feed = document.getElementById('tycoon-log-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'log-item';
    item.textContent = text;
    feed.prepend(item);
  }

  // Team hiring buttons
  document.getElementById('btn-hire-engineer')?.addEventListener('click', () => { tycoon.hire('engineers'); soundEngine.playTurnTick(); renderHUD(); });
  document.getElementById('btn-fire-engineer')?.addEventListener('click', () => { tycoon.fire('engineers'); soundEngine.playTurnTick(); renderHUD(); });
  document.getElementById('btn-hire-marketer')?.addEventListener('click', () => { tycoon.hire('marketers'); soundEngine.playTurnTick(); renderHUD(); });
  document.getElementById('btn-fire-marketer')?.addEventListener('click', () => { tycoon.fire('marketers'); soundEngine.playTurnTick(); renderHUD(); });
  document.getElementById('btn-hire-sales')?.addEventListener('click', () => { tycoon.hire('sales'); soundEngine.playTurnTick(); renderHUD(); });
  document.getElementById('btn-fire-sales')?.addEventListener('click', () => { tycoon.fire('sales'); soundEngine.playTurnTick(); renderHUD(); });

  sliderMarketing?.addEventListener('input', () => {
    tycoon.setBudget('marketing', sliderMarketing.value);
    renderHUD();
  });
  sliderRD?.addEventListener('input', () => {
    tycoon.setBudget('rAndD', sliderRD.value);
    renderHUD();
  });

  // Advance Turn
  btnAdvance?.addEventListener('click', () => {
    if (tycoon.status !== 'active') {
      alert(`Game ended with status: ${tycoon.status}. Click 'Reset Journey' to try again!`);
      return;
    }

    soundEngine.playTurnTick();
    const step = tycoon.advanceTurn();
    renderHUD();

    if (step.pendingEvent) {
      soundEngine.playCrisisChime();
      showEventModal(step.pendingEvent);
      return;
    }

    if (step.status === 'bankrupt') {
      soundEngine.playCrisisChime();
      addLog(`🚨 BANKRUPT: You ran out of cash at Month ${tycoon.month}!`);
      alert('Game Over: Cash depleted. You ran out of runway before achieving profitability.');
      return;
    }

    if (step.status === 'unicorn') {
      soundEngine.playVictoryJingle();
      addLog(`🦄 UNICORN: Reached $1M ARR ($83.3k MRR) at Month 24!`);
      alert('VICTORY! You scaled past $1,000,000 ARR in 24 months!');
      return;
    }

    if (step.status === 'default_alive') {
      soundEngine.playVictoryJingle();
      addLog(`✅ DEFAULT ALIVE: Cash-flow positive & self-sustaining at Month 24!`);
      alert('VICTORY! You reached Month 24 cash-flow positive and built an enduring SaaS company!');
      return;
    }

    if (step.status === 'completed') {
      soundEngine.playVictoryJingle();
      addLog(`🏁 FINISHED: Survived 24 months with positive bank balance.`);
      return;
    }

    addLog(`📅 Month ${tycoon.month}: +${step.newCustomers} new clients, -${step.churnedCustomers} churned. Net Burn: ${formatCurrency(step.netBurn)}.`);
  });

  function showEventModal(evt) {
    eventTitle.textContent = evt.title;
    eventBadge.textContent = evt.badge;
    eventBadge.className = `modal-badge ${evt.badgeColor || 'emerald'}`;
    eventBody.textContent = evt.description;

    choiceTitle0.textContent = evt.choices[0].label;
    choiceDesc0.textContent = evt.choices[0].description;

    choiceTitle1.textContent = evt.choices[1].label;
    choiceDesc1.textContent = evt.choices[1].description;

    eventModal.classList.add('open');
  }

  choiceBtn0?.addEventListener('click', () => {
    const res = tycoon.resolveEvent(0);
    eventModal.classList.remove('open');
    soundEngine.playTurnTick();
    renderHUD();
    if (res && res.message) addLog(`⚡ ${res.message}`);
  });

  choiceBtn1?.addEventListener('click', () => {
    const res = tycoon.resolveEvent(1);
    eventModal.classList.remove('open');
    soundEngine.playTurnTick();
    renderHUD();
    if (res && res.message) addLog(`⚡ ${res.message}`);
  });

  // Investor Pitching
  document.getElementById('btn-pitch-angel')?.addEventListener('click', () => {
    const res = tycoon.pitchInvestors('angel');
    if (res.success) soundEngine.playCashRegister();
    else soundEngine.playCrisisChime();
    renderHUD();
    addLog(res.message);
    alert(res.message);
  });

  document.getElementById('btn-pitch-seed')?.addEventListener('click', () => {
    const res = tycoon.pitchInvestors('seed');
    if (res.success) soundEngine.playCashRegister();
    else soundEngine.playCrisisChime();
    renderHUD();
    addLog(res.message);
    alert(res.message);
  });

  document.getElementById('btn-pitch-seriesa')?.addEventListener('click', () => {
    const res = tycoon.pitchInvestors('seriesA');
    if (res.success) soundEngine.playCashRegister();
    else soundEngine.playCrisisChime();
    renderHUD();
    addLog(res.message);
    alert(res.message);
  });

  // Reset
  btnReset?.addEventListener('click', () => {
    if (confirm('Reset your startup simulation back to Month 1?')) {
      tycoon.reset();
      renderHUD();
      addLog('🔄 Journey reset to Month 1 ($120k cash, 60 customers).');
    }
  });

  renderHUD();
}

// --- EXPORT & LEGAL MODALS ---
function setupExportAndLegal() {
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    if (currentRunwayResult) {
      exportRunwayToCSV(currentRunwayResult);
    }
  });

  document.getElementById('btn-print-report')?.addEventListener('click', () => {
    printExecutiveReport();
  });

  const legalModal = document.getElementById('legal-modal-overlay');
  const legalTitle = document.getElementById('legal-modal-title');
  const legalContent = document.getElementById('legal-modal-content');
  const btnClose = document.getElementById('btn-close-legal');

  btnClose?.addEventListener('click', () => {
    legalModal.classList.remove('open');
  });

  document.getElementById('link-privacy')?.addEventListener('click', (e) => {
    e.preventDefault();
    legalTitle.textContent = 'Privacy Policy';
    legalContent.innerHTML = `
      <p><strong>1. Zero Data Collection:</strong> Budof (budof.com) does not store, transmit, or monetize your private financial numbers. All runway models, employee salaries, and unit economics calculations run 100% locally in your web browser.</p>
      <br>
      <p><strong>2. Local Storage:</strong> Custom hiring plans and simulation checkpoints are saved strictly inside your browser's private localStorage and never touch any cloud or external database.</p>
      <br>
      <p><strong>3. Advertising & Cookies:</strong> We partner with Google AdSense to serve non-intrusive contextual ads. Third-party vendors use cookies to serve ads based on user visits.</p>
    `;
    legalModal.classList.add('open');
  });

  document.getElementById('link-terms')?.addEventListener('click', (e) => {
    e.preventDefault();
    legalTitle.textContent = 'Terms of Use';
    legalContent.innerHTML = `
      <p><strong>1. Free License:</strong> Budof grants you an open, royalty-free license to model financial forecasts, export reports, and use simulation tools for commercial and educational purposes.</p>
      <br>
      <p><strong>2. Accuracy & Heuristics:</strong> Calculations are heuristic mathematical simulations. Actual future cash reserves, tax rates, and customer acquisition costs will vary based on macroeconomic conditions.</p>
    `;
    legalModal.classList.add('open');
  });

  document.getElementById('link-disclaimer')?.addEventListener('click', (e) => {
    e.preventDefault();
    legalTitle.textContent = 'Financial & Legal Disclaimer';
    legalContent.innerHTML = `
      <p><strong>Important Notice:</strong> The calculations, unit economics indicators, and simulation models provided on Budof (budof.com) are for informational, strategic modeling, and educational purposes only.</p>
      <br>
      <p>Nothing on this website constitutes formal accounting, legal, or investment advice. Always consult a Certified Public Accountant (CPA) or corporate securities attorney before making funding or hiring decisions.</p>
    `;
    legalModal.classList.add('open');
  });

  const feedbackModal = document.getElementById('feedback-modal-overlay');
  const btnCloseFeedback = document.getElementById('btn-close-feedback');
  const btnSubmitFeedback = document.getElementById('btn-submit-feedback');

  btnCloseFeedback?.addEventListener('click', () => {
    feedbackModal.classList.remove('open');
  });

  document.getElementById('link-feedback')?.addEventListener('click', (e) => {
    e.preventDefault();
    feedbackModal.classList.add('open');
  });

  btnSubmitFeedback?.addEventListener('click', () => {
    const text = document.getElementById('feedback-text')?.value;
    if (text) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('budof_feedback_' + Date.now(), text);
      }
      const successEl = document.getElementById('feedback-success');
      if (successEl) successEl.style.display = 'block';
    }
  });
}
