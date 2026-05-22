import { describe, expect, it } from 'vitest';
import { CONTRACT_SIDE_LONG, GRID_MODE_ARITHMETIC } from '../common/grid';
import { calculateSpotGrid } from './grid';

describe('calculateSpotGrid', () => {
  const validInput = {
    name: 'spot grid',
    lowerPrice: 100,
    upperPrice: 200,
    entryPrice: 150,
    currentPrice: 125,
    gridMode: GRID_MODE_ARITHMETIC,
    gridCount: 4,
    side: CONTRACT_SIDE_LONG,
    investment: 400,
    openOnCreate: false,
  };

  it('calculates a long spot grid position', () => {
    const result = calculateSpotGrid(validInput);

    expect(result.gridPrices).toEqual([100, 125, 150, 175, 200]);
    expect(result.perGridInvestment).toBe(100);
    expect(result.filledGridCount).toBe(1);
    expect(result.filledGridPrices).toEqual([125]);
    expect(result.positionQuantity).toBe(0.8);
    expect(result.averageEntryPrice).toBe(125);
    expect(result.floatingProfitLoss).toBe(0);
    expect(result.currentEquity).toBe(100);
    expect(result.gridProfitRate).toBe(25);
    expect(result.totalYieldRate).toBe(100);
  });

  it('rejects a blank strategy name', () => {
    expect(() => calculateSpotGrid({ ...validInput, name: '' })).toThrow();
  });

  it('rejects an invalid price range', () => {
    expect(() => calculateSpotGrid({ ...validInput, upperPrice: 100 })).toThrow();
  });

  it('rejects a non-integer grid count', () => {
    expect(() => calculateSpotGrid({ ...validInput, gridCount: 4.5 })).toThrow();
  });
});
