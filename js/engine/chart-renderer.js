/**
 * High-Performance HTML5 Canvas Chart Engine
 * Lightweight (<10KB), Zero-dependency, 60-FPS, Retina / 4K ready.
 */

import { formatCompactCurrency } from '../utils/formatters.js';

export class FinancialChartRenderer {
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
