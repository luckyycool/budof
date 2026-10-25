/**
 * SaaS Tier Pricing Elasticity & Cash vs ARR Engine
 */

export function calculatePricingTiers(params = {}) {
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
