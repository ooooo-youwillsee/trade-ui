import { describe, expect, it } from 'vitest';
import { limitDecimalPlaces } from './inputFormatters';

describe('limitDecimalPlaces', () => {
  it('keeps values with up to four decimal places', () => {
    expect(limitDecimalPlaces('0.1234', 4)).toBe('0.1234');
    expect(limitDecimalPlaces('12', 4)).toBe('12');
    expect(limitDecimalPlaces('0.', 4)).toBe('0.');
  });

  it('truncates digits beyond four decimal places without rounding', () => {
    expect(limitDecimalPlaces('0.12345', 4)).toBe('0.1234');
    expect(limitDecimalPlaces('-12.34567', 4)).toBe('-12.3456');
  });

  it('supports price inputs with up to six decimal places', () => {
    expect(limitDecimalPlaces('0.123456', 6)).toBe('0.123456');
    expect(limitDecimalPlaces('0.1234567', 6)).toBe('0.123456');
  });

  it('normalizes nullish and numeric values to strings', () => {
    expect(limitDecimalPlaces(null, 4)).toBe('');
    expect(limitDecimalPlaces(1.2345, 4)).toBe('1.2345');
  });
});
