/**
 * Formatters utility for financial numbers, percentages, currencies, and multi-currency support.
 */

let currentCurrency = '$';

export function setCurrency(symbol) {
  if (symbol && typeof symbol === 'string') {
    currentCurrency = symbol.trim();
  }
  return currentCurrency;
}

export function getCurrency() {
  return currentCurrency;
}

export function formatCurrency(amount, decimals = 0, currencyOverride = null) {
  if (typeof amount !== 'number' || isNaN(amount)) return `${currencyOverride || currentCurrency}0`;
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const symbol = currencyOverride || currentCurrency;
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatCompactCurrency(amount, currencyOverride = null) {
  if (typeof amount !== 'number' || isNaN(amount)) return `${currencyOverride || currentCurrency}0`;
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const symbol = currencyOverride || currentCurrency;

  let formatted = '';
  if (abs >= 1_000_000_000) {
    formatted = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  } else if (abs >= 1_000_000) {
    formatted = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (abs >= 1_000) {
    formatted = (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    formatted = abs.toFixed(0);
  }

  return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatPercent(val, decimals = 1) {
  if (typeof val !== 'number' || isNaN(val)) return '0%';
  return `${val.toFixed(decimals)}%`;
}

export function formatNumber(val, decimals = 0) {
  if (typeof val !== 'number' || isNaN(val)) return '0';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatMonths(months) {
  if (months === Infinity || months > 120) return 'Default Alive (∞)';
  if (months <= 0) return 'Depleted (0 mos)';
  if (months === 1) return '1.0 month';
  return `${months.toFixed(1)} months`;
}
