import { describe, expect, it } from 'vitest';
import { formatPriceWithReferenceChange, formatSignedPercent } from './formatters';

describe('formatSignedPercent', () => {
  it('adds a plus sign for positive percent changes', () => {
    expect(formatSignedPercent(100, 2)).toBe('+100%');
  });

  it('keeps the minus sign for negative percent changes', () => {
    expect(formatSignedPercent(-50, 2)).toBe('-50%');
  });

  it('shows zero without a sign', () => {
    expect(formatSignedPercent(0, 2)).toBe('0%');
  });
});

describe('formatPriceWithReferenceChange', () => {
  it('shows a negative change when the target price is below reference price', () => {
    expect(formatPriceWithReferenceChange(1000, 2000, 4, 2)).toBe('1,000.00 (-50%)');
  });

  it('shows a positive change when the target price is above reference price', () => {
    expect(formatPriceWithReferenceChange(2000, 1000, 4, 2)).toBe('2,000.00 (+100%)');
  });

  it('shows zero change when the target price equals reference price', () => {
    expect(formatPriceWithReferenceChange(1000, 1000, 4, 2)).toBe('1,000.00 (0%)');
  });

  it('omits the change when reference price is invalid', () => {
    expect(formatPriceWithReferenceChange(1000, 0, 4, 2)).toBe('1,000.00');
    expect(formatPriceWithReferenceChange(1000, Number.NaN, 4, 2)).toBe('1,000.00');
  });
});
