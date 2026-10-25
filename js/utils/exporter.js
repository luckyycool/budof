/**
 * 1-Click Executive PDF and CSV Report Generator
 */

export function exportRunwayToCSV(runwayResult) {
  if (!runwayResult || !runwayResult.monthlyProjections) {
    alert('No projection data available to export.');
    return;
  }

  const headers = ['Month', 'Revenue ($)', 'Payroll ($)', 'OpEx ($)', 'Gross Burn ($)', 'Net Burn ($)', 'Ending Cash ($)', 'Status'];
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

export function printExecutiveReport() {
  window.print();
}
