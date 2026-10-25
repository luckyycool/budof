/**
 * Cap Table Equity Dilution & Pre/Post-Money Engine
 * Calculates investor ownership, unallocated employee option pool shuffle, and founder retention.
 */

export function calculateEquityDilution(params = {}) {
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
