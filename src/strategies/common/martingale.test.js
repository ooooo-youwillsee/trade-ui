import { describe, expect, it } from 'vitest';
import {
  calculateMartingale,
  MARTINGALE_MODE_FUTURES,
  MARTINGALE_MODE_SPOT,
  MARTINGALE_SIDE_LONG,
  MARTINGALE_SIDE_SHORT,
  normalizeMartingaleInput,
} from './martingale';
import { defaultContractMartingaleInput } from '../contract/martingaleDefaults';
import { defaultSpotMartingaleInput } from '../spot/martingaleDefaults';

describe('calculateMartingale', () => {
  const spotInput = {
    name: 'spot martingale',
    mode: MARTINGALE_MODE_SPOT,
    side: MARTINGALE_SIDE_LONG,
    entryPrice: 100,
    currentPrice: 100,
    firstOrderAmount: 100,
    multiplier: 2,
    priceGapMultiplier: 1,
    maxLayers: 3,
    triggerPercent: 10,
    takeProfitPercent: 5,
    feeRate: 0.02,
    leverage: 1,
    additionalMargin: 0,
  };

  it('provides entry and current prices in both market defaults', () => {
    expect(defaultContractMartingaleInput).toMatchObject({
      entryPrice: 2300,
      currentPrice: 2300,
      firstOrderAmount: 0.2,
      multiplier: 1.1,
      priceGapMultiplier: 1.1,
      maxLayers: 25,
      triggerPercent: 1.1,
      takeProfitPercent: 3,
      feeRate: 0.02,
      leverage: 100,
    });
    expect(defaultSpotMartingaleInput).toMatchObject({
      entryPrice: 2300,
      currentPrice: 2300,
      firstOrderAmount: 0.2,
      multiplier: 1.1,
      priceGapMultiplier: 1.1,
      maxLayers: 25,
      triggerPercent: 1.1,
      takeProfitPercent: 3,
      feeRate: 0.02,
      leverage: 1,
    });
  });

  it('builds every layer from entry price independently of current price', () => {
    const atEntry = calculateMartingale(spotInput);
    const afterMove = calculateMartingale({ ...spotInput, currentPrice: 89 });

    expect(atEntry.layers.map((layer) => layer.triggerPrice)).toEqual([100, 90, 80]);
    expect(afterMove.layers.map((layer) => layer.triggerPrice)).toEqual([100, 90, 80]);
    expect(afterMove.entryPrice).toBe(100);
    expect(afterMove.currentPrice).toBe(89);
  });

  it('uses the short direction to generate increasing entry-based layers', () => {
    const result = calculateMartingale({
      ...spotInput,
      side: MARTINGALE_SIDE_SHORT,
      currentPrice: 111,
    });

    expect(result.layers[0].triggerPrice).toBe(100);
    expect(result.layers[1].triggerPrice).toBeCloseTo(110);
    expect(result.layers[2].triggerPrice).toBeCloseTo(120);
    expect(result.currentExecutedLayers).toBe(2);
    expect(result.currentFloatingProfitLoss).toBeLessThan(0);
  });

  it.each([
    [MARTINGALE_SIDE_LONG, [100, 90, 70]],
    [MARTINGALE_SIDE_SHORT, [100, 110, 130]],
  ])('accumulates expanded %s layer gaps from the entry price', (side, expectedPrices) => {
    const result = calculateMartingale({
      ...spotInput,
      side,
      priceGapMultiplier: 2,
    });

    result.layers.forEach((layer, index) => {
      expect(layer.triggerPrice).toBeCloseTo(expectedPrices[index]);
    });
  });

  it('matches Bitget cumulative price-gap prices', () => {
    const result = calculateMartingale({
      ...spotInput,
      entryPrice: 1220.73,
      currentPrice: 1220.73,
      maxLayers: 9,
      triggerPercent: 1.1,
      priceGapMultiplier: 1.1,
    });

    const expectedPrices = [
      1220.73, 1207.30197, 1192.531137, 1176.2832207, 1158.41051277, 1138.750534047, 1117.1245574517, 1093.33598319687,
      1067.1685515165568,
    ];
    expectedPrices.forEach((price, index) => expect(result.layers[index].triggerPrice).toBeCloseTo(price));
  });

  it.each([
    [MARTINGALE_SIDE_LONG, 73, 2],
    [MARTINGALE_SIDE_LONG, 70, 3],
    [MARTINGALE_SIDE_SHORT, 129, 2],
    [MARTINGALE_SIDE_SHORT, 130, 3],
  ])('counts executed %s layers against expanded gaps at price %s', (side, currentPrice, expectedLayers) => {
    const result = calculateMartingale({
      ...spotInput,
      side,
      currentPrice,
      priceGapMultiplier: 2,
    });

    expect(result.currentExecutedLayers).toBe(expectedLayers);
  });

  it.each([0, -1, 0.99, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects an invalid price-gap multiplier: %s',
    (priceGapMultiplier) => {
      expect(() => calculateMartingale({ ...spotInput, priceGapMultiplier })).toThrow('加仓价差倍数');
    },
  );

  it('rejects a long layer when the cumulative gap reaches 100%', () => {
    expect(() =>
      calculateMartingale({
        ...spotInput,
        maxLayers: 3,
        triggerPercent: 50,
        priceGapMultiplier: 2,
      }),
    ).toThrow('马丁参数组合超出可计算范围');
  });

  it.each([
    ['profitable long', MARTINGALE_SIDE_LONG, 110, 1],
    ['long at second trigger', MARTINGALE_SIDE_LONG, 90, 2],
    ['long between triggers', MARTINGALE_SIDE_LONG, 89, 2],
    ['long beyond all layers', MARTINGALE_SIDE_LONG, 80, 3],
    ['profitable short', MARTINGALE_SIDE_SHORT, 90, 1],
    ['short at second trigger', MARTINGALE_SIDE_SHORT, 110, 2],
    ['short beyond all layers', MARTINGALE_SIDE_SHORT, 122, 3],
  ])('counts executed layers for %s', (_name, side, currentPrice, expectedLayers) => {
    const result = calculateMartingale({ ...spotInput, side, currentPrice });
    expect(result.currentExecutedLayers).toBe(expectedLayers);
  });

  it('summarizes only executed layers while layer scenarios stay fixed at trigger prices', () => {
    const result = calculateMartingale({ ...spotInput, currentPrice: 89 });
    const afterAnotherMove = calculateMartingale({ ...spotInput, currentPrice: 80 });
    const secondLayer = result.layers[1];

    expect(result.currentExecutedLayers).toBe(2);
    expect(result.currentQuantity).toBeCloseTo(secondLayer.cumulativeQuantity);
    expect(result.currentAverageEntryPrice).toBeCloseTo(secondLayer.averageEntryPrice);
    expect(result.currentNotional).toBe(secondLayer.cumulativeNotional);
    expect(result.currentFloatingProfitLoss).toBeCloseTo(
      (89 - secondLayer.averageEntryPrice) * secondLayer.cumulativeQuantity,
    );
    expect(result.layers[0].triggerFloatingProfitLoss).toBe(0);
    expect(result.layers[2].triggerFloatingProfitLoss).toBeCloseTo(
      (result.layers[2].triggerPrice - result.layers[2].averageEntryPrice) * result.layers[2].cumulativeQuantity,
    );
    expect(afterAnotherMove.layers.map((layer) => layer.triggerFloatingProfitLoss)).toEqual(
      result.layers.map((layer) => layer.triggerFloatingProfitLoss),
    );
  });

  it.each([MARTINGALE_SIDE_LONG, MARTINGALE_SIDE_SHORT])(
    'calculates cumulative per-layer take-profit gross, fees, net profit, and rates for %s',
    (side) => {
      const result = calculateMartingale({ ...spotInput, side });
      const secondLayer = result.layers[1];
      const expectedGross =
        side === MARTINGALE_SIDE_LONG
          ? (secondLayer.takeProfitPrice - secondLayer.averageEntryPrice) * secondLayer.cumulativeQuantity
          : (secondLayer.averageEntryPrice - secondLayer.takeProfitPrice) * secondLayer.cumulativeQuantity;
      const expectedFee =
        ((secondLayer.cumulativeNotional + secondLayer.cumulativeQuantity * secondLayer.takeProfitPrice) *
          spotInput.feeRate) /
        100;

      expect(secondLayer.takeProfitGrossProfitAmount).toBeCloseTo(expectedGross);
      expect(secondLayer.takeProfitGrossProfitRate).toBeCloseTo((expectedGross / secondLayer.cumulativeNotional) * 100);
      expect(secondLayer.takeProfitNetProfitAmount).toBeCloseTo(expectedGross - expectedFee);
      expect(secondLayer.takeProfitNetProfitRate).toBeCloseTo(
        ((expectedGross - expectedFee) / secondLayer.cumulativeNotional) * 100,
      );
      expect(secondLayer).not.toHaveProperty('takeProfitProfit');
      expect(secondLayer).not.toHaveProperty('currentFloatingProfitLoss');
      expect(secondLayer).not.toHaveProperty('currentFloatingProfitRate');
    },
  );

  it('uses the short trigger price and cumulative average for layer floating profit', () => {
    const result = calculateMartingale({
      ...spotInput,
      side: MARTINGALE_SIDE_SHORT,
      currentPrice: 111,
    });
    const secondLayer = result.layers[1];
    const expectedTriggerProfit =
      (secondLayer.averageEntryPrice - secondLayer.triggerPrice) * secondLayer.cumulativeQuantity;
    const expectedGross =
      (secondLayer.averageEntryPrice - secondLayer.takeProfitPrice) * secondLayer.cumulativeQuantity;

    expect(secondLayer.triggerFloatingProfitLoss).toBeCloseTo(expectedTriggerProfit);
    expect(secondLayer.triggerFloatingProfitRate).toBeCloseTo(
      (expectedTriggerProfit / secondLayer.cumulativeNotional) * 100,
    );
    expect(secondLayer.takeProfitGrossProfitAmount).toBeCloseTo(expectedGross);
  });

  it.each([MARTINGALE_SIDE_LONG, MARTINGALE_SIDE_SHORT])(
    'calculates cumulative current and max take-profit gross and net profit for %s',
    (side) => {
      const result = calculateMartingale({
        ...spotInput,
        side,
        currentPrice: side === MARTINGALE_SIDE_LONG ? 89 : 111,
      });
      const currentGross = result.currentNotional * (spotInput.takeProfitPercent / 100);
      const currentCloseNotional = result.currentQuantity * result.currentTakeProfitPrice;
      const currentFee = ((result.currentNotional + currentCloseNotional) * spotInput.feeRate) / 100;
      const maxNotional = result.layers.at(-1).cumulativeNotional;
      const maxQuantity = result.layers.at(-1).cumulativeQuantity;
      const maxGross = maxNotional * (spotInput.takeProfitPercent / 100);
      const maxFee = ((maxNotional + maxQuantity * result.maxTakeProfitPrice) * spotInput.feeRate) / 100;

      expect(result.currentTakeProfitGrossProfitAmount).toBeCloseTo(currentGross);
      expect(result.currentTakeProfitNetProfitAmount).toBeCloseTo(currentGross - currentFee);
      expect(result.maxTakeProfitGrossProfitAmount).toBeCloseTo(maxGross);
      expect(result.maxTakeProfitNetProfitAmount).toBeCloseTo(maxGross - maxFee);
      expect(result).not.toHaveProperty('currentTakeProfitProfit');
      expect(result).not.toHaveProperty('maxTakeProfitProfit');
    },
  );

  it('supports zero fees and rejects invalid fee rates', () => {
    const withoutFees = calculateMartingale({ ...spotInput, feeRate: 0 });

    expect(withoutFees.currentTakeProfitNetProfitAmount).toBeCloseTo(withoutFees.currentTakeProfitGrossProfitAmount);
    for (const layer of withoutFees.layers) {
      expect(layer.takeProfitNetProfitAmount).toBeCloseTo(layer.takeProfitGrossProfitAmount);
      expect(layer.takeProfitNetProfitRate).toBeCloseTo(layer.takeProfitGrossProfitRate);
    }
    for (const feeRate of [-0.01, 100, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => calculateMartingale({ ...spotInput, feeRate })).toThrow('手续费率');
    }
  });

  it('keeps cumulative layer take-profit metrics independent of current price', () => {
    const atEntry = calculateMartingale(spotInput);
    const afterMove = calculateMartingale({ ...spotInput, currentPrice: 80 });
    const metricNames = [
      'takeProfitGrossProfitAmount',
      'takeProfitGrossProfitRate',
      'takeProfitNetProfitAmount',
      'takeProfitNetProfitRate',
    ];

    for (let index = 0; index < atEntry.layers.length; index += 1) {
      for (const metricName of metricNames) {
        expect(afterMove.layers[index][metricName]).toBeCloseTo(atEntry.layers[index][metricName]);
      }
    }
  });

  it('calculates futures equity and liquidation from executed and additional margin', () => {
    const withAdditionalMargin = calculateMartingale({
      ...spotInput,
      name: 'futures martingale',
      mode: MARTINGALE_MODE_FUTURES,
      leverage: 5,
      additionalMargin: 50,
    });
    const withoutAdditionalMargin = calculateMartingale({
      ...spotInput,
      name: 'futures martingale',
      mode: MARTINGALE_MODE_FUTURES,
      leverage: 5,
      additionalMargin: 0,
    });
    const shortResult = calculateMartingale({
      ...spotInput,
      name: 'short futures martingale',
      mode: MARTINGALE_MODE_FUTURES,
      side: MARTINGALE_SIDE_SHORT,
      leverage: 5,
      additionalMargin: 50,
    });

    expect(withAdditionalMargin.currentMargin).toBe(100);
    expect(withAdditionalMargin.currentNotional).toBe(500);
    expect(withAdditionalMargin.currentEquity).toBe(150);
    expect(withAdditionalMargin).not.toHaveProperty('currentTakeProfitGrossProfitAmount');
    expect(withAdditionalMargin).not.toHaveProperty('currentTakeProfitGrossProfitRate');
    expect(withAdditionalMargin).not.toHaveProperty('currentTakeProfitNetProfitAmount');
    expect(withAdditionalMargin).not.toHaveProperty('currentTakeProfitNetProfitRate');
    expect(withAdditionalMargin).not.toHaveProperty('maxTakeProfitGrossProfitAmount');
    expect(withAdditionalMargin).not.toHaveProperty('maxTakeProfitGrossProfitRate');
    expect(withAdditionalMargin).not.toHaveProperty('maxTakeProfitNetProfitAmount');
    expect(withAdditionalMargin).not.toHaveProperty('maxTakeProfitNetProfitRate');
    expect(withAdditionalMargin.liquidationPrice).toBe(70);
    expect(withAdditionalMargin.liquidationDistance).toBe(30);
    expect(withoutAdditionalMargin.liquidationPrice).toBe(80);
    expect(shortResult.liquidationPrice).toBe(130);
  });

  it('floors long liquidation at zero when the loss budget exceeds notional', () => {
    const result = calculateMartingale({
      ...spotInput,
      name: 'fully covered futures martingale',
      mode: MARTINGALE_MODE_FUTURES,
      leverage: 1,
      additionalMargin: 100,
    });

    expect(result.liquidationPrice).toBe(0);
    expect(result.liquidationDistance).toBe(0);
  });

  it('omits removed capital-control inputs and result fields', () => {
    const normalized = normalizeMartingaleInput({
      ...spotInput,
      totalCapital: 1000,
      maintenanceMarginRate: 0.005,
      includeInitialOrder: false,
      restrictByCapital: true,
    });
    const result = calculateMartingale(normalized);

    expect(normalized).not.toHaveProperty('totalCapital');
    expect(normalized).not.toHaveProperty('maintenanceMarginRate');
    expect(normalized).not.toHaveProperty('includeInitialOrder');
    expect(normalized).not.toHaveProperty('restrictByCapital');
    expect(result).not.toHaveProperty('currentTriggeredLayers');
    expect(result).not.toHaveProperty('executableLayers');
    expect(result).not.toHaveProperty('capitalShortfall');
    expect(result).not.toHaveProperty('hasCapitalShortfall');
    expect(result).not.toHaveProperty('availableCapital');
    expect(result).not.toHaveProperty('maxCapitalRequired');
    expect(result.layers.every((layer) => !('executable' in layer) && !('availableCapital' in layer))).toBe(true);
  });

  it('calculates the 25-layer defaults and accepts larger calculable positive integers', () => {
    const defaultContractResult = calculateMartingale(defaultContractMartingaleInput);
    const defaultSpotResult = calculateMartingale(defaultSpotMartingaleInput);

    expect(defaultContractResult.layers).toHaveLength(25);
    expect(defaultSpotResult.layers).toHaveLength(25);
    expect(defaultContractResult.layers.at(-1).triggerPrice).toBeGreaterThan(0);
    expect(() => calculateMartingale({ ...defaultContractMartingaleInput, maxLayers: 26 })).toThrow(
      '马丁参数组合超出可计算范围',
    );
    expect(
      calculateMartingale({
        ...defaultSpotMartingaleInput,
        maxLayers: 201,
        triggerPercent: 0.1,
        priceGapMultiplier: 1,
      }).layers,
    ).toHaveLength(201);
  });

  it.each([0, -1, 1.5])('rejects a non-positive-integer max layer value: %s', (maxLayers) => {
    expect(() => calculateMartingale({ ...defaultSpotMartingaleInput, maxLayers })).toThrow('最大层数必须是正整数');
  });

  it.each([
    {
      name: 'long trigger underflow',
      overrides: { entryPrice: 100, maxLayers: 200, triggerPercent: 99 },
    },
    {
      name: 'short trigger overflow',
      overrides: { entryPrice: Number.MAX_VALUE, maxLayers: 2, side: MARTINGALE_SIDE_SHORT, triggerPercent: 99 },
    },
    {
      name: 'order amount overflow',
      overrides: { maxLayers: 3, multiplier: Number.MAX_VALUE },
    },
    {
      name: 'order quantity underflow',
      overrides: { entryPrice: Number.MAX_VALUE, firstOrderAmount: Number.MIN_VALUE, maxLayers: 1 },
    },
    {
      name: 'current profit overflow',
      overrides: { entryPrice: 100, currentPrice: Number.MAX_VALUE, firstOrderAmount: Number.MAX_VALUE, maxLayers: 1 },
    },
    {
      name: 'additional margin is not finite',
      overrides: { additionalMargin: Number.POSITIVE_INFINITY },
    },
  ])('rejects a parameter combination outside the numeric range: $name', ({ overrides }) => {
    expect(() => calculateMartingale({ ...defaultSpotMartingaleInput, ...overrides })).toThrow(
      '马丁参数组合超出可计算范围',
    );
  });
});
