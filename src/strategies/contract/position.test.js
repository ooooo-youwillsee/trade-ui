import { describe, expect, it } from 'vitest';
import { CONTRACT_SIDE_LONG, CONTRACT_SIDE_SHORT } from '../common/grid';
import { aggregateContractPositionEntries, liquidationPrice } from './position';

describe('aggregateContractPositionEntries', () => {
  it('aggregates long position margin, quantity, average entry price and floating profit loss', () => {
    const result = aggregateContractPositionEntries(
      [
        {
          side: CONTRACT_SIDE_LONG,
          openPrice: 100,
          targetPrice: 110,
          notional: 1000,
        },
      ],
      105,
      10,
    );

    expect(result.margin).toBe(100);
    expect(result.notional).toBe(1000);
    expect(result.quantity).toBe(10);
    expect(result.averageEntryPrice).toBe(100);
    expect(result.floatingProfitLoss).toBe(50);
  });

  it('aggregates short position floating profit loss', () => {
    const result = aggregateContractPositionEntries(
      [
        {
          side: CONTRACT_SIDE_SHORT,
          openPrice: 100,
          targetPrice: 90,
          notional: 1000,
        },
      ],
      95,
      10,
    );

    expect(result.margin).toBe(100);
    expect(result.notional).toBe(1000);
    expect(result.quantity).toBe(10);
    expect(result.averageEntryPrice).toBe(100);
    expect(result.floatingProfitLoss).toBe(50);
  });

  it('caps favorable floating profit loss at the take-profit target', () => {
    const result = aggregateContractPositionEntries(
      [
        {
          side: CONTRACT_SIDE_LONG,
          openPrice: 100,
          targetPrice: 110,
          notional: 1000,
        },
      ],
      120,
      10,
    );

    expect(result.floatingProfitLoss).toBe(100);
  });

  it('returns zero values when there are no open positions', () => {
    const result = aggregateContractPositionEntries([], 100, 10);

    expect(result).toEqual({
      margin: 0,
      notional: 0,
      quantity: 0,
      averageEntryPrice: 0,
      floatingProfitLoss: 0,
    });
  });
});

describe('liquidationPrice', () => {
  it('calculates long liquidation price from average entry price, notional and margin', () => {
    expect(liquidationPrice(CONTRACT_SIDE_LONG, 100, 1000, 100)).toBe(90);
  });

  it('calculates short liquidation price from average entry price, notional and margin', () => {
    expect(liquidationPrice(CONTRACT_SIDE_SHORT, 100, 1000, 100)).toBeCloseTo(110);
  });

  it('returns zero when there is no position notional', () => {
    expect(liquidationPrice(CONTRACT_SIDE_LONG, 100, 0, 100)).toBe(0);
  });
});
