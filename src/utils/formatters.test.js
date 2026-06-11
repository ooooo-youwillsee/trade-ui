import { describe, expect, it } from 'vitest';
import { formatPriceWithCurrentChange, formatSignedPercent } from './formatters';

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

describe('formatPriceWithCurrentChange', () => {
  it('shows a negative change when the target price is below current price', () => {
    expect(formatPriceWithCurrentChange(1000, 2000, 4, 2)).toBe('1,000.00 (-50%)');
  });

  it('shows a positive change when the target price is above current price', () => {
    expect(formatPriceWithCurrentChange(2000, 1000, 4, 2)).toBe('2,000.00 (+100%)');
  });

  it('shows zero change when the target price equals current price', () => {
    expect(formatPriceWithCurrentChange(1000, 1000, 4, 2)).toBe('1,000.00 (0%)');
  });

  it('omits the change when current price is invalid', () => {
    expect(formatPriceWithCurrentChange(1000, 0, 4, 2)).toBe('1,000.00');
    expect(formatPriceWithCurrentChange(1000, Number.NaN, 4, 2)).toBe('1,000.00');
  });
});
