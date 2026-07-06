import { describe, expect, it } from 'vitest';
import {
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_NEUTRAL,
  CONTRACT_SIDE_SHORT,
  GRID_MODE_ARITHMETIC,
} from '../common/grid';
import { calculateContractGrid, normalizeInput } from './grid';

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
    expect(result.positionQuantity).toBe(2.5);
    expect(result.averageEntryPrice).toBe(125);
    expect(result.currentEquity).toBe(162.5);
    expect(result.liquidationPrice).toBe(60);
    expect(result.estimatedGridLiquidationPrice).toBeCloseTo(12.5);
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
    expect(result.positionQuantity).toBe(2.5);
    expect(result.liquidationPrice).toBeCloseTo(250);
    expect(result.gridProfitRate).toBe(12.5);
    expect(result.totalYieldRate).toBe(100);
  });

  it('keeps old inputs compatible when optional fields are omitted', () => {
    const result = calculateContractGrid(validInput);

    expect(result.minTradeQuantity).toBe(0.01);
    expect(result.gridMargins).toEqual([50, 62.5, 75, 87.5]);
    expect(result.filledMargin).toBe(162.5);
    expect(result.currentNotional).toBe(312.5);
    expect(normalizeInput(validInput).feeRate).toBe(0.02);
  });

  it('infers BTC minimum trade quantity when the field is omitted', () => {
    expect(normalizeInput({ ...validInput, name: 'BTCUSDT contract grid' }).minTradeQuantity).toBe(0.0001);
  });

  it('rounds fixed per-grid notional down to the largest tradable BTC quantity', () => {
    const result = calculateContractGrid({
      ...validInput,
      name: 'BTCUSDT',
      investment: 560,
      leverage: 10,
      gridCount: 200,
      upperPrice: 100000,
    });

    expect(result.perGridMargin).toBe(2.8);
    expect(result.perGridNotional).toBe(28);
    expect(result.minimumPerGridQuantity).toBeCloseTo(0.00028);
    expect(result.minTradeQuantity).toBe(0.0001);
    expect(result.tradableGridUnits).toBe(2);
    expect(result.tradablePerGridQuantity).toBe(0.0002);
    expect(result.tradablePerGridMargin).toBe(2);
    expect(result.unallocatedMargin).toBe(160);
    expect(result.gridOrders.every((order) => order.quantity === 0.0002)).toBe(true);
    expect(result.gridOrders[0].notional).toBeCloseTo(0.0002 * result.gridOrders[0].price);
    expect(result.gridOrders[0].margin).toBeCloseTo(result.gridOrders[0].notional / 10);
  });

  it('rejects a BTC grid when fixed per-grid notional is below the minimum trade quantity', () => {
    expect(() =>
      calculateContractGrid({
        ...validInput,
        name: 'BTCUSDT',
        upperPrice: 100000,
        investment: 1,
        leverage: 10,
        gridCount: 200,
        minTradeQuantity: 0.0001,
      }),
    ).toThrow(/最小成交数量.*最大网格数.*最低保证金/);
  });

  it('builds order rows with price, margin, and filled status', () => {
    const result = calculateContractGrid(validInput);

    expect(result.gridOrders).toHaveLength(validInput.gridCount);
    expect(result.gridOrders.map((order) => order.price)).toEqual([100, 125, 150, 175]);
    expect(result.gridOrders.map((order) => order.margin)).toEqual(result.gridMargins);
    expect(result.gridOrders.map((order) => order.quantity)).toEqual([2.5, 2.5, 2.5, 2.5]);
    expect(result.gridOrders.map((order) => order.notional)).toEqual([250, 312.5, 375, 437.5]);
    expect(result.gridOrders.map((order) => order.filled)).toEqual([false, true, false, false]);
    expect(result.gridOrders[1]).not.toHaveProperty('profitRate');
    expect(result.gridOrders[1]).not.toHaveProperty('profitAmount');
    expect(result.feeRate).toBe(0.02);
    expect(result.gridOrders[1].grossProfitRate).toBe(20);
    expect(result.gridOrders[1].grossProfitAmount).toBeCloseTo(62.5);
    expect(result.gridOrders[1].netProfitAmount).toBeCloseTo(62.3625);
    expect(result.gridOrders[1].netProfitRate).toBeCloseTo(19.956);
  });

  it('builds short order rows with per-grid profit rates', () => {
    const result = calculateContractGrid({
      ...validInput,
      side: CONTRACT_SIDE_SHORT,
      entryPrice: 150,
      currentPrice: 175,
    });

    expect(result.gridOrders).toHaveLength(validInput.gridCount);
    expect(result.gridOrders.map((order) => order.price)).toEqual([100, 125, 150, 175]);
    expect(result.gridOrders.map((order) => order.filled)).toEqual([false, false, false, true]);
    expect(result.gridOrders[3].grossProfitRate).toBeCloseTo(14.2857142857);
    expect(result.gridOrders[3].quantity).toBe(2.5);
    expect(result.gridOrders[3].grossProfitAmount).toBeCloseTo(62.5);
    expect(result.gridOrders[3].netProfitAmount).toBeCloseTo(62.3375);
    expect(result.gridOrders[3].netProfitRate).toBeCloseTo(14.2485714286);
  });

  it('uses an editable fee rate and keeps boundary orders at zero profit', () => {
    const result = calculateContractGrid({ ...validInput, feeRate: 0.1 });
    const shortResult = calculateContractGrid({
      ...validInput,
      side: CONTRACT_SIDE_SHORT,
      currentPrice: 175,
      feeRate: 0.1,
    });

    expect(result.feeRate).toBe(0.1);
    expect(result.gridOrders[1].netProfitAmount).toBeCloseTo(61.8125);
    expect(result.gridOrders[1].netProfitRate).toBeCloseTo(19.78);
    expect(shortResult.gridOrders[0]).toMatchObject({
      grossProfitAmount: 0,
      grossProfitRate: 0,
      netProfitAmount: 0,
      netProfitRate: 0,
    });
  });

  it('rejects invalid fee rates', () => {
    expect(() => calculateContractGrid({ ...validInput, feeRate: -0.01 })).toThrow('手续费率');
    expect(() => calculateContractGrid({ ...validInput, feeRate: 100 })).toThrow('手续费率');
    expect(() => calculateContractGrid({ ...validInput, feeRate: Number.NaN })).toThrow('手续费率');
  });

  it('fills the long leg below entry price for a neutral grid', () => {
    const result = calculateContractGrid({
      ...validInput,
      side: CONTRACT_SIDE_NEUTRAL,
      currentPrice: 125,
      openOnCreate: false,
    });

    expect(result.filledGridPrices).toEqual([125]);
    expect(result.longLeg.filledGridPrices).toEqual([125]);
    expect(result.shortLeg.filledGridPrices).toEqual([]);
    expect(result.longLeg.currentNotional).toBe(312.5);
    expect(result.shortLeg.currentNotional).toBe(0);
    expect(result.currentNotional).toBe(312.5);
    expect(result.totalProfitLoss).toBe(0);
    expect(result).not.toHaveProperty('floatingProfitLoss');
    expect(result.currentEquity).toBe(162.5);
    expect(result.gridOrders[1].side).toBe(CONTRACT_SIDE_LONG);
  });

  it('fills the short leg above entry price for a neutral grid', () => {
    const result = calculateContractGrid({
      ...validInput,
      side: CONTRACT_SIDE_NEUTRAL,
      currentPrice: 175,
      openOnCreate: false,
    });

    expect(result.filledGridPrices).toEqual([175]);
    expect(result.longLeg.filledGridPrices).toEqual([]);
    expect(result.shortLeg.filledGridPrices).toEqual([175]);
    expect(result.shortLeg.currentNotional).toBe(437.5);
    expect(result.averageEntryPrice).toBe(175);
    expect(result.liquidationPrice).toBeCloseTo(250);
    expect(result.gridOrders[3].side).toBe(CONTRACT_SIDE_SHORT);
  });

  it('opens both neutral legs on create and aggregates leg totals', () => {
    const result = calculateContractGrid({
      ...validInput,
      side: CONTRACT_SIDE_NEUTRAL,
      currentPrice: 150,
      openOnCreate: true,
    });

    expect(result.longLeg.filledGridPrices).toEqual([175, 200]);
    expect(result.shortLeg.filledGridPrices).toEqual([100, 125]);
    expect(result.filledGridCount).toBe(4);
    expect(result.currentNotional).toBe(result.longLeg.currentNotional + result.shortLeg.currentNotional);
    expect(result.totalProfitLoss).toBeCloseTo(result.longLeg.totalProfitLoss + result.shortLeg.totalProfitLoss);
    expect(result).not.toHaveProperty('floatingProfitLoss');
    expect(result.longLeg).not.toHaveProperty('floatingProfitLoss');
    expect(result.shortLeg).not.toHaveProperty('floatingProfitLoss');
    expect(result.currentEquity).toBeCloseTo(result.filledMargin + result.totalProfitLoss);
    expect(result.longLeg.liquidationPrice).toBeGreaterThan(0);
    expect(result.shortLeg.liquidationPrice).toBeGreaterThan(0);
  });

  it('uses conservative neutral rates and tags each grid order with its leg side', () => {
    const result = calculateContractGrid({
      ...validInput,
      side: CONTRACT_SIDE_NEUTRAL,
      currentPrice: 150,
      openOnCreate: true,
    });

    expect(result.gridProfitRate).toBe(12.5);
    expect(result.totalYieldRate).toBe(100);
    expect(result.gridOrders.map((order) => order.side)).toEqual([
      CONTRACT_SIDE_LONG,
      CONTRACT_SIDE_LONG,
      CONTRACT_SIDE_LONG,
      CONTRACT_SIDE_SHORT,
    ]);
    expect(result.gridOrders.map((order) => order.grossProfitRate)).toEqual([
      25, 20, 16.666666666666664, 14.285714285714285,
    ]);
    expect(result.gridOrders.map((order) => order.grossProfitAmount)).toEqual([
      62.5, 62.5, 62.49999999999999, 62.5,
    ]);
  });

  it('chooses the nearest neutral liquidation price for compatibility fields', () => {
    const result = calculateContractGrid({
      ...validInput,
      side: CONTRACT_SIDE_NEUTRAL,
      currentPrice: 150,
      openOnCreate: true,
    });

    expect(result.estimatedGridLiquidationPrice).toBe(result.longLeg.liquidationPrice);
    expect(result.liquidationPrice).toBe(result.longLeg.liquidationPrice);
  });

  it('removes closed long open-on-create grids from open position and records realized profit', () => {
    const result = calculateContractGrid({
      ...validInput,
      currentPrice: 175,
      openOnCreate: true,
    });

    expect(result.filledGridPrices).toEqual([175, 200]);
    expect(result.closedGridPrices).toEqual([175]);
    expect(result.openGridPrices).toEqual([200]);
    expect(result.currentNotional).toBe(375);
    expect(result.positionQuantity).toBeCloseTo(2.5);
    expect(result.averageEntryPrice).toBe(150);
    expect(result.realizedProfitLoss).toBeCloseTo(62.5);
    expect(result.unrealizedProfitLoss).toBeCloseTo(62.5);
    expect(result.totalProfitLoss).toBeCloseTo(125);
    expect(result).not.toHaveProperty('floatingProfitLoss');
    expect(result.liquidationPrice).toBe(80);
    expect(result.currentEquity).toBeCloseTo(300);
  });

  it('removes closed short open-on-create grids from open position and records realized profit', () => {
    const result = calculateContractGrid({
      ...validInput,
      side: CONTRACT_SIDE_SHORT,
      currentPrice: 125,
      openOnCreate: true,
    });

    expect(result.filledGridPrices).toEqual([100, 125]);
    expect(result.closedGridPrices).toEqual([125]);
    expect(result.openGridPrices).toEqual([100]);
    expect(result.currentNotional).toBe(375);
    expect(result.positionQuantity).toBeCloseTo(2.5);
    expect(result.averageEntryPrice).toBe(150);
    expect(result.realizedProfitLoss).toBeCloseTo(62.5);
    expect(result.unrealizedProfitLoss).toBeCloseTo(62.5);
    expect(result.totalProfitLoss).toBeCloseTo(125);
    expect(result).not.toHaveProperty('floatingProfitLoss');
    expect(result.liquidationPrice).toBeCloseTo(220);
    expect(result.currentEquity).toBeCloseTo(300);
  });
});
