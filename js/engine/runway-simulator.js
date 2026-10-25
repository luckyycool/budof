/**
 * Dynamic Runway & 36-Month Burn Forecaster Engine
 * Implements Paul Graham's "Default Alive / Default Dead" algorithm.
 */

export const TAX_BENEFITS_MULTIPLIER = 1.15; // 15% employer taxes, healthcare, payroll fees buffer

export function calculateRunway(params = {}) {
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
