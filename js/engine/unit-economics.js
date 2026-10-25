/**
 * SaaS Unit Economics & Efficiency Engine
 * Computes LTV, CAC Payback, Magic Number, and Rule of 40 with clinical benchmarks.
 */

export function calculateUnitEconomics(params = {}) {
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
