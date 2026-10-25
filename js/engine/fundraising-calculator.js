/**
 * Startup Fundraising Target & Runway Extension Engine
 * Computes exact capital requirement for 12, 18, or 24 months of runway with safety buffers.
 */

export function calculateFundraisingTarget(params = {}) {
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
