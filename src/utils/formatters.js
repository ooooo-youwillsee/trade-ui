// 通用格式化工具：统一数值和百分比在页面中的展示方式。

// 数字格式化会兜底非法值，避免页面出现 NaN 或 Infinity。
export function formatNumber(value, digits = 4) {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: value === 0 ? 0 : Math.min(digits, 2),
    maximumFractionDigits: digits,
  }).format(value);
}

// 百分比字段由调用方传入百分数值，这里只负责复用数字格式并拼接百分号。
export function formatPercent(value, digits = 4) {
  return `${formatNumber(value, digits)}%`;
}

export function formatSignedPercent(value, digits = 2) {
  const prefix = Number.isFinite(value) && value > 0 ? '+' : '';
  if (!Number.isFinite(value)) return '-%';
  const formattedValue = new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: digits,
  }).format(value);
  return `${prefix}${formattedValue}%`;
}

export function formatPriceWithReferenceChange(price, referencePrice, priceDigits = 4, percentDigits = 2) {
  const formattedPrice = formatNumber(price, priceDigits);
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) return formattedPrice;

  const changePercent = ((price - referencePrice) / referencePrice) * 100;
  return `${formattedPrice} (${formatSignedPercent(changePercent, percentDigits)})`;
}
