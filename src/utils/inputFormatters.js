export function limitDecimalPlaces(value, decimalPlaces) {
  const normalizedValue = String(value ?? '');
  const decimalPointIndex = normalizedValue.indexOf('.');

  if (decimalPointIndex === -1) return normalizedValue;
  return normalizedValue.slice(0, decimalPointIndex + decimalPlaces + 1);
}
