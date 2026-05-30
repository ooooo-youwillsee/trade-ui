import { describe, expect, it } from 'vitest';
import {
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_SHORT,
  GRID_MODE_ARITHMETIC,
  POSITION_INCREMENT_RATIO,
} from '../common/grid';
import { calculateContractGrid } from './grid';

// 合约网格测试重点覆盖保证金、名义价值、强平价和做空收益率。
describe('calculateContractGrid', () => {
  // 基础输入保持简单整数，方便断言每格价格和仓位数量。
  const validInput = {
    name: 'contract grid',
    lowerPrice: 100,
    upperPrice: 200,
    entryPrice: 150,
    currentPrice: 125,
    openOnCreate: false,
    gridMode: GRID_MODE_ARITHMETIC,
    gridCount: 4,
    side: CONTRACT_SIDE_LONG,
    leverage: 5,
    investment: 400,
    additionalInvestment: 100,
  };

  it('calculates margin, notional, liquidation, and profit rates for a long grid', () => {
    const result = calculateContractGrid(validInput);

    expect(result.gridPrices).toEqual([100, 125, 150, 175, 200]);
    expect(result.margin).toBe(500);
    expect(result.notional).toBe(2000);
    expect(result.perGridMargin).toBe(100);
    expect(result.perGridNotional).toBe(500);
    expect(result.filledGridCount).toBe(1);
    expect(result.filledGridPrices).toEqual([125]);
    expect(result.positionQuantity).toBe(4);
    expect(result.averageEntryPrice).toBe(125);
    expect(result.currentEquity).toBe(200);
    expect(result.liquidationPrice).toBe(75);
    expect(result.estimatedGridLiquidationPrice).toBeCloseTo(55.5555555556);
    expect(result.gridProfitRate).toBe(25);
    expect(result.totalYieldRate).toBe(100);
  });

  it('calculates short grid rates and liquidation above the average entry', () => {
    const result = calculateContractGrid({
      ...validInput,
      side: CONTRACT_SIDE_SHORT,
      entryPrice: 150,
      currentPrice: 175,
    });

    expect(result.filledGridCount).toBe(1);
    expect(result.filledGridPrices).toEqual([175]);
    expect(result.averageEntryPrice).toBe(175);
    expect(result.liquidationPrice).toBeCloseTo(245);
    expect(result.gridProfitRate).toBe(12.5);
    expect(result.totalYieldRate).toBe(50);
  });

  it('keeps old inputs compatible when increment fields are omitted', () => {
    const result = calculateContractGrid(validInput);

    expect(result.positionIncrementMode).toBeUndefined();
    expect(result.positionIncrementValue).toBeUndefined();
    expect(result.gridMargins).toEqual([100, 100, 100, 100]);
    expect(result.filledMargin).toBe(200);
    expect(result.currentNotional).toBe(500);
  });

  it('uses the matched grid margin and notional when position increment is enabled', () => {
    const result = calculateContractGrid({
      ...validInput,
      positionIncrementMode: POSITION_INCREMENT_RATIO,
      positionIncrementValue: 100,
    });

    expect(result.gridMargins.reduce((sum, amount) => sum + amount, 0)).toBeCloseTo(400);
    expect(result.gridMargins[0]).toBeGreaterThan(result.gridMargins[3]);
    expect(result.filledMargin).toBeCloseTo(206.6666666667);
    expect(result.currentNotional).toBeCloseTo(533.3333333333);
    expect(result.positionQuantity).toBeCloseTo(4.2666666667);
    expect(result.liquidationPrice).toBeCloseTo(76.5625);
  });

  it('builds order rows with price, margin, and filled status', () => {
    const result = calculateContractGrid({
      ...validInput,
      positionIncrementMode: POSITION_INCREMENT_RATIO,
      positionIncrementValue: 100,
    });

    expect(result.gridOrders).toHaveLength(validInput.gridCount);
    expect(result.gridOrders.map((order) => order.price)).toEqual([100, 125, 150, 175]);
    expect(result.gridOrders.map((order) => order.margin)).toEqual(result.gridMargins);
    expect(result.gridOrders.map((order) => order.filled)).toEqual([false, true, false, false]);
  });
});
