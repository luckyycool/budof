/**
 * Hiring Runway Impact & Zero-Cash Delta Engine
 * Calculates the exact number of runway months consumed when hiring a new team member.
 */

import { calculateRunway, TAX_BENEFITS_MULTIPLIER } from './runway-simulator.js';

export function calculateHiringImpact(baseParams = {}, newRole = {}) {
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
