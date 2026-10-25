/* Budof Standalone Production Bundle — (C) budof.com */
(function () {
  "use strict";

  // --- MODULE: js/utils/formatters.js ---
  /**
   * Formatters utility for financial numbers, percentages, currencies, and multi-currency support.
   */
  
  let currentCurrency = '$';
  function setCurrency(symbol) {
    if (symbol && typeof symbol === 'string') {
      currentCurrency = symbol.trim();
    }
    return currentCurrency;
  }
  function getCurrency() {
    return currentCurrency;
  }
  function formatCurrency(amount, decimals = 0, currencyOverride = null) {
    if (typeof amount !== 'number' || isNaN(amount)) return `${currencyOverride || currentCurrency}0`;
    const isNegative = amount < 0;
    const abs = Math.abs(amount);
    const symbol = currencyOverride || currentCurrency;
    const formatted = abs.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  }
  function formatCompactCurrency(amount, currencyOverride = null) {
    if (typeof amount !== 'number' || isNaN(amount)) return `${currencyOverride || currentCurrency}0`;
    const isNegative = amount < 0;
    const abs = Math.abs(amount);
    const symbol = currencyOverride || currentCurrency;
  
    let formatted = '';
    if (abs >= 1_000_000_000) {
      formatted = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    } else if (abs >= 1_000_000) {
      formatted = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (abs >= 1_000) {
      formatted = (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
      formatted = abs.toFixed(0);
    }
  
    return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  }
  function formatPercent(val, decimals = 1) {
    if (typeof val !== 'number' || isNaN(val)) return '0%';
    return `${val.toFixed(decimals)}%`;
  }
  function formatNumber(val, decimals = 0) {
    if (typeof val !== 'number' || isNaN(val)) return '0';
    return val.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  function formatMonths(months) {
    if (months === Infinity || months > 120) return 'Default Alive (∞)';
    if (months <= 0) return 'Depleted (0 mos)';
    if (months === 1) return '1.0 month';
    return `${months.toFixed(1)} months`;
  }
  

  // --- MODULE: js/engine/runway-simulator.js ---
  /**
   * Dynamic Runway & 36-Month Burn Forecaster Engine
   * Implements Paul Graham's "Default Alive / Default Dead" algorithm.
   */
  const TAX_BENEFITS_MULTIPLIER = 1.15; // 15% employer taxes, healthcare, payroll fees buffer
  function calculateRunway(params = {}) {
    const startingCash = Math.max(0, Number(params.startingCash) || 0);
    const currentMRR = Math.max(0, Number(params.currentMRR) || 0);
    const monthlyGrowthRate = Number(params.monthlyGrowthRate) || 0; // decimal, e.g. 0.05 for 5%
    const monthlyOpEx = Math.max(0, Number(params.monthlyOpEx) || 0);
    const headcount = Array.isArray(params.headcount) ? params.headcount : [];
    const horizonMonths = Math.max(12, Math.min(60, Number(params.horizonMonths) || 36));
  
    const monthlyProjections = [];
    let currentCash = startingCash;
    let zeroCashMonth = null;
    let breakevenMonth = null;
    let lowestCashBalance = startingCash;
    let fractionalRunway = 0;
  
    for (let m = 1; m <= horizonMonths; m++) {
      // Revenue compound growth
      const revenue = currentMRR * Math.pow(1 + monthlyGrowthRate, m - 1);
  
      // Active payroll for this month with tax buffer
      let payroll = 0;
      for (const member of headcount) {
        const startMonth = Number(member.startMonth) || 1;
        const salary = Math.max(0, Number(member.monthlySalary) || 0);
        if (startMonth <= m) {
          payroll += salary * TAX_BENEFITS_MULTIPLIER;
        }
      }
  
      const grossBurn = payroll + monthlyOpEx;
      const netBurn = grossBurn - revenue;
      const isProfitable = netBurn <= 0;
  
      if (isProfitable && breakevenMonth === null) {
        breakevenMonth = m;
      }
  
      const previousCash = currentCash;
      currentCash -= netBurn;
  
      if (currentCash < lowestCashBalance) {
        lowestCashBalance = currentCash;
      }
  
      if (currentCash <= 0 && zeroCashMonth === null) {
        zeroCashMonth = m;
        // Precise fractional runway
        if (netBurn > 0 && previousCash > 0) {
          fractionalRunway = (m - 1) + (previousCash / netBurn);
        } else {
          fractionalRunway = m - 1;
        }
      }
  
      monthlyProjections.push({
        month: m,
        revenue: Math.round(revenue),
        payroll: Math.round(payroll),
        opex: Math.round(monthlyOpEx),
        grossBurn: Math.round(grossBurn),
        netBurn: Math.round(netBurn),
        endingCash: Math.round(currentCash),
        isProfitable,
        isBankrupt: currentCash <= 0
      });
    }
  
    // Determine Default Alive status
    // A startup is Default Alive if its revenue will grow to exceed expenses before cash runs out.
    const isDefaultAlive = (breakevenMonth !== null && (zeroCashMonth === null || breakevenMonth < zeroCashMonth));
    
    let finalRunway = 0;
    if (isDefaultAlive && zeroCashMonth === null) {
      finalRunway = Infinity;
    } else if (zeroCashMonth !== null) {
      finalRunway = Number(fractionalRunway.toFixed(1));
    } else {
      // Cash lasted beyond horizon without going bankrupt
      finalRunway = horizonMonths;
    }
  
    // Initial month 1 baseline burn
    const initialMonth = monthlyProjections[0] || { netBurn: 0, grossBurn: 0, revenue: 0 };
    const initialBurn = initialMonth.netBurn;
  
    return {
      startingCash,
      currentMRR,
      monthlyGrowthRate,
      monthlyOpEx,
      headcountCount: headcount.length,
      isDefaultAlive,
      runwayMonths: finalRunway,
      zeroCashMonth,
      breakevenMonth,
      lowestCashBalance: Math.round(lowestCashBalance),
      initialNetBurn: initialBurn,
      month36Revenue: monthlyProjections[monthlyProjections.length - 1]?.revenue || 0,
      month36EndingCash: monthlyProjections[monthlyProjections.length - 1]?.endingCash || 0,
      monthlyProjections
    };
  }
  

  // --- MODULE: js/engine/unit-economics.js ---
  /**
   * SaaS Unit Economics & Efficiency Engine
   * Computes LTV, CAC Payback, Magic Number, and Rule of 40 with clinical benchmarks.
   */
  function calculateUnitEconomics(params = {}) {
    const cac = Math.max(0, Number(params.cac) || 0);
    const arpu = Math.max(0, Number(params.arpu) || 0);
    
    // Convert percentage inputs to safe decimals
    let grossMarginPct = Number(params.grossMarginPct);
    if (isNaN(grossMarginPct)) grossMarginPct = 80;
    grossMarginPct = Math.max(1, Math.min(100, grossMarginPct));
    const gmDecimal = grossMarginPct / 100;
  
    let monthlyChurnPct = Number(params.monthlyChurnPct);
    if (isNaN(monthlyChurnPct) || monthlyChurnPct < 0.01) monthlyChurnPct = 2.0; // Avoid divide-by-zero
    monthlyChurnPct = Math.min(100, monthlyChurnPct);
    const churnDecimal = monthlyChurnPct / 100;
  
    // Lifetime in months
    const customerLifetimeMonths = 1 / churnDecimal;
  
    // LTV = (ARPU * Gross Margin) / Churn Rate
    const ltv = (arpu * gmDecimal) / churnDecimal;
  
    // LTV:CAC Ratio
    let ltvCacRatio = 0;
    if (cac > 0) {
      ltvCacRatio = ltv / cac;
    } else if (ltv > 0) {
      ltvCacRatio = 999; // Essentially infinite if CAC is $0
    }
  
    // CAC Payback Period (Months) = CAC / (ARPU * Gross Margin)
    const monthlyGrossProfitPerCustomer = arpu * gmDecimal;
    let paybackMonths = 0;
    if (monthlyGrossProfitPerCustomer > 0) {
      paybackMonths = cac / monthlyGrossProfitPerCustomer;
    }
  
    // Magic Number (Sales & Marketing Efficiency)
    // Formula: (Net New ARR Added in Quarter) / (Quarterly S&M Expense)
    const smSpend = Math.max(0, Number(params.salesMarketingSpend) || 0);
    const netNewARRQuarter = Number(params.netNewARRQuarter) || 0;
    let magicNumber = null;
    if (smSpend > 0) {
      magicNumber = Number((netNewARRQuarter / smSpend).toFixed(2));
    }
  
    // Rule of 40 = Annual Growth Rate (%) + Free Cash Flow Margin (%)
    const annualGrowthRatePct = Number(params.annualGrowthRatePct) || 0;
    const fcfMarginPct = Number(params.fcfMarginPct) || 0;
    const ruleOf40Score = Number((annualGrowthRatePct + fcfMarginPct).toFixed(1));
    const meetsRuleOf40 = ruleOf40Score >= 40;
  
    // Health diagnosis and benchmarks
    const diagnosis = [];
    let ltvStatus = 'optimal';
    if (ltvCacRatio >= 3.0) {
      diagnosis.push({
        metric: 'LTV : CAC',
        status: 'success',
        text: `Outstanding ${ltvCacRatio.toFixed(1)}x ratio. Your unit margins can comfortably fund aggressive acquisition.`
      });
    } else if (ltvCacRatio >= 1.5) {
      ltvStatus = 'warning';
      diagnosis.push({
        metric: 'LTV : CAC',
        status: 'warning',
        text: `Marginal ${ltvCacRatio.toFixed(1)}x ratio. Aim for >3.0x by reducing churn or raising prices.`
      });
    } else {
      ltvStatus = 'danger';
      diagnosis.push({
        metric: 'LTV : CAC',
        status: 'danger',
        text: `Critical ${ltvCacRatio.toFixed(1)}x ratio. You are losing money on every customer acquired.`
      });
    }
  
    let paybackStatus = 'optimal';
    if (paybackMonths <= 12) {
      diagnosis.push({
        metric: 'Payback Period',
        status: 'success',
        text: `Elite ${paybackMonths.toFixed(1)} month payback. Cash is recovered fast enough to self-fund growth.`
      });
    } else if (paybackMonths <= 18) {
      paybackStatus = 'warning';
      diagnosis.push({
        metric: 'Payback Period',
        status: 'warning',
        text: `Acceptable ${paybackMonths.toFixed(1)} month payback, but working capital will bottleneck high growth.`
      });
    } else {
      paybackStatus = 'danger';
      diagnosis.push({
        metric: 'Payback Period',
        status: 'danger',
        text: `Dangerous ${paybackMonths.toFixed(1)} month payback. S&M cash is locked up for over 1.5 years.`
      });
    }
  
    if (magicNumber !== null) {
      if (magicNumber >= 1.0) {
        diagnosis.push({
          metric: 'Magic Number',
          status: 'success',
          text: `Exceptional ${magicNumber} efficiency! Every $1 in acquisition yields over $1 in recurring ARR.`
        });
      } else if (magicNumber >= 0.75) {
        diagnosis.push({
          metric: 'Magic Number',
          status: 'info',
          text: `Healthy ${magicNumber} efficiency. Sustainable go-to-market engine.`
        });
      } else {
        diagnosis.push({
          metric: 'Magic Number',
          status: 'warning',
          text: `Sub-par ${magicNumber} efficiency. Optimize sales cycle and demo conversion before increasing ad spend.`
        });
      }
    }
  
    return {
      cac,
      arpu,
      grossMarginPct,
      monthlyChurnPct,
      customerLifetimeMonths: Number(customerLifetimeMonths.toFixed(1)),
      ltv: Math.round(ltv),
      ltvCacRatio: Number(ltvCacRatio.toFixed(2)),
      paybackMonths: Number(paybackMonths.toFixed(1)),
      magicNumber,
      ruleOf40Score,
      meetsRuleOf40,
      ltvStatus,
      paybackStatus,
      diagnosis
    };
  }
  

  // --- MODULE: js/engine/pricing-calculator.js ---
  /**
   * SaaS Tier Pricing Elasticity & Cash vs ARR Engine
   */
  function calculatePricingTiers(params = {}) {
    const totalCustomers = Math.max(1, Number(params.totalCustomers) || 250);
    
    // Tiers: { name, monthlyPrice, customerSharePct }
    const starterPrice = Math.max(0, Number(params.starterPrice) || 29);
    const starterShare = Math.max(0, Number(params.starterShare) || 60);
  
    const proPrice = Math.max(0, Number(params.proPrice) || 79);
    const proShare = Math.max(0, Number(params.proShare) || 30);
  
    const enterprisePrice = Math.max(0, Number(params.enterprisePrice) || 299);
    const enterpriseShare = Math.max(0, Number(params.enterpriseShare) || 10);
  
    // Normalize shares
    const totalShare = starterShare + proShare + enterpriseShare;
    const normStarter = totalShare > 0 ? (starterShare / totalShare) : 0.6;
    const normPro = totalShare > 0 ? (proShare / totalShare) : 0.3;
    const normEnterprise = totalShare > 0 ? (enterpriseShare / totalShare) : 0.1;
  
    // Annual billing parameters
    const annualDiscountPct = Math.max(0, Math.min(50, Number(params.annualDiscountPct) || 20)); // e.g. 20% off
    const annualDiscountFactor = 1 - (annualDiscountPct / 100);
    const annualAdoptionPct = Math.max(0, Math.min(100, Number(params.annualAdoptionPct) || 35)); // 35% pay upfront
    const annualAdoptionDecimal = annualAdoptionPct / 100;
  
    // Customer distribution
    const starterCustomers = Math.round(totalCustomers * normStarter);
    const proCustomers = Math.round(totalCustomers * normPro);
    const enterpriseCustomers = Math.max(0, totalCustomers - starterCustomers - proCustomers);
  
    // Blended Monthly ARPU (before annual discount)
    const blendedMonthlyARPU = (normStarter * starterPrice) + (normPro * proPrice) + (normEnterprise * enterprisePrice);
  
    // Effective Monthly Revenue taking annual discount into account
    const monthlyPayingCustomers = Math.round(totalCustomers * (1 - annualAdoptionDecimal));
    const annualPayingCustomers = totalCustomers - monthlyPayingCustomers;
  
    // Monthly Recurring Revenue (accounting for effective discounted price for annual contracts)
    const blendedDiscountedARPU = (blendedMonthlyARPU * (1 - annualAdoptionDecimal)) + (blendedMonthlyARPU * annualDiscountFactor * annualAdoptionDecimal);
    const mrr = Math.round(blendedDiscountedARPU * totalCustomers);
    const arr = mrr * 12;
  
    // Upfront cash collected immediately from annual customers (12 months paid at once with discount)
    const upfrontAnnualCash = Math.round(annualPayingCustomers * (blendedMonthlyARPU * 12 * annualDiscountFactor));
  
    // Monthly recurring cash from remaining monthly payers
    const recurringMonthlyCash = Math.round(monthlyPayingCustomers * blendedMonthlyARPU);
  
    // Churn protection impact (industry data: annual contracts exhibit 55% lower churn)
    const estimatedChurnReductionPct = Math.round(annualAdoptionPct * 0.55);
  
    return {
      totalCustomers,
      blendedMonthlyARPU: Number(blendedMonthlyARPU.toFixed(2)),
      blendedEffectiveARPU: Number(blendedDiscountedARPU.toFixed(2)),
      mrr,
      arr,
      upfrontAnnualCash,
      recurringMonthlyCash,
      estimatedChurnReductionPct,
      tiers: [
        { name: 'Starter', price: starterPrice, customers: starterCustomers, sharePct: Math.round(normStarter * 100) },
        { name: 'Professional', price: proPrice, customers: proCustomers, sharePct: Math.round(normPro * 100) },
        { name: 'Enterprise', price: enterprisePrice, customers: enterpriseCustomers, sharePct: Math.round(normEnterprise * 100) }
      ]
    };
  }
  

  // --- MODULE: js/engine/fundraising-calculator.js ---
  /**
   * Startup Fundraising Target & Runway Extension Engine
   * Computes exact capital requirement for 12, 18, or 24 months of runway with safety buffers.
   */
  function calculateFundraisingTarget(params = {}) {
    const targetMonths = Math.max(6, Math.min(36, Number(params.targetRunwayMonths) || 18));
    const netMonthlyBurn = Math.max(100, Number(params.netMonthlyBurn) || 15000);
    const safetyBufferPct = Math.max(0, Math.min(50, Number(params.safetyBufferPct) || 20)); // e.g. 20%
    const monthlyHiringExpansion = Math.max(0, Number(params.monthlyHiringExpansion) || 0);
  
    // Adjusted burn factoring in planned expansion
    const effectiveMonthlyBurn = netMonthlyBurn + (monthlyHiringExpansion * 1.15);
  
    const baselineCapitalNeeded = effectiveMonthlyBurn * targetMonths;
    const safetyBufferAmount = baselineCapitalNeeded * (safetyBufferPct / 100);
    const totalTargetToRaise = Math.round(baselineCapitalNeeded + safetyBufferAmount);
  
    // Round tier categorization
    let roundTier = 'Pre-Seed';
    let typicalDilutionPct = 10;
    if (totalTargetToRaise >= 3000000) {
      roundTier = 'Series A';
      typicalDilutionPct = 20;
    } else if (totalTargetToRaise >= 750000) {
      roundTier = 'Seed Round';
      typicalDilutionPct = 15;
    } else if (totalTargetToRaise >= 250000) {
      roundTier = 'Late Angel / Pre-Seed';
      typicalDilutionPct = 10;
    } else {
      roundTier = 'Friends & Family / Micro-Angel';
      typicalDilutionPct = 7;
    }
  
    // Estimated Post-Money Valuation needed to maintain standard dilution
    const impliedPostMoney = Math.round(totalTargetToRaise / (typicalDilutionPct / 100));
    const impliedPreMoney = impliedPostMoney - totalTargetToRaise;
  
    return {
      targetMonths,
      effectiveMonthlyBurn: Math.round(effectiveMonthlyBurn),
      baselineCapitalNeeded: Math.round(baselineCapitalNeeded),
      safetyBufferPct,
      safetyBufferAmount: Math.round(safetyBufferAmount),
      totalTargetToRaise,
      roundTier,
      typicalDilutionPct,
      impliedPostMoney,
      impliedPreMoney
    };
  }
  

  // --- MODULE: js/engine/dilution-calculator.js ---
  /**
   * Cap Table Equity Dilution & Pre/Post-Money Engine
   * Calculates investor ownership, unallocated employee option pool shuffle, and founder retention.
   */
  function calculateEquityDilution(params = {}) {
    const preMoney = Math.max(10000, Number(params.preMoneyValuation) || 4000000);
    const investment = Math.max(1000, Number(params.investmentAmount) || 1000000);
    const optionPoolPct = Math.max(0, Math.min(25, Number(params.optionPoolPct) || 10)); // e.g. 10%
    const founderCount = Math.max(1, Number(params.founderCount) || 2);
  
    // Post-Money = Pre-Money + Investment
    const postMoney = preMoney + investment;
  
    // Investor ownership %
    const investorOwnershipPct = Number(((investment / postMoney) * 100).toFixed(2));
  
    // Option pool is typically created from pre-money equity (VC-standard Option Pool Shuffle)
    // Effective founder ownership after option pool and investor dilution:
    const founderEquityPct = Number(((1 - (investorOwnershipPct / 100)) * (100 - optionPoolPct)).toFixed(2));
    const founderDilutionPct = Number((100 - founderEquityPct).toFixed(2));
    const equityPerFounder = Number((founderEquityPct / founderCount).toFixed(2));
  
    // Implied value of 1% equity at post-money
    const valuePerOnePercent = Math.round(postMoney * 0.01);
  
    return {
      preMoney,
      investment,
      postMoney,
      optionPoolPct,
      investorOwnershipPct,
      founderEquityPct,
      founderDilutionPct,
      founderCount,
      equityPerFounder,
      valuePerOnePercent
    };
  }
  

  // --- MODULE: js/engine/hiring-impact-calculator.js ---
  /**
   * Hiring Runway Impact & Zero-Cash Delta Engine
   * Calculates the exact number of runway months consumed when hiring a new team member.
   */
  function calculateHiringImpact(baseParams = {}, newRole = {}) {
    const newSalary = Math.max(0, Number(newRole.monthlySalary) || 0);
    const startMonth = Math.max(1, Number(newRole.startMonth) || 1);
    const roleName = newRole.role || 'New Hire';
  
    // Baseline calculation without this new hire
    const baselineRunwayResult = calculateRunway(baseParams);
  
    // Clone headcount and append new hire
    const existingHeadcount = Array.isArray(baseParams.headcount) ? baseParams.headcount : [];
    const modifiedHeadcount = [
      ...existingHeadcount,
      {
        id: 'simulation_hire',
        role: roleName,
        monthlySalary: newSalary,
        startMonth
      }
    ];
  
    // Recalculate with new hire
    const newRunwayResult = calculateRunway({
      ...baseParams,
      headcount: modifiedHeadcount
    });
  
    const baseMonths = baselineRunwayResult.runwayMonths;
    const newMonths = newRunwayResult.runwayMonths;
  
    let runwayMonthsLost = 0;
    if (baseMonths !== Infinity && newMonths !== Infinity) {
      runwayMonthsLost = Number(Math.max(0, baseMonths - newMonths).toFixed(1));
    } else if (baseMonths === Infinity && newMonths !== Infinity) {
      runwayMonthsLost = 'Turns Default Alive into Default Dead';
    }
  
    // Monthly fully-loaded cost (salary + 15% taxes/benefits)
    const fullyLoadedMonthlyCost = Math.round(newSalary * TAX_BENEFITS_MULTIPLIER);
    const annualFullyLoadedCost = fullyLoadedMonthlyCost * 12;
  
    // Additional MRR required to achieve cash-flow neutrality for this hire
    const requiredMRRToBreakeven = fullyLoadedMonthlyCost;
  
    return {
      roleName,
      monthlySalary: newSalary,
      fullyLoadedMonthlyCost,
      annualFullyLoadedCost,
      baselineRunwayMonths: baseMonths,
      newRunwayMonths: newMonths,
      runwayMonthsLost,
      requiredMRRToBreakeven,
      newZeroCashMonth: newRunwayResult.zeroCashMonth,
      baselineZeroCashMonth: baselineRunwayResult.zeroCashMonth
    };
  }
  

  // --- MODULE: js/engine/presets.js ---
  /**
   * Real-World Startup Financial Model Presets
   * Verified benchmark templates across 5 distinct digital business models.
   */
  const INDUSTRY_PRESETS = {
    ai_micro_saas: {
      id: 'ai_micro_saas',
      name: 'AI Micro-SaaS',
      icon: '🚀',
      tagline: 'Solo Hacker • Viral Acquisition • High Margin',
      startingCash: 35000,
      currentMRR: 4500,
      monthlyGrowthRate: 0.14,
      monthlyOpEx: 1800,
      headcount: [
        { id: 'h1', role: 'Founder Fullstack Dev', monthlySalary: 3000, startMonth: 1 },
        { id: 'h2', role: 'Contract AI Ops Engineer', monthlySalary: 2500, startMonth: 4 }
      ],
      unitEconomics: {
        cac: 120,
        arpu: 49,
        grossMarginPct: 92,
        monthlyChurnPct: 4.2,
        smSpend: 4000,
        netARR: 12000,
        annualGrowth: 120,
        fcfMargin: 15
      }
    },
  
    b2b_enterprise: {
      id: 'b2b_enterprise',
      name: 'B2B Enterprise SaaS',
      icon: '🏢',
      tagline: 'Seed Stage • High LTV • Dedicated Sales',
      startingCash: 750000,
      currentMRR: 28000,
      monthlyGrowthRate: 0.075,
      monthlyOpEx: 12000,
      headcount: [
        { id: 'h1', role: 'Lead Architect', monthlySalary: 9000, startMonth: 1 },
        { id: 'h2', role: 'Enterprise Account Exec', monthlySalary: 6500, startMonth: 2 },
        { id: 'h3', role: 'Customer Success Manager', monthlySalary: 5500, startMonth: 4 },
        { id: 'h4', role: 'Senior Backend Engineer', monthlySalary: 8000, startMonth: 6 }
      ],
      unitEconomics: {
        cac: 3200,
        arpu: 450,
        grossMarginPct: 82,
        monthlyChurnPct: 1.1,
        smSpend: 35000,
        netARR: 65000,
        annualGrowth: 65,
        fcfMargin: -8
      }
    },
  
    consumer_mobile: {
      id: 'consumer_mobile',
      name: 'Consumer Mobile App',
      icon: '📱',
      tagline: 'In-App Subscriptions • Paid UA Funnel',
      startingCash: 120000,
      currentMRR: 9200,
      monthlyGrowthRate: 0.105,
      monthlyOpEx: 5500,
      headcount: [
        { id: 'h1', role: 'Lead iOS/Android Dev', monthlySalary: 7500, startMonth: 1 },
        { id: 'h2', role: 'Performance UA Specialist', monthlySalary: 5000, startMonth: 3 }
      ],
      unitEconomics: {
        cac: 38,
        arpu: 12.99,
        grossMarginPct: 72,
        monthlyChurnPct: 5.8,
        smSpend: 18000,
        netARR: 28000,
        annualGrowth: 85,
        fcfMargin: -4
      }
    },
  
    bootstrapped_profitable: {
      id: 'bootstrapped_profitable',
      name: 'Bootstrapped Default Alive',
      icon: '🛡️',
      tagline: 'Lean Team • Profitable • Zero VC Dilution',
      startingCash: 180000,
      currentMRR: 42000,
      monthlyGrowthRate: 0.05,
      monthlyOpEx: 6500,
      headcount: [
        { id: 'h1', role: 'Founder & CEO', monthlySalary: 5000, startMonth: 1 },
        { id: 'h2', role: 'Senior Fullstack Dev', monthlySalary: 7000, startMonth: 1 },
        { id: 'h3', role: 'Growth Marketer', monthlySalary: 4500, startMonth: 2 }
      ],
      unitEconomics: {
        cac: 480,
        arpu: 89,
        grossMarginPct: 88,
        monthlyChurnPct: 1.9,
        smSpend: 8000,
        netARR: 22000,
        annualGrowth: 45,
        fcfMargin: 18
      }
    },
  
    venture_hypergrowth: {
      id: 'venture_hypergrowth',
      name: 'Series A Hypergrowth',
      icon: '🦄',
      tagline: 'Institutional Backing • Aggressive Expansion',
      startingCash: 2800000,
      currentMRR: 95000,
      monthlyGrowthRate: 0.085,
      monthlyOpEx: 42000,
      headcount: [
        { id: 'h1', role: 'VP of Engineering', monthlySalary: 12000, startMonth: 1 },
        { id: 'h2', role: 'Staff Backend Engineer', monthlySalary: 8500, startMonth: 1 },
        { id: 'h3', role: 'Enterprise Sales Lead', monthlySalary: 8000, startMonth: 2 },
        { id: 'h4', role: 'Product Lead', monthlySalary: 7500, startMonth: 3 },
        { id: 'h5', role: 'Site Reliability / DevOps', monthlySalary: 8500, startMonth: 5 }
      ],
      unitEconomics: {
        cac: 1800,
        arpu: 199,
        grossMarginPct: 84,
        monthlyChurnPct: 1.6,
        smSpend: 75000,
        netARR: 140000,
        annualGrowth: 95,
        fcfMargin: -15
      }
    }
  };
  

  // --- MODULE: js/engine/valuation.js ---
  /**
   * SaaS Valuation Multiple & Industry Benchmark Engine
   * Uses public & private B2B venture multiples based on Growth Rate and Rule of 40.
   */
  const SAAS_BENCHMARKS = [
    {
      metric: 'Net Dollar Retention (NDR)',
      topQuartile: '> 120%',
      median: '104%',
      bottomQuartile: '< 90%',
      importance: 'Measures negative churn; indicates existing customers expand spending over time.'
    },
    {
      metric: 'CAC Payback Period',
      topQuartile: '< 8 months',
      median: '14.5 months',
      bottomQuartile: '> 24 months',
      importance: 'How fast initial customer acquisition cash is recovered to self-fund next growth cycle.'
    },
    {
      metric: 'LTV : CAC Ratio',
      topQuartile: '> 4.5x',
      median: '3.1x',
      bottomQuartile: '< 1.5x',
      importance: 'Unit margin efficiency; determines whether scaling paid ads creates or destroys equity.'
    },
    {
      metric: 'Magic Number (Sales Efficiency)',
      topQuartile: '> 1.20',
      median: '0.82',
      bottomQuartile: '< 0.50',
      importance: 'Ratio of net new ARR created per dollar spent in Sales & Marketing.'
    },
    {
      metric: 'Rule of 40 Score',
      topQuartile: '> 50%',
      median: '34%',
      bottomQuartile: '< 15%',
      importance: 'Sum of Annual Revenue Growth Rate and Free Cash Flow Margin.'
    },
    {
      metric: 'Gross Margin %',
      topQuartile: '> 85%',
      median: '76%',
      bottomQuartile: '< 62%',
      importance: 'Percentage of revenue remaining after direct hosting, COGS, and customer support.'
    }
  ];
  function calculateSaaSValuation(arr, growthRatePct, ruleOf40Pct) {
    const safeARR = Math.max(1000, Number(arr) || 50000);
    const growth = Number(growthRatePct) || 30;
    const r40 = Number(ruleOf40Pct) || 20;
  
    // Base multiple based on modern venture capital valuation environments
    let baseMultiple = 6.0;
  
    if (growth > 100) baseMultiple += 5.0;
    else if (growth > 60) baseMultiple += 3.5;
    else if (growth > 30) baseMultiple += 1.5;
    else if (growth < 10) baseMultiple -= 1.5;
  
    if (r40 >= 50) baseMultiple += 3.0;
    else if (r40 >= 40) baseMultiple += 1.5;
    else if (r40 < 10) baseMultiple -= 1.5;
  
    baseMultiple = Math.max(2.5, Math.min(25.0, baseMultiple));
  
    const bearMultiple = Number((baseMultiple * 0.75).toFixed(1));
    const bullMultiple = Number((baseMultiple * 1.35).toFixed(1));
  
    return {
      arr: safeARR,
      bearMultiple,
      baseMultiple: Number(baseMultiple.toFixed(1)),
      bullMultiple,
      valuationBear: Math.round(safeARR * bearMultiple),
      valuationBase: Math.round(safeARR * baseMultiple),
      valuationBull: Math.round(safeARR * bullMultiple)
    };
  }
  

  // --- MODULE: js/engine/deals.js ---
  /**
   * Curated Founder Perks, B2B Discounts & High-Yield Partner Directory
   */
  const FOUNDER_PERKS = [
    {
      id: 'mercury_banking',
      partner: 'Mercury Bank',
      category: 'Fintech & Banking',
      badge: 'Popular',
      offer: 'Earn 4.5%–5.0% APY on Idle Startup Cash + $250 Bonus',
      description: 'FDIC-insured business checking and automated treasury designed for technology startups. Free international wires and virtual corporate cards.',
      value: '$250 Bonus + 5% Yield',
      url: 'https://mercury.com/',
      cta: 'Claim Treasury Perk ➔'
    },
    {
      id: 'gusto_payroll',
      partner: 'Gusto Payroll',
      category: 'HR & Payroll',
      badge: 'Essential',
      offer: 'Automate Employee & Contractor Payroll + $200 Gift Card',
      description: 'Automated federal, state, and local payroll tax filings, healthcare benefits, and direct deposits. Used by over 300,000 growing businesses.',
      value: '$200 Onboarding Reward',
      url: 'https://gusto.com/',
      cta: 'Setup Automated Payroll ➔'
    },
    {
      id: 'stripe_atlas',
      partner: 'Stripe Atlas',
      category: 'Legal & Incorporation',
      badge: 'Verified',
      offer: 'Form Delaware C-Corp in 2 Days + $50k Credits',
      description: 'The global standard for startup legal formation. Issue founder stock with 83(b) tax elections, open bank account, and unlock $50,000 in AWS/Stripe fee waivers.',
      value: '$50,000+ Credits',
      url: 'https://stripe.com/atlas',
      cta: 'Incorporate Entity ➔'
    },
    {
      id: 'brex_card',
      partner: 'Brex',
      category: 'Corporate Cards',
      badge: 'Fintech',
      offer: 'Corporate Credit Cards with No Personal Guarantee',
      description: 'High-limit corporate cards with 10x-20x higher limits than traditional banks. Includes automated receipt matching and spend management software.',
      value: '$500 Spend Bonus',
      url: 'https://www.brex.com/',
      cta: 'Apply for Brex ➔'
    },
    {
      id: 'deel_global',
      partner: 'Deel',
      category: 'Global Hiring',
      badge: 'Global Scale',
      offer: 'Hire & Pay Contractors in 150+ Countries (20% Off)',
      description: 'Compliant contractor contracts, local tax withholding, and localized benefits for distributed remote engineering teams.',
      value: '20% Platform Discount',
      url: 'https://www.deel.com/',
      cta: 'Explore Global Hiring ➔'
    },
    {
      id: 'digitalocean_cloud',
      partner: 'DigitalOcean',
      category: 'Cloud Hosting',
      badge: 'Developer Cloud',
      offer: '$200 Free Developer Cloud Credits',
      description: 'Deploy production virtual machines (Droplets), Managed PostgreSQL databases, and serverless containers with transparent, predictable pricing.',
      value: '$200 Free Credits',
      url: 'https://www.digitalocean.com/',
      cta: 'Claim Cloud Credits ➔'
    }
  ];
  

  // --- MODULE: js/engine/faqs.js ---
  /**
   * Frequently Asked Questions (FAQ) & Structured Schema Generator
   * Targets Google Rich Snippets and Answer Box algorithms.
   */
  const FOUNDER_FAQS = [
    {
      question: 'How is startup runway calculated, and what is a safe buffer?',
      answer: 'Startup runway measures the number of months your company can operate before its cash reserves are depleted. It is calculated as: Total Cash Balance divided by Net Monthly Burn (where Net Burn = Gross Operating Expenses minus Monthly Recurring Revenue). Top venture investors recommend maintaining at least 18 to 24 months of runway with a 20% safety margin for market volatility.'
    },
    {
      question: 'What is Paul Graham\'s "Default Alive" framework?',
      answer: 'In 2015, Y Combinator co-founder Paul Graham introduced "Default Alive vs Default Dead". A startup is Default Alive if its revenue will grow to surpass expenses before its cash reserves hit zero. If revenue growth is too slow to reach profitability before running out of cash, the startup is Default Dead and will perish unless it raises external funding or cuts burn immediately.'
    },
    {
      question: 'What is a healthy CAC Payback Period for early-stage B2B SaaS?',
      answer: 'CAC Payback Period is the number of months required to recover the cost of acquiring a customer (CAC / Monthly Gross Profit per Customer). An elite benchmark is under 12 months, allowing a company to self-fund its customer acquisition engine. A payback period of 12 to 18 months is acceptable, while over 24 months creates severe working capital constraints.'
    },
    {
      question: 'How does the SaaS Rule of 40 work, and what is an elite score?',
      answer: 'The Rule of 40 states that a software company\'s combined annual revenue growth rate percentage and free cash flow margin percentage should equal or exceed 40%. For example, a startup growing at 55% with a -10% cash burn margin scores 45%, qualifying as an elite venture-grade business that balances growth with capital efficiency.'
    },
    {
      question: 'Why should founders apply a 15% employer tax buffer to salaries?',
      answer: 'Base employee salaries do not reflect the true cost of headcount. Employers must pay mandatory state and federal employment taxes (FICA, Medicare, FUTA, SUTA), worker\'s compensation insurance, payroll processing software fees, and basic healthcare benefits. A 15% overhead multiplier (Salary x 1.15) provides an accurate operational forecast.'
    },
    {
      question: 'How do venture capitalists calculate ARR valuation multiples in 2026/2027?',
      answer: 'In modern venture markets, enterprise software valuations are primarily determined as a multiple of Annual Recurring Revenue (ARR). Median private B2B SaaS multiples range between 6x and 9x ARR. However, companies exceeding the Rule of 40 with net dollar retention over 120% command premium multiples of 12x to 20x ARR.'
    }
  ];
  function generateFAQSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': FOUNDER_FAQS.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    };
  }
  

  // --- MODULE: js/engine/audio.js ---
  /**
   * Budof Procedural Sound Engine
   * Synthesizes crisp, professional UI and Tycoon sound effects using Web Audio API.
   * Zero external audio files required.
   */
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = typeof localStorage !== 'undefined' ? localStorage.getItem('budof_muted') === 'true' : false;
      this._bindUnlock();
    }
  
    _bindUnlock() {
      if (typeof window === 'undefined') return;
      const unlock = () => {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      };
      window.addEventListener('click', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
      window.addEventListener('touchstart', unlock, { once: true, passive: true });
    }
  
    _ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
  
    toggleMute() {
      this.muted = !this.muted;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('budof_muted', this.muted);
      }
      return this.muted;
    }
  
    playTurnTick() {
      if (this.muted) return;
      this._ensureContext();
      if (!this.ctx) return;
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
  
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
  
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  
      osc.connect(gain);
      gain.connect(this.ctx.destination);
  
      osc.start(now);
      osc.stop(now + 0.08);
    }
  
    playCashRegister() {
      if (this.muted) return;
      this._ensureContext();
      if (!this.ctx) return;
  
      const now = this.ctx.currentTime;
      // Two-tone cheerful coin jingle
      [1046.5, 1318.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.09;
  
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
  
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
  
        osc.connect(gain);
        gain.connect(this.ctx.destination);
  
        osc.start(startTime);
        osc.stop(startTime + 0.18);
      });
    }
  
    playCrisisChime() {
      if (this.muted) return;
      this._ensureContext();
      if (!this.ctx) return;
  
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
  
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.25);
  
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  
      osc.connect(gain);
      gain.connect(this.ctx.destination);
  
      osc.start(now);
      osc.stop(now + 0.25);
    }
  
    playVictoryJingle() {
      if (this.muted) return;
      this._ensureContext();
      if (!this.ctx) return;
  
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;
  
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteTime = now + (i * 0.1);
  
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);
  
        gain.gain.setValueAtTime(0.15, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
  
        osc.connect(gain);
        gain.connect(this.ctx.destination);
  
        osc.start(noteTime);
        osc.stop(noteTime + 0.25);
      });
    }
  }
  

  // --- MODULE: js/engine/tycoon-events.js ---
  /**
   * 20+ Real-World Startup Tycoon Events & Strategic Dilemmas
   */
  const STARTUP_EVENTS = [
    {
      id: 'hn_viral_launch',
      title: 'Top Spot on Hacker News & Product Hunt!',
      badge: 'Viral Traction',
      badgeColor: 'emerald',
      description: 'Your open-source benchmark post hit #1 on Hacker News and went viral on X (Twitter). Servers are groaning under 50,000 visitors.',
      condition: (state) => state.month >= 2 && state.productQuality >= 50,
      choices: [
        {
          label: 'Auto-Scale Cloud Infrastructure immediately ($2,500 cost)',
          description: 'Absorb the surge gracefully and capture paying enterprise signups.',
          apply: (state) => {
            const newMRR = Math.round(state.mrr * 0.35 + 1800);
            const newCustomers = 120;
            return {
              deltas: { cash: -2500, mrr: newMRR, customers: newCustomers, productQuality: +5 },
              message: `Cloud auto-scaled successfully! Converted 120 new paying customers (+$${newMRR} MRR).`
            };
          }
        },
        {
          label: 'Stay on free/cheaper tier, let some traffic 504 error ($0 cost)',
          description: 'Save cash reserves and capture whatever signups trickle through.',
          apply: (state) => {
            const newMRR = 600;
            return {
              deltas: { cash: 0, mrr: newMRR, customers: 35, productQuality: -8 },
              message: `Free servers crashed intermittently. Captured 35 customers (+$${newMRR} MRR), but user sentiment took a hit.`
            };
          }
        }
      ]
    },
    {
      id: 'cloud_outage_sla',
      title: 'Major Cloud Provider Outage (6 Hours Down)',
      badge: 'Critical Incident',
      badgeColor: 'crimson',
      description: 'Your main database region suffered a rare catastrophic network partition. High-tier clients are furious.',
      condition: (state) => state.month >= 4 && state.customers >= 30,
      choices: [
        {
          label: 'Issue 50% invoice credits & publish transparent post-mortem',
          description: 'Spend cash to protect trust and retain clients long-term.',
          apply: (state) => {
            const refundCost = Math.round(state.mrr * 0.4);
            return {
              deltas: { cash: -refundCost, mrr: 0, customers: 0, productQuality: +4 },
              message: `Customers praised your world-class transparency! 0 clients churned; refunded $${refundCost}.`
            };
          }
        },
        {
          label: 'Blame the cloud vendor in an email blast and issue no refunds',
          description: 'Preserve cash reserve at the risk of customer churn.',
          apply: (state) => {
            const churnCustomers = Math.max(3, Math.round(state.customers * 0.12));
            const lostMRR = Math.round(state.mrr * 0.12);
            return {
              deltas: { cash: 0, mrr: -lostMRR, customers: -churnCustomers, productQuality: -10 },
              message: `${churnCustomers} angry customers cancelled their subscriptions (-$${lostMRR} MRR).`
            };
          }
        }
      ]
    },
    {
      id: 'fortune500_pilot',
      title: 'Fortune 500 Enterprise Pilot Inbound',
      badge: 'Enterprise Sales',
      badgeColor: 'emerald',
      description: 'A global logistics conglomerate wants an annual pilot with custom Single Sign-On (SAML/Okta) and dedicated audit logs.',
      condition: (state) => state.month >= 5 && state.mrr >= 4000,
      choices: [
        {
          label: 'Commit engineering sprint to build SAML SSO ($5k dev cost)',
          description: 'Lock in a lucrative enterprise annual deal ($36,000 upfront ARR).',
          apply: (state) => {
            return {
              deltas: { cash: +31000, mrr: +3000, customers: +1, productQuality: +8 },
              message: `Contract signed! Pocketed $36k upfront cash ($31k net after dev costs) +$3,000 MRR!`
            };
          }
        },
        {
          label: 'Politely decline; stay focused on self-serve SMBs ($0 cost)',
          description: 'Avoid enterprise customization distractions and keep product simple.',
          apply: (state) => {
            return {
              deltas: { cash: 0, mrr: +400, customers: +10, productQuality: +3 },
              message: 'Maintained pure self-serve focus. Picked up 10 standard SMB accounts.'
            };
          }
        }
      ]
    },
    {
      id: 'poach_engineer',
      title: 'Lead Architect Headhunted by Big Tech',
      badge: 'Talent Retention',
      badgeColor: 'amber',
      description: 'Google Cloud recruiters offered your lead architect a $350k total compensation package. They gave you 48 hours to counter.',
      condition: (state) => state.team.engineers >= 1,
      choices: [
        {
          label: 'Counter with a $2,000/mo salary raise + 1.5% equity grant',
          description: 'Retain crucial architecture knowledge and keep product velocity high.',
          apply: (state) => {
            return {
              deltas: { cash: -2000, mrr: 0, customers: 0, productQuality: +10 },
              message: 'Lead architect accepted the counter! Team morale and velocity surged.'
            };
          }
        },
        {
          label: 'Wish them the best and let them depart',
          description: 'Save cash burn, but lose engineering velocity for 2-3 months.',
          apply: (state) => {
            return {
              deltas: { cash: 0, mrr: 0, customers: 0, productQuality: -15 },
              message: 'Lead architect departed. Code velocity slowed down significantly until replaced.'
            };
          }
        }
      ]
    },
    {
      id: 'vc_safe_offer',
      title: 'Prominent VC Offers $250k Angel SAFE',
      badge: 'Capital Infusion',
      badgeColor: 'emerald',
      description: 'A top Silicon Valley angel syndicate is impressed by your growth and offers a $250,000 post-money SAFE at a $4M valuation cap.',
      condition: (state) => state.month >= 6 && state.mrr >= 5000 && state.cash < 80000,
      choices: [
        {
          label: 'Accept the $250k investment (Dilute ~6% equity)',
          description: 'Inject massive cash runway to supercharge hiring and marketing.',
          apply: (state) => {
            return {
              deltas: { cash: +250000, mrr: 0, customers: 0, productQuality: +5 },
              message: '$250,000 wired to your business account! Runway extended by 18+ months.'
            };
          }
        },
        {
          label: 'Reject the offer; stay 100% bootstrapped & independent',
          description: 'Retain 100% equity ownership and control your own destiny.',
          apply: (state) => {
            return {
              deltas: { cash: 0, mrr: +500, customers: 0, productQuality: +2 },
              message: 'Kept 100% founder equity. Bootstrapped discipline pushes you harder toward profitability.'
            };
          }
        }
      ]
    },
    {
      id: 'price_increase_test',
      title: 'Pricing Strategy: Bold 30% Price Increase',
      badge: 'Pricing Elasticity',
      badgeColor: 'slate',
      description: 'Customer feedback indicates your software delivers 10x the value of what you charge. Your advisor suggests raising prices on new signups.',
      condition: (state) => state.month >= 7 && state.productQuality >= 65,
      choices: [
        {
          label: 'Grandfather existing users, raise new plans by 30%',
          description: 'Standard SaaS playbook: maximize ARPU without angering early advocates.',
          apply: (state) => {
            const mrrBoost = Math.round(state.mrr * 0.22);
            return {
              deltas: { cash: 0, mrr: +mrrBoost, customers: +15, productQuality: +2 },
              message: `Price increase succeeded! Higher willingness to pay boosted MRR by +$${mrrBoost}.`
            };
          }
        },
        {
          label: 'Keep prices low to maximize market share & volume',
          description: 'Prioritize rapid user acquisition over short-term revenue.',
          apply: (state) => {
            return {
              deltas: { cash: 0, mrr: +750, customers: +45, productQuality: 0 },
              message: 'Maintained aggressive discount pricing. Influx of 45 budget-conscious users.'
            };
          }
        }
      ]
    },
    {
      id: 'security_vulnerability',
      title: 'Responsible Security Disclosure Received',
      badge: 'Security Alert',
      badgeColor: 'amber',
      description: 'An ethical security researcher submitted a private report showing an IDOR flaw in your API export endpoint.',
      condition: (state) => state.month >= 3,
      choices: [
        {
          label: 'Pay $1,500 bug bounty & deploy fix in 12 hours',
          description: 'Reward the researcher and ensure bulletproof security compliance.',
          apply: (state) => {
            return {
              deltas: { cash: -1500, mrr: 0, customers: 0, productQuality: +8 },
              message: 'Researcher publicly thanked your rapid patch response. Security posture strengthened.'
            };
          }
        },
        {
          label: 'Silently patch the bug without paying a bounty',
          description: 'Save cash, but risk disgruntled researcher leaking the flaw.',
          apply: (state) => {
            const leakRisk = Math.random() < 0.4;
            if (leakRisk) {
              const churnMRR = Math.round(state.mrr * 0.1);
              return {
                deltas: { cash: 0, mrr: -churnMRR, customers: -8, productQuality: -12 },
                message: 'Researcher leaked details on Mastodon! Lost 8 security-conscious customers (-$' + churnMRR + ' MRR).'
              };
            }
            return {
              deltas: { cash: 0, mrr: 0, customers: 0, productQuality: +2 },
              message: 'Patched quietly. Researcher grumbled but moved on. Saved $1,500.'
            };
          }
        }
      ]
    },
    {
      id: 'influencer_endorsement',
      title: 'Top Industry Creator Reviews Your Product',
      badge: 'Organic Viral Surge',
      badgeColor: 'emerald',
      description: 'A respected SaaS educator with 250,000 YouTube subscribers made an unpaid, glowing review of your workflow.',
      condition: (state) => state.month >= 6 && state.productQuality >= 70,
      choices: [
        {
          label: 'Sponsor their next video with a dedicated promo code ($3,000)',
          description: 'Double down on the hot lead source while attention is peaked.',
          apply: (state) => {
            const mrrGain = 2400;
            return {
              deltas: { cash: -3000, mrr: +mrrGain, customers: +70, productQuality: +3 },
              message: `Sponsored video drove 70 high-converting signups! (+$${mrrGain} MRR).`
            };
          }
        },
        {
          label: 'Simply tweet a thank-you note and ride the organic wave ($0)',
          description: 'Capitalize on pure free publicity without spending cash.',
          apply: (state) => {
            const mrrGain = 1100;
            return {
              deltas: { cash: 0, mrr: +mrrGain, customers: +35, productQuality: +2 },
              message: `Organic surge brought in 35 new accounts (+$${mrrGain} MRR) for $0 marketing spend.`
            };
          }
        }
      ]
    },
    {
      id: 'ai_copilot_feature',
      title: 'R&D Breakthrough: Autonomous Workflow Assistant',
      badge: 'Product Innovation',
      badgeColor: 'emerald',
      description: 'Your team built an in-browser AI helper that saves users 3 hours every week. Beta testers are obsessed.',
      condition: (state) => state.team.engineers >= 2 && state.productQuality >= 70,
      choices: [
        {
          label: 'Launch as an exclusive Add-On ($20/mo per seat)',
          description: 'Create an entirely new recurring revenue stream from current users.',
          apply: (state) => {
            const boost = Math.round(state.mrr * 0.28);
            return {
              deltas: { cash: 0, mrr: +boost, customers: 0, productQuality: +12 },
              message: `40% of existing accounts activated the AI add-on! Added +$${boost} MRR instantly!`
            };
          }
        },
        {
          label: 'Bundle free into standard tier to crush competitors',
          description: 'Increase competitive moat and reduce customer churn.',
          apply: (state) => {
            return {
              deltas: { cash: 0, mrr: +800, customers: +30, productQuality: +20 },
              message: 'Users called it the most generous software upgrade ever. Churn fell by 40%!'
            };
          }
        }
      ]
    },
    {
      id: 'remote_first_transition',
      title: 'Office Lease Expiring: Go 100% Remote?',
      badge: 'Operational Efficiency',
      badgeColor: 'slate',
      description: 'Your shared office lease is up for renewal ($3,500/mo). The entire team prefers working remotely.',
      condition: (state) => state.month >= 4,
      choices: [
        {
          label: 'Shut down office; give everyone a $500/mo home stipend',
          description: 'Net savings of $2,000/mo in cash burn while boosting team happiness.',
          apply: (state) => {
            return {
              deltas: { cash: +2000, mrr: 0, customers: 0, productQuality: +4 },
              message: 'Transitioned to remote-first! Saved $2,000/mo in overhead and unlocked global hiring.'
            };
          }
        },
        {
          label: 'Renew office downtown to preserve in-person culture',
          description: 'Maintain whiteboarding synergy at the cost of high recurring burn.',
          apply: (state) => {
            return {
              deltas: { cash: -1500, mrr: 0, customers: 0, productQuality: +2 },
              message: 'Office renewed. High recurring rent continues to weigh on monthly cash balance.'
            };
          }
        }
      ]
    }
  ];
  

  // --- MODULE: js/engine/tycoon-game.js ---
  /**
   * 24-Month Startup Tycoon State Machine
   * Real-world turn-based startup operator simulation.
   */
  const SALARIES = {
    founder: 2500,
    engineer: 5000,
    marketer: 4000,
    sales: 4500
  };
  const ARPU_BASELINE = 50; // $50/mo blended SaaS ARPU
  class TycoonGame {
    constructor(initialConfig = {}) {
      this.reset(initialConfig);
    }
  
    reset(initialConfig = {}) {
      this.month = 1;
      this.maxMonths = 24;
      this.cash = initialConfig.startingCash ?? 120000;
      this.mrr = initialConfig.startingMRR ?? 3000;
      this.customers = initialConfig.startingCustomers ?? 60;
      this.productQuality = 65; // 0 to 100
      this.status = 'active'; // 'active' | 'bankrupt' | 'default_alive' | 'unicorn' | 'completed'
  
      this.team = {
        founders: 2,
        engineers: 1,
        marketers: 0,
        sales: 0
      };
  
      this.budget = {
        marketing: 1000,
        rAndD: 1000,
        ops: 800
      };
  
      this.history = [];
      this.pendingEvent = null;
      this.usedEventIds = new Set();
      this.equityDilutionPct = 0; // % surrendered to VCs
      this.roundsRaised = [];
  
      this._recordHistorySnapshot('Started Startup Journey');
    }
  
    getMonthlyPayroll() {
      // 15% benefits and employment tax factor on hired staff
      const founderPay = this.team.founders * SALARIES.founder;
      const engineerPay = this.team.engineers * SALARIES.engineer * 1.15;
      const marketerPay = this.team.marketers * SALARIES.marketer * 1.15;
      const salesPay = this.team.sales * SALARIES.sales * 1.15;
  
      return Math.round(founderPay + engineerPay + marketerPay + salesPay);
    }
  
    getMonthlyOpEx() {
      const payroll = this.getMonthlyPayroll();
      const discretionary = (this.budget.marketing || 0) + (this.budget.rAndD || 0) + (this.budget.ops || 0);
      return Math.round(payroll + discretionary);
    }
  
    getNetBurn() {
      return Math.round(this.getMonthlyOpEx() - this.mrr);
    }
  
    hire(role) {
      if (this.status !== 'active') return false;
      if (this.team[role] !== undefined) {
        this.team[role]++;
        return true;
      }
      return false;
    }
  
    fire(role) {
      if (this.status !== 'active') return false;
      if (role === 'founders' && this.team.founders <= 1) return false; // Minimum 1 founder
      if (this.team[role] && this.team[role] > 0) {
        this.team[role]--;
        return true;
      }
      return false;
    }
  
    setBudget(category, amount) {
      if (this.budget[category] !== undefined) {
        this.budget[category] = Math.max(0, Math.round(Number(amount) || 0));
      }
    }
  
    _recordHistorySnapshot(eventNote = '') {
      this.history.push({
        month: this.month,
        cash: Math.round(this.cash),
        mrr: Math.round(this.mrr),
        arr: Math.round(this.mrr * 12),
        customers: this.customers,
        netBurn: this.getNetBurn(),
        productQuality: this.productQuality,
        eventNote
      });
    }
  
    advanceTurn() {
      if (this.status !== 'active') return false;
      if (this.pendingEvent) {
        // Must resolve pending event first
        return false;
      }
  
      const netBurn = this.getNetBurn();
      this.cash -= netBurn;
  
      // 1. Engineering impact on Product Quality
      // Each engineer adds quality; R&D budget boosts velocity; baseline decay from tech debt
      const rdVelocity = (this.budget.rAndD / 1000) * 1.5;
      const engineerQualityGain = (this.team.engineers * 2.2) + rdVelocity - 0.8;
      this.productQuality = Math.max(15, Math.min(100, Math.round(this.productQuality + engineerQualityGain)));
  
      // 2. Churn Dynamics (Quality dampens churn)
      // Quality 100 -> ~1.5% churn; Quality 50 -> ~4.5% churn; Quality 20 -> ~7.5% churn
      const monthlyChurnRatePct = Math.max(1.2, 8.0 - (this.productQuality * 0.065));
      const churnedCustomers = Math.round(this.customers * (monthlyChurnRatePct / 100));
  
      // 3. Customer Acquisition
      // Organic leads depend on product quality and brand
      const organicLeads = 15 + Math.round(this.productQuality * 0.4);
      // Paid leads from marketing budget ($35 CAC per lead baseline)
      const paidLeads = Math.round((this.budget.marketing || 0) / 35);
      // Marketer synergy multiplier (+30% leads per growth marketer)
      const marketerMultiplier = 1 + (this.team.marketers * 0.35);
      const totalLeads = Math.round((organicLeads + paidLeads) * marketerMultiplier);
  
      // Sales Rep conversion boost (base self-serve conversion 5%, each sales rep closes +2.5% of leads into high-tier)
      const conversionRate = 0.05 + (this.team.sales * 0.025);
      const newCustomers = Math.max(1, Math.round(totalLeads * conversionRate));
  
      // Net Customer Change
      this.customers = Math.max(1, this.customers + newCustomers - churnedCustomers);
  
      // MRR Progression
      const newMRR = newCustomers * ARPU_BASELINE;
      const lostMRR = churnedCustomers * ARPU_BASELINE;
      this.mrr = Math.max(500, Math.round(this.mrr + newMRR - lostMRR));
  
      // Check for Bankrupt
      if (this.cash <= 0) {
        this.cash = 0;
        this.status = 'bankrupt';
        this._recordHistorySnapshot('Bankrupt: Cash reserves depleted');
        return { status: this.status, message: 'Game Over: Your company ran out of cash before reaching profitability.' };
      }
  
      // Check for milestone finish (Month 24)
      if (this.month >= this.maxMonths) {
        if (this.mrr >= 83334) { // $1,000,000 ARR
          this.status = 'unicorn';
          this._recordHistorySnapshot('Winner: Reached $1M ARR ($83.3k MRR)');
          return { status: this.status, message: 'Incredible Victory! You scaled past $1,000,000 ARR in 24 months!' };
        } else if (this.getNetBurn() <= 0) {
          this.status = 'default_alive';
          this._recordHistorySnapshot('Default Alive: Cash-flow positive & self-sustaining');
          return { status: this.status, message: 'Success! You built a self-sustaining, profitable SaaS business!' };
        } else {
          this.status = 'completed';
          this._recordHistorySnapshot('Completed 24-Month Runway');
          return { status: this.status, message: '24-Month Horizon Reached. You survived with positive cash!' };
        }
      }
  
      this.month++;
      this._recordHistorySnapshot(`Month ${this.month} Operations`);
  
      // Check for random event triggering (roughly every 2-3 months)
      this._triggerEligibleEvent();
  
      return {
        status: this.status,
        newCustomers,
        churnedCustomers,
        netBurn,
        pendingEvent: this.pendingEvent
      };
    }
  
    _triggerEligibleEvent() {
      // Only trigger if no pending event and random chance (~45% per turn)
      if (this.pendingEvent) return;
      if (Math.random() > 0.45 && this.month % 3 !== 0) return;
  
      const availableEvents = STARTUP_EVENTS.filter(e => {
        if (this.usedEventIds.has(e.id)) return false;
        if (typeof e.condition === 'function') {
          try {
            return e.condition(this);
          } catch {
            return false;
          }
        }
        return true;
      });
  
      if (availableEvents.length > 0) {
        const selected = availableEvents[Math.floor(Math.random() * availableEvents.length)];
        this.pendingEvent = selected;
        this.usedEventIds.add(selected.id);
      }
    }
  
    resolveEvent(choiceIndex) {
      if (!this.pendingEvent) return null;
      const choice = this.pendingEvent.choices[choiceIndex];
      if (!choice) return null;
  
      const result = choice.apply(this);
      if (result && result.deltas) {
        if (result.deltas.cash) this.cash += result.deltas.cash;
        if (result.deltas.mrr) this.mrr = Math.max(500, this.mrr + result.deltas.mrr);
        if (result.deltas.customers) this.customers = Math.max(1, this.customers + result.deltas.customers);
        if (result.deltas.productQuality) {
          this.productQuality = Math.max(10, Math.min(100, this.productQuality + result.deltas.productQuality));
        }
      }
  
      const eventTitle = this.pendingEvent.title;
      this.pendingEvent = null;
  
      // Check if event caused cash to dip <= 0
      if (this.cash <= 0) {
        this.cash = 0;
        this.status = 'bankrupt';
      }
  
      this._recordHistorySnapshot(`Event Resolved: ${eventTitle}`);
      return result;
    }
  
    pitchInvestors(roundType) {
      if (this.status !== 'active') {
        return { success: false, message: 'Cannot pitch investors in current game state.' };
      }
  
      const currentARR = this.mrr * 12;
  
      if (roundType === 'angel') {
        if (this.roundsRaised.includes('angel')) {
          return { success: false, message: 'Angel SAFE already raised in this journey.' };
        }
        // Angel criteria: Product Quality >= 55, MRR >= $3k
        if (this.mrr >= 3000 && this.productQuality >= 55) {
          this.cash += 150000;
          this.equityDilutionPct += 8;
          this.roundsRaised.push('angel');
          this._recordHistorySnapshot('Closed $150k Angel Round');
          return { success: true, message: 'Angel Syndicate signed! Wired $150,000 for 8% equity.', cashAdded: 150000 };
        } else {
          return { success: false, message: 'Angels passed: "Build more product traction and reach at least $3k MRR first."' };
        }
      }
  
      if (roundType === 'seed') {
        if (this.roundsRaised.includes('seed')) {
          return { success: false, message: 'Seed Round already completed.' };
        }
        // Seed criteria: MRR >= $15k, Quality >= 65
        if (this.mrr >= 15000 && this.productQuality >= 65) {
          this.cash += 600000;
          this.equityDilutionPct += 15;
          this.roundsRaised.push('seed');
          this._recordHistorySnapshot('Closed $600k Seed Round');
          return { success: true, message: 'Seed VC Term Sheet accepted! Added $600,000 cash for 15% equity.', cashAdded: 600000 };
        } else {
          return { success: false, message: 'Seed VCs passed: "Impressive progress, but we need to see $15k+ MRR and proven unit economics."' };
        }
      }
  
      if (roundType === 'seriesA') {
        if (this.roundsRaised.includes('seriesA')) {
          return { success: false, message: 'Series A already completed.' };
        }
        // Series A criteria: MRR >= $50k ($600k ARR), Quality >= 75
        if (this.mrr >= 50000 && this.productQuality >= 75) {
          this.cash += 2500000;
          this.equityDilutionPct += 20;
          this.roundsRaised.push('seriesA');
          this._recordHistorySnapshot('Closed $2.5M Series A Round');
          return { success: true, message: 'Tier-1 Silicon Valley VC led $2.5M Series A! Surrendered 20% equity.', cashAdded: 2500000 };
        } else {
          return { success: false, message: 'Series A Partners passed: "Need $600k+ ARR ($50k MRR) with top-quartile retention metrics to lead Series A."' };
        }
      }
  
      return { success: false, message: 'Unknown investment round selected.' };
    }
  }
  

  // --- MODULE: js/engine/chart-renderer.js ---
  /**
   * High-Performance HTML5 Canvas Chart Engine
   * Lightweight (<10KB), Zero-dependency, 60-FPS, Retina / 4K ready.
   */
  class FinancialChartRenderer {
    constructor(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d');
      this.data = [];
      this.hoverIndex = null;
  
      this._bindEvents();
    }
  
    _bindEvents() {
      this.canvas.addEventListener('mousemove', (e) => {
        this._handlePointerMove(e.clientX, e.clientY);
      });
  
      this.canvas.addEventListener('mouseleave', () => {
        this.hoverIndex = null;
        this.render();
      });
  
      this.canvas.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          this._handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });
  
      window.addEventListener('resize', () => {
        this.render();
      });
    }
  
    _handlePointerMove(clientX, clientY) {
      if (!this.data || this.data.length === 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const paddingLeft = 60;
      const paddingRight = 30;
      const chartWidth = rect.width - paddingLeft - paddingRight;
  
      if (x >= paddingLeft && x <= rect.width - paddingRight) {
        const step = chartWidth / (this.data.length - 1);
        const index = Math.round((x - paddingLeft) / step);
        if (index >= 0 && index < this.data.length && this.hoverIndex !== index) {
          this.hoverIndex = index;
          this.render();
        }
      }
    }
  
    setData(monthlyProjections) {
      this.data = monthlyProjections || [];
      this.render();
    }
  
    render() {
      if (!this.canvas || !this.ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 340;
  
      // Set physical canvas pixel dimensions for crisp Retina display
      if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
      }
  
      const ctx = this.ctx;
      ctx.save();
      ctx.scale(dpr, dpr);
  
      // Clear background
      ctx.clearRect(0, 0, width, height);
  
      if (!this.data || this.data.length < 2) {
        ctx.restore();
        return;
      }
  
      const padding = { top: 25, right: 30, bottom: 40, left: 65 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
  
      // Find min and max cash / burn / revenue values
      let minVal = 0;
      let maxVal = 10000;
  
      for (const d of this.data) {
        if (d.endingCash < minVal) minVal = d.endingCash;
        if (d.endingCash > maxVal) maxVal = d.endingCash;
        if (d.revenue > maxVal) maxVal = d.revenue;
        if (d.grossBurn > maxVal) maxVal = d.grossBurn;
      }
  
      // Add 15% breathing room
      maxVal = maxVal * 1.15;
      if (minVal < 0) minVal = minVal * 1.15;
  
      const valRange = maxVal - minVal || 1;
      const getY = (val) => padding.top + chartHeight - ((val - minVal) / valRange) * chartHeight;
      const getX = (idx) => padding.left + (idx / (this.data.length - 1)) * chartWidth;
  
      // 1. Draw horizontal gridlines & Y-axis labels
      const gridSteps = 5;
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#64748B';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
  
      for (let i = 0; i <= gridSteps; i++) {
        const val = minVal + (valRange / gridSteps) * i;
        const y = getY(val);
  
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
  
        ctx.fillText(formatCompactCurrency(val), padding.left - 8, y);
      }
  
      // 2. Draw Zero Baseline if within range
      if (minVal <= 0 && maxVal >= 0) {
        const zeroY = getY(0);
        ctx.beginPath();
        ctx.strokeStyle = '#DC2626'; // Crisp Crimson zero-cash line
        ctx.lineWidth = 1.5;
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(width - padding.right, zeroY);
        ctx.stroke();
  
        ctx.fillStyle = '#DC2626';
        ctx.font = '10px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('CRITICAL ZERO CASH', width - padding.right - 105, zeroY - 6);
      }
  
      // 3. Draw Cash Reserve Area & Line
      // Area gradient
      const cashGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      cashGradient.addColorStop(0, 'rgba(5, 150, 105, 0.28)'); // Emerald
      cashGradient.addColorStop(0.8, 'rgba(5, 150, 105, 0.05)');
      cashGradient.addColorStop(1, 'rgba(239, 68, 68, 0.15)');
  
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(this.data[0].endingCash));
      for (let i = 1; i < this.data.length; i++) {
        ctx.lineTo(getX(i), getY(this.data[i].endingCash));
      }
      // Close path along baseline
      const zeroBaseY = Math.min(padding.top + chartHeight, Math.max(padding.top, getY(0)));
      ctx.lineTo(getX(this.data.length - 1), zeroBaseY);
      ctx.lineTo(getX(0), zeroBaseY);
      ctx.closePath();
      ctx.fillStyle = cashGradient;
      ctx.fill();
  
      // Cash stroke line
      ctx.beginPath();
      ctx.strokeStyle = '#059669'; // Forest Emerald
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(getX(0), getY(this.data[0].endingCash));
      for (let i = 1; i < this.data.length; i++) {
        ctx.lineTo(getX(i), getY(this.data[i].endingCash));
      }
      ctx.stroke();
  
      // 4. Draw Revenue Line (Dashed Emerald)
      ctx.beginPath();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.moveTo(getX(0), getY(this.data[0].revenue));
      for (let i = 1; i < this.data.length; i++) {
        ctx.lineTo(getX(i), getY(this.data[i].revenue));
      }
      ctx.stroke();
      ctx.setLineDash([]);
  
      // 5. Draw Gross Burn Line (Slate)
      ctx.beginPath();
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1.8;
      ctx.moveTo(getX(0), getY(this.data[0].grossBurn));
      for (let i = 1; i < this.data.length; i++) {
        ctx.lineTo(getX(i), getY(this.data[i].grossBurn));
      }
      ctx.stroke();
  
      // 6. X-Axis Month Labels
      ctx.fillStyle = '#64748B';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
  
      const monthStep = this.data.length <= 12 ? 1 : this.data.length <= 24 ? 2 : 4;
      for (let i = 0; i < this.data.length; i += monthStep) {
        const x = getX(i);
        ctx.fillText(`M${this.data[i].month}`, x, padding.top + chartHeight + 10);
      }
  
      // 7. Render Hover Crosshair & Tooltip
      if (this.hoverIndex !== null && this.data[this.hoverIndex]) {
        const pt = this.data[this.hoverIndex];
        const hx = getX(this.hoverIndex);
        const hyCash = getY(pt.endingCash);
  
        // Vertical guide line
        ctx.beginPath();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.moveTo(hx, padding.top);
        ctx.lineTo(hx, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);
  
        // Point circle on Cash
        ctx.beginPath();
        ctx.arc(hx, hyCash, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = pt.endingCash <= 0 ? '#DC2626' : '#059669';
        ctx.lineWidth = 3;
        ctx.stroke();
  
        // Tooltip Card
        const tipWidth = 160;
        const tipHeight = 78;
        let tipX = hx + 12;
        if (tipX + tipWidth > width - padding.right) {
          tipX = hx - tipWidth - 12;
        }
        let tipY = Math.max(padding.top + 5, Math.min(hyCash - 40, height - padding.bottom - tipHeight));
  
        // Tooltip background
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        ctx.roundRect(tipX, tipY, tipWidth, tipHeight, 8);
        ctx.fill();
        ctx.shadowColor = 'transparent';
  
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.stroke();
  
        // Tooltip text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
  
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 11px "Inter", sans-serif';
        ctx.fillText(`Month ${pt.month} Snapshot`, tipX + 10, tipY + 8);
  
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = pt.endingCash <= 0 ? '#DC2626' : '#059669';
        ctx.fillText(`Cash: ${formatCompactCurrency(pt.endingCash)}`, tipX + 10, tipY + 26);
  
        ctx.fillStyle = '#10B981';
        ctx.fillText(`Rev:  ${formatCompactCurrency(pt.revenue)}`, tipX + 10, tipY + 42);
  
        ctx.fillStyle = '#64748B';
        ctx.fillText(`Burn: ${formatCompactCurrency(pt.grossBurn)}`, tipX + 10, tipY + 58);
      }
  
      ctx.restore();
    }
  }
  

  // --- MODULE: js/utils/exporter.js ---
  /**
   * 1-Click Executive PDF Board Report & CSV Financial Model Generator
   */
  function exportRunwayToCSV(runwayResult, currency = '$') {
    if (!runwayResult || !runwayResult.monthlyProjections) {
      alert('No projection data available to export.');
      return;
    }
  
    const headers = ['Month', `Revenue (${currency})`, `Payroll (${currency})`, `OpEx (${currency})`, `Gross Burn (${currency})`, `Net Burn (${currency})`, `Ending Cash (${currency})`, 'Status'];
    const rows = runwayResult.monthlyProjections.map(p => [
      `Month ${p.month}`,
      p.revenue,
      p.payroll,
      p.opex,
      p.grossBurn,
      p.netBurn,
      p.endingCash,
      p.isBankrupt ? 'Bankrupt' : p.isProfitable ? 'Cash-Flow Positive' : 'Burning Cash'
    ]);
  
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `budof-financial-model-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  function prepareAndPrintBoardReport(companyName, runwayResult, unitEconomicsResult, headcount) {
    const container = document.getElementById('executive-board-report');
    if (!container || !runwayResult) {
      window.print();
      return;
    }
  
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const compName = (companyName || '').trim() || 'Tech Startup Inc.';
  
    const isAlive = runwayResult.isDefaultAlive;
    const runwayText = formatMonths(runwayResult.runwayMonths);
    const zeroDateText = runwayResult.zeroCashMonth ? `Month ${runwayResult.zeroCashMonth}` : 'Default Alive (Infinite)';
  
    let headcountRows = '';
    if (Array.isArray(headcount)) {
      headcountRows = headcount.map(h => `
        <tr>
          <td><strong>${h.role}</strong></td>
          <td class="mono">${formatCurrency(h.monthlySalary)}/mo</td>
          <td class="mono">Month ${h.startMonth}+</td>
          <td class="mono">${formatCurrency(Math.round(h.monthlySalary * 1.15))}/mo</td>
        </tr>
      `).join('');
    }
  
    let tableRows = '';
    runwayResult.monthlyProjections.forEach(p => {
      tableRows += `
        <tr>
          <td class="mono">M${p.month}</td>
          <td class="mono">${formatCurrency(p.revenue)}</td>
          <td class="mono">${formatCurrency(p.payroll)}</td>
          <td class="mono">${formatCurrency(p.opex)}</td>
          <td class="mono">${formatCurrency(p.grossBurn)}</td>
          <td class="mono" style="color:${p.netBurn <= 0 ? '#059669' : '#DC2626'};">${formatCurrency(p.netBurn)}</td>
          <td class="mono" style="font-weight:700;">${formatCurrency(p.endingCash)}</td>
          <td>${p.isBankrupt ? 'Bankrupt' : p.isProfitable ? 'Profitable' : 'Burning'}</td>
        </tr>
      `;
    });
  
    let diagNotes = '';
    if (unitEconomicsResult && Array.isArray(unitEconomicsResult.diagnosis)) {
      diagNotes = unitEconomicsResult.diagnosis.map(d => `<li><strong>${d.metric}:</strong> ${d.text}</li>`).join('');
    }
  
    container.innerHTML = `
      <div class="print-report-wrapper">
        <div class="print-header">
          <div>
            <h1 style="font-size:22px; font-weight:800; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Executive Board Financial Memorandum</h1>
            <p style="font-size:12px; color:#64748B; margin-top:2px;">CONFIDENTIAL • PREPARED FOR INVESTORS & DIRECTORS</p>
          </div>
          <div style="text-align:right;">
            <strong style="font-size:16px; color:#059669;">${compName}</strong>
            <p style="font-size:11px; color:#64748B;">Audit Date: ${dateStr}</p>
          </div>
        </div>
  
        <div class="print-kpi-grid">
          <div class="print-kpi-box">
            <span class="print-kpi-lbl">Runway Remaining</span>
            <strong class="print-kpi-val" style="color:${isAlive ? '#059669' : '#DC2626'};">${runwayText}</strong>
            <span style="font-size:10px; color:#64748B;">Zero-Cash: ${zeroDateText}</span>
          </div>
          <div class="print-kpi-box">
            <span class="print-kpi-lbl">Baseline Net Burn</span>
            <strong class="print-kpi-val">${formatCurrency(runwayResult.initialNetBurn)}/mo</strong>
            <span style="font-size:10px; color:#64748B;">Gross: ${formatCurrency(runwayResult.monthlyProjections[0]?.grossBurn || 0)}</span>
          </div>
          <div class="print-kpi-box">
            <span class="print-kpi-lbl">LTV : CAC Ratio</span>
            <strong class="print-kpi-val" style="color:#059669;">${unitEconomicsResult?.ltvCacRatio || 'N/A'}x</strong>
            <span style="font-size:10px; color:#64748B;">Payback: ${unitEconomicsResult?.paybackMonths || 'N/A'} mos</span>
          </div>
          <div class="print-kpi-box">
            <span class="print-kpi-lbl">Rule of 40 Score</span>
            <strong class="print-kpi-val" style="color:#059669;">${unitEconomicsResult?.ruleOf40Score || 'N/A'}%</strong>
            <span style="font-size:10px; color:#64748B;">Growth + FCF Margin</span>
          </div>
        </div>
  
        <div style="margin-top:20px;">
          <h3 style="font-size:13px; font-weight:700; text-transform:uppercase; border-bottom:1px solid #CBD5E1; padding-bottom:4px; margin-bottom:8px;">Hiring & Compensation Matrix (+15% Tax Overhead)</h3>
          <table class="print-data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Base Salary</th>
                <th>Start Month</th>
                <th>Fully-Loaded Monthly Cost</th>
              </tr>
            </thead>
            <tbody>
              ${headcountRows}
            </tbody>
          </table>
        </div>
  
        <div style="margin-top:20px;">
          <h3 style="font-size:13px; font-weight:700; text-transform:uppercase; border-bottom:1px solid #CBD5E1; padding-bottom:4px; margin-bottom:8px;">Unit Economics Evaluation & Strategic Recommendations</h3>
          <ul style="font-size:11px; color:#334155; line-height:1.6; padding-left:18px;">
            ${diagNotes}
          </ul>
        </div>
  
        <div style="margin-top:20px; page-break-before:auto;">
          <h3 style="font-size:13px; font-weight:700; text-transform:uppercase; border-bottom:1px solid #CBD5E1; padding-bottom:4px; margin-bottom:8px;">36-Month Financial Ledger</h3>
          <table class="print-data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue</th>
                <th>Payroll</th>
                <th>OpEx</th>
                <th>Gross Burn</th>
                <th>Net Burn</th>
                <th>Ending Cash</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
  
        <div class="print-footer">
          <p>Generated by Budof Operational Finance Suite (budof.com) • Confidential Internal Document</p>
        </div>
      </div>
    `;
  
    setTimeout(() => {
      window.print();
    }, 100);
  }
  

  // --- MODULE: app.js ---
  /**
   * Budof — Master SPA Application Controller
   * High-performance, reactive financial simulation suite.
   */
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  // --- State Variables ---
  let chartRenderer = null;
  let currentRunwayResult = null;
  let currentUnitEconomicsResult = null;
  let activePresetKey = 'bootstrapped_profitable';
  let companyName = 'Acme Software Inc.';
  
  const soundEngine = new SoundEngine();
  const tycoon = new TycoonGame();
  
  let headcountData = JSON.parse(JSON.stringify(INDUSTRY_PRESETS.bootstrapped_profitable.headcount));
  
  // --- Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    setupCompanyAndCurrency();
    setupNavigation();
    setupPresets();
    setupRunwaySimulator();
    setupUnitEconomics();
    setupPricingCalculator();
    setupFounderCalculators();
    setupBenchmarksAndValuation();
    setupPerksDirectory();
    setupFAQAccordion();
    setupTycoonSimulator();
    setupExportAndLegal();
    handleUrlHash();
  });
  
  // --- Company Name & Currency Selector ---
  function setupCompanyAndCurrency() {
    const inputComp = document.getElementById('input-company-name');
    const selectCurr = document.getElementById('select-currency');
  
    if (typeof localStorage !== 'undefined') {
      const savedName = localStorage.getItem('budof_company_name');
      if (savedName) companyName = savedName;
      const savedCurr = localStorage.getItem('budof_currency');
      if (savedCurr) setCurrency(savedCurr);
    }
  
    if (inputComp) {
      inputComp.value = companyName;
      inputComp.addEventListener('input', (e) => {
        companyName = e.target.value;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('budof_company_name', companyName);
        }
      });
    }
  
    if (selectCurr) {
      selectCurr.value = getCurrency();
      selectCurr.addEventListener('change', (e) => {
        setCurrency(e.target.value);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('budof_currency', e.target.value);
        }
        triggerRunwayUpdate();
        triggerUnitEconomicsUpdate();
        triggerCalculatorsUpdate();
      });
    }
  }
  
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
  
    triggerCalculatorsUpdate();
  }
  
  let triggerRunwayUpdate = () => {};
  let triggerUnitEconomicsUpdate = () => {};
  let triggerCalculatorsUpdate = () => {};
  
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
  
      // Save to localStorage
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('budof_model_params', JSON.stringify({
            startingCash, currentMRR, monthlyGrowth, monthlyOpEx, headcountData
          }));
        } catch {}
      }
  
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
  
      // Refresh dynamic calculators
      triggerCalculatorsUpdate();
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
  
      currentUnitEconomicsResult = calculateUnitEconomics({
        cac,
        arpu,
        grossMarginPct: gm,
        monthlyChurnPct: churn,
        salesMarketingSpend: Number(inputSMSpend.value),
        netNewARRQuarter: Number(inputNetARR.value),
        annualGrowthRatePct: Number(inputGrowth.value),
        fcfMarginPct: Number(inputFCF.value)
      });
  
      const result = currentUnitEconomicsResult;
  
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
  
      document.getElementById('pricing-blended-arpu').textContent = `${getCurrency()}${result.blendedEffectiveARPU}`;
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
  
  // --- MODULE: HIGH-INTENT FOUNDER CALCULATORS ---
  function setupFounderCalculators() {
    // 1. Fundraising Target
    const sliderMonths = document.getElementById('calc-target-months');
    const sliderBuffer = document.getElementById('calc-safety-buffer');
    const displayTargetMonths = document.getElementById('display-target-months');
    const displaySafetyBuffer = document.getElementById('display-safety-buffer');
  
    // 2. Cap Table Dilution
    const inputPreMoney = document.getElementById('calc-pre-money');
    const inputInvestment = document.getElementById('calc-investment');
    const inputOptionPool = document.getElementById('calc-option-pool');
  
    // 3. Hiring Impact
    const inputSalary = document.getElementById('calc-new-salary');
  
    function update() {
      const netBurn = Math.abs(currentRunwayResult?.initialNetBurn || 15000);
      const months = Number(sliderMonths?.value || 18);
      const buffer = Number(sliderBuffer?.value || 20);
  
      if (displayTargetMonths) displayTargetMonths.textContent = `${months} mos`;
      if (displaySafetyBuffer) displaySafetyBuffer.textContent = `${buffer}%`;
  
      const fundResult = calculateFundraisingTarget({
        targetRunwayMonths: months,
        netMonthlyBurn: netBurn,
        safetyBufferPct: buffer
      });
  
      const elTotalRaise = document.getElementById('calc-res-total-raise');
      const elRoundTier = document.getElementById('calc-res-round-tier');
      const elImpliedPost = document.getElementById('calc-res-implied-post');
  
      if (elTotalRaise) elTotalRaise.textContent = formatCurrency(fundResult.totalTargetToRaise);
      if (elRoundTier) elRoundTier.textContent = `${fundResult.roundTier} (~${fundResult.typicalDilutionPct}% Dilution)`;
      if (elImpliedPost) elImpliedPost.textContent = formatCurrency(fundResult.impliedPostMoney);
  
      // Dilution update
      const pre = Number(inputPreMoney?.value || 4000000);
      const inv = Number(inputInvestment?.value || 1000000);
      const opt = Number(inputOptionPool?.value || 10);
  
      const dilResult = calculateEquityDilution({
        preMoneyValuation: pre,
        investmentAmount: inv,
        optionPoolPct: opt,
        founderCount: 2
      });
  
      const elPostVal = document.getElementById('calc-res-post-val');
      const elFounderEq = document.getElementById('calc-res-founder-eq');
      const elInvestorEq = document.getElementById('calc-res-investor-eq');
  
      if (elPostVal) elPostVal.textContent = formatCurrency(dilResult.postMoney);
      if (elFounderEq) elFounderEq.textContent = `${dilResult.founderEquityPct}% (${dilResult.equityPerFounder}% / co-founder)`;
      if (elInvestorEq) elInvestorEq.textContent = `${dilResult.investorOwnershipPct}% (+${dilResult.optionPoolPct}% Option Pool)`;
  
      // Hiring impact update
      const salary = Number(inputSalary?.value || 7500);
      const baseParams = {
        startingCash: Number(document.getElementById('input-starting-cash')?.value || 180000),
        currentMRR: Number(document.getElementById('input-current-mrr')?.value || 42000),
        monthlyGrowthRate: Number(document.getElementById('input-growth-rate')?.value || 5) / 100,
        monthlyOpEx: Number(document.getElementById('input-monthly-opex')?.value || 6500),
        headcount: headcountData
      };
  
      const hireResult = calculateHiringImpact(baseParams, { monthlySalary: salary });
  
      const elRunwayLost = document.getElementById('calc-res-runway-lost');
      const elLoadedCost = document.getElementById('calc-res-loaded-cost');
      const elBreakevenMRR = document.getElementById('calc-res-breakeven-mrr');
  
      if (elRunwayLost) elRunwayLost.textContent = typeof hireResult.runwayMonthsLost === 'number' ? `-${hireResult.runwayMonthsLost} months` : hireResult.runwayMonthsLost;
      if (elLoadedCost) elLoadedCost.textContent = `${formatCurrency(hireResult.fullyLoadedMonthlyCost)}/mo`;
      if (elBreakevenMRR) elBreakevenMRR.textContent = `+${formatCurrency(hireResult.requiredMRRToBreakeven)} MRR`;
    }
  
    triggerCalculatorsUpdate = update;
    [sliderMonths, sliderBuffer, inputPreMoney, inputInvestment, inputOptionPool, inputSalary].forEach(el => {
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
  
  // --- MODULE: FOUNDER PERKS DIRECTORY ---
  function setupPerksDirectory() {
    const container = document.getElementById('perks-grid-container');
    if (!container) return;
  
    container.innerHTML = '';
    FOUNDER_PERKS.forEach(p => {
      const card = document.createElement('div');
      card.className = 'perk-card';
      card.innerHTML = `
        <div>
          <div class="perk-header">
            <span class="perk-partner">${p.partner}</span>
            <span class="perk-badge">${p.badge}</span>
          </div>
          <div class="perk-offer">${p.offer}</div>
          <p class="perk-desc">${p.description}</p>
        </div>
        <div class="perk-footer">
          <span class="perk-value mono">${p.value}</span>
          <a href="${p.url}" target="_blank" rel="noopener sponsored" class="btn-primary" style="font-size:11px; padding:6px 12px; text-decoration:none;">${p.cta}</a>
        </div>
      `;
      container.appendChild(card);
    });
  }
  
  // --- MODULE: FAQ ACCORDION ---
  function setupFAQAccordion() {
    const container = document.getElementById('faqs-accordion-container');
    if (!container) return;
  
    container.innerHTML = '';
    FOUNDER_FAQS.forEach((faq, idx) => {
      const item = document.createElement('div');
      item.className = `faq-item ${idx === 0 ? 'open' : ''}`;
      item.innerHTML = `
        <button class="faq-question">
          <span>${faq.question}</span>
          <span style="font-size:16px; font-weight:700;">+</span>
        </button>
        <div class="faq-answer">${faq.answer}</div>
      `;
  
      item.querySelector('.faq-question').addEventListener('click', () => {
        item.classList.toggle('open');
        const icon = item.querySelector('.faq-question span:last-child');
        icon.textContent = item.classList.contains('open') ? '−' : '+';
      });
  
      container.appendChild(item);
    });
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
        exportRunwayToCSV(currentRunwayResult, getCurrency());
      }
    });
  
    document.getElementById('btn-print-report')?.addEventListener('click', () => {
      prepareAndPrintBoardReport(companyName, currentRunwayResult, currentUnitEconomicsResult, headcountData);
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
  

})();
