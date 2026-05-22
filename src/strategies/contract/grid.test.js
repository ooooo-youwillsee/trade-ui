import { describe, expect, it } from 'vitest';
import { CONTRACT_SIDE_LONG, CONTRACT_SIDE_SHORT, GRID_MODE_ARITHMETIC } from '../common/grid';
import { calculateContractGrid } from './grid';

describe('calculateContractGrid', () => {
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
});
