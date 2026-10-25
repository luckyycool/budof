/**
 * 1-Click Executive PDF Board Report & CSV Financial Model Generator
 */

import { formatCurrency, formatMonths } from './formatters.js';

export function exportRunwayToCSV(runwayResult, currency = '$') {
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

export function prepareAndPrintBoardReport(companyName, runwayResult, unitEconomicsResult, headcount) {
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
