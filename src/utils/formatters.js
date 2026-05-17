export function formatNumber(value, digits = 4) {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: value === 0 ? 0 : Math.min(digits, 2),
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value, digits = 4) {
  return `${formatNumber(value, digits)}%`;
}
