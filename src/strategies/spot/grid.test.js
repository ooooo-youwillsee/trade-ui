import { describe, expect, it } from 'vitest';
import { CONTRACT_SIDE_LONG, GRID_MODE_ARITHMETIC } from '../common/grid';
import { calculateSpotGrid } from './grid';

// 现货网格测试重点覆盖持仓价值计算和输入校验。
describe('calculateSpotGrid', () => {
  // 基础输入不含杠杆字段，体现现货网格只按投入金额建仓。
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
