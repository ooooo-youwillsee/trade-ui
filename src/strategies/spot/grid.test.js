import { describe, expect, it } from 'vitest';
import {
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_SHORT,
  GRID_MODE_ARITHMETIC,
} from '../common/grid';
import { calculateSpotGrid, normalizeSpotGridInput } from './grid';

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
    expect(result.positionQuantity).toBe(0.5);
    expect(result.averageEntryPrice).toBe(125);
    expect(result.floatingProfitLoss).toBe(0);
    expect(result.currentEquity).toBe(62.5);
    expect(result.gridProfitRate).toBe(25);
    expect(result.totalYieldRate).toBe(100);
  });

  it('keeps old inputs compatible when optional fields are omitted', () => {
    const result = calculateSpotGrid(validInput);

    expect(result.minTradeQuantity).toBe(0.01);
    expect(result.filledInvestment).toBe(62.5);
    expect(result.gridInvestments).toEqual([50, 62.5, 75, 87.5]);
    expect(normalizeSpotGridInput(validInput).feeRate).toBe(0.1);
  });

  it('infers ETH minimum trade quantity when the field is omitted', () => {
    expect(normalizeSpotGridInput({ ...validInput, name: 'ETH spot grid' }).minTradeQuantity).toBe(0.001);
  });

  it('allows a grid when fixed per-grid investment satisfies the minimum trade quantity at the highest price', () => {
    const result = calculateSpotGrid({
      ...validInput,
      investment: 20,
      gridCount: 4,
      upperPrice: 200,
      currentPrice: 100,
      minTradeQuantity: 0.01,
    });

    expect(result.perGridInvestment).toBe(5);
    expect(result.minimumPerGridQuantity).toBe(0.025);
    expect(result.tradableGridUnits).toBe(2);
    expect(result.tradablePerGridQuantity).toBe(0.02);
    expect(result.tradablePerGridInvestment).toBe(4);
    expect(result.unallocatedInvestment).toBe(4);
    expect(result.gridOrders.map((order) => order.quantity)).toEqual([0.02, 0.02, 0.02, 0.02]);
    expect(result.gridInvestments).toEqual([2, 2.5, 3, 3.5]);
    expect(result.gridOrders.map((order) => order.investment)).toEqual(result.gridInvestments);
  });

  it('rejects a grid when fixed per-grid investment is below the minimum trade quantity at the highest price', () => {
    expect(() =>
      calculateSpotGrid({
        ...validInput,
        investment: 100,
        gridCount: 4,
        upperPrice: 200,
        minTradeQuantity: 0.2,
      }),
    ).toThrow(/最小成交数量.*最大网格数.*最低投入/);
  });

  it('builds order rows with price, investment, and filled status', () => {
    const result = calculateSpotGrid(validInput);

    expect(result.gridOrders).toHaveLength(validInput.gridCount);
    expect(result.gridOrders.map((order) => order.price)).toEqual([100, 125, 150, 175]);
    expect(result.gridOrders.map((order) => order.investment)).toEqual(result.gridInvestments);
    expect(result.gridOrders.map((order) => order.quantity)).toEqual([0.5, 0.5, 0.5, 0.5]);
    expect(result.gridOrders.map((order) => order.filled)).toEqual([false, true, false, false]);
    expect(result.gridOrders.map((order) => order.grossProfitRate)).toEqual([
      25, 20, 16.666666666666664, 14.285714285714285,
    ]);
    [12.5, 12.5, 12.5, 12.5].forEach((profitAmount, index) => {
      expect(result.gridOrders[index].grossProfitAmount).toBeCloseTo(profitAmount);
    });
    expect(result.gridOrders[1]).not.toHaveProperty('profitRate');
    expect(result.gridOrders[1]).not.toHaveProperty('profitAmount');
    expect(result.feeRate).toBe(0.1);
    expect(result.gridOrders[1].grossProfitRate).toBe(20);
    expect(result.gridOrders[1].grossProfitAmount).toBeCloseTo(12.5);
    expect(result.gridOrders[1].netProfitAmount).toBeCloseTo(12.3625);
    expect(result.gridOrders[1].netProfitRate).toBeCloseTo(19.78);
  });

  it('uses an editable fee rate and keeps boundary orders at zero profit', () => {
    const result = calculateSpotGrid({ ...validInput, feeRate: 0.2 });
    const shortResult = calculateSpotGrid({
      ...validInput,
      side: CONTRACT_SIDE_SHORT,
      currentPrice: 175,
      feeRate: 0.2,
    });

    expect(result.feeRate).toBe(0.2);
    expect(result.gridOrders[1].netProfitAmount).toBeCloseTo(12.225);
    expect(result.gridOrders[1].netProfitRate).toBeCloseTo(19.56);
    expect(shortResult.gridOrders[0]).toMatchObject({
      grossProfitAmount: 0,
      grossProfitRate: 0,
      netProfitAmount: 0,
      netProfitRate: 0,
    });
  });

  it('rejects invalid fee rates', () => {
    expect(() => calculateSpotGrid({ ...validInput, feeRate: -0.01 })).toThrow('手续费率');
    expect(() => calculateSpotGrid({ ...validInput, feeRate: 100 })).toThrow('手续费率');
    expect(() => calculateSpotGrid({ ...validInput, feeRate: Number.NaN })).toThrow('手续费率');
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
