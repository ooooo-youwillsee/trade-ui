import { describe, expect, it } from 'vitest';
import {
  calculateMartingale,
  MARTINGALE_MODE_FUTURES,
  MARTINGALE_MODE_SPOT,
  MARTINGALE_SIDE_LONG,
} from './martingale';

describe('calculateMartingale', () => {
  const spotInput = {
    name: 'spot martingale',
    mode: MARTINGALE_MODE_SPOT,
    side: MARTINGALE_SIDE_LONG,
    currentPrice: 100,
    firstOrderAmount: 100,
    multiplier: 2,
    maxLayers: 3,
    triggerPercent: 10,
    takeProfitPercent: 5,
    totalCapital: 1000,
    leverage: 1,
    additionalMargin: 0,
    maintenanceMarginRate: 0.005,
    includeInitialOrder: true,
    restrictByCapital: true,
  };

  it('builds spot martingale layers with trigger, amount, average entry, and take profit values', () => {
    const result = calculateMartingale(spotInput);

    expect(result.layers).toHaveLength(3);
    expect(result.layers.map((layer) => layer.triggerPrice)).toEqual([100, 90, 81]);
    expect(result.layers.map((layer) => layer.orderAmount)).toEqual([100, 200, 400]);
    expect(result.layers[0].averageEntryPrice).toBe(100);
    expect(result.layers[0].takeProfitPrice).toBe(105);
    expect(result.layers[1].averageEntryPrice).toBeCloseTo(93.1034482759);
    expect(result.layers[1].takeProfitPrice).toBeCloseTo(97.7586206897);
    expect(result.maxCapitalRequired).toBe(700);
    expect(result.currentTriggeredLayers).toBe(1);
    expect(result.currentTakeProfitPrice).toBe(105);
  });

  it('calculates futures margin, notional, floating profit and liquidation values', () => {
    const result = calculateMartingale({
      ...spotInput,
      name: 'futures martingale',
      mode: MARTINGALE_MODE_FUTURES,
      leverage: 5,
      additionalMargin: 50,
    });

    expect(result.layers[0].marginAmount).toBe(100);
    expect(result.layers[0].notional).toBe(500);
    expect(result.currentMargin).toBe(100);
    expect(result.currentNotional).toBe(500);
    expect(result.currentQuantity).toBe(5);
    expect(result.currentFloatingProfitLoss).toBe(0);
    expect(result.currentEquity).toBe(150);
    expect(result.liquidationPrice).toBe(70.5);
    expect(result.liquidationDistance).toBe(29.5);
  });

  it('marks layers beyond the available capital as not executable', () => {
    const result = calculateMartingale({
      ...spotInput,
      totalCapital: 250,
    });

    expect(result.layers.map((layer) => layer.executable)).toEqual([true, false, false]);
    expect(result.executableLayers).toBe(1);
    expect(result.hasCapitalShortfall).toBe(true);
    expect(result.capitalShortfall).toBe(450);
  });
});
