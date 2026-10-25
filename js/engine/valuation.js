/**
 * SaaS Valuation Multiple & Industry Benchmark Engine
 * Uses public & private B2B venture multiples based on Growth Rate and Rule of 40.
 */

export const SAAS_BENCHMARKS = [
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

export function calculateSaaSValuation(arr, growthRatePct, ruleOf40Pct) {
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
