import { describe, expect, it } from 'vitest';
import { GRID_MODE_ARITHMETIC } from '../common/grid';
import { calculateContractHedgeGrid, normalizeHedgeGridInput } from './hedgeGrid';

describe('calculateContractHedgeGrid', () => {
  const validInput = {
    name: 'hedge grid',
    longScenarioChangePercent: -40,
    shortScenarioChangePercent: 40,
    longLeg: {
      name: 'ETH long',
      lowerPrice: 100,
      upperPrice: 200,
      entryPrice: 150,
      currentPrice: 150,
      openOnCreate: true,
      gridMode: GRID_MODE_ARITHMETIC,
      gridCount: 4,
      leverage: 5,
      investment: 400,
      additionalInvestment: 0,
    },
    shortLeg: {
      name: 'BTC short',
      lowerPrice: 100,
      upperPrice: 200,
      entryPrice: 150,
      currentPrice: 150,
      openOnCreate: true,
      gridMode: GRID_MODE_ARITHMETIC,
      gridCount: 4,
      leverage: 5,
      investment: 400,
      additionalInvestment: 0,
    },
  };

  it('applies independent scenario change percentages to both legs', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longScenarioChangePercent: -10,
      shortScenarioChangePercent: 12.5,
    });

    expect(result.longScenarioPrice).toBe(135);
    expect(result.shortScenarioPrice).toBe(168.75);
    expect(result.longScenarioResult.currentPrice).toBe(135);
    expect(result.shortScenarioResult.currentPrice).toBe(168.75);
    expect(result).not.toHaveProperty('scenarioFloatingProfitLoss');
    expect(result.longScenarioResult).not.toHaveProperty('floatingProfitLoss');
    expect(result.shortScenarioResult).not.toHaveProperty('floatingProfitLoss');
    expect(result.longLegResult.gridOrders[0]).toHaveProperty('grossProfitAmount');
    expect(result.longLegResult.gridOrders[0]).toHaveProperty('netProfitAmount');
    expect(result.longLegResult.gridOrders[0]).not.toHaveProperty('profitRate');
    expect(result.longLegResult.gridOrders[0]).not.toHaveProperty('profitAmount');
  });

  it('calculates required margin when the short leg rises toward liquidation', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longScenarioChangePercent: 0,
      shortScenarioChangePercent: 50,
    });

    expect(result.shortRequiredMarginAmount).toBeCloseTo(225);
    expect(result.requiredMarginAmount).toBeCloseTo(225);
  });

  it('calculates required margin when the long leg falls toward liquidation', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longScenarioChangePercent: -50,
      shortScenarioChangePercent: 0,
    });

    expect(result.longRequiredMarginAmount).toBeCloseTo(300);
    expect(result.requiredMarginAmount).toBeCloseTo(300);
  });

  it('uses profitable scenario floating profit to cover required margin', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longScenarioChangePercent: -10,
      shortScenarioChangePercent: -50,
    });

    expect(result.requiredMarginAmount).toBeCloseTo(0);
    expect(result.availableTransferAmount).toBeCloseTo(187.5);
    expect(result.marginShortfall).toBe(0);
  });

  it('reports the shortfall when profitable floating profit is not enough', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longScenarioChangePercent: -50,
      shortScenarioChangePercent: -10,
    });

    expect(result.requiredMarginAmount).toBeCloseTo(300);
    expect(result.availableTransferAmount).toBeCloseTo(75);
    expect(result.marginShortfall).toBeCloseTo(225);
  });

  it('does not require margin for a leg without scenario positions', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longLeg: {
        ...validInput.longLeg,
        openOnCreate: false,
        currentPrice: 150,
      },
      longScenarioChangePercent: 0,
    });

    expect(result.longScenarioResult.currentNotional).toBe(0);
    expect(result.longRequiredMarginAmount).toBe(0);
  });

  it('removes closed long grid positions from scenario liquidation and notional', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longLeg: {
        ...validInput.longLeg,
        currentPrice: 125,
        openOnCreate: false,
      },
      longScenarioChangePercent: 40,
    });

    expect(result.longLegResult.currentNotional).toBe(312.5);
    expect(result.longLegResult.liquidationPrice).toBe(100);
    expect(result.longScenarioResult.currentNotional).toBe(0);
    expect(result.longScenarioResult.liquidationPrice).toBe(0);
  });

  it('removes closed short grid positions from scenario liquidation and notional', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      shortLeg: {
        ...validInput.shortLeg,
        currentPrice: 175,
        openOnCreate: false,
      },
      shortScenarioChangePercent: -40,
    });

    expect(result.shortLegResult.currentNotional).toBe(437.5);
    expect(result.shortLegResult.liquidationPrice).toBe(210);
    expect(result.shortScenarioResult.currentNotional).toBe(0);
    expect(result.shortScenarioResult.liquidationPrice).toBe(0);
  });

  it('keeps realized long scenario profit available after the grid closes', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longLeg: {
        ...validInput.longLeg,
        currentPrice: 125,
        openOnCreate: false,
      },
      longScenarioChangePercent: 40,
    });

    expect(result.longScenarioResult.currentNotional).toBe(0);
    expect(result.longScenarioResult.realizedProfitLoss).toBe(62.5);
    expect(result.longScenarioResult.totalProfitLoss).toBe(62.5);
    expect(result.scenarioTotalProfitLoss).toBeCloseTo(
      result.longScenarioResult.totalProfitLoss + result.shortScenarioResult.totalProfitLoss,
    );
    expect(result.availableTransferAmount).toBe(62.5);
  });

  it('keeps realized short scenario profit available after the grid closes', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      shortLeg: {
        ...validInput.shortLeg,
        currentPrice: 175,
        openOnCreate: false,
      },
      shortScenarioChangePercent: -40,
    });

    expect(result.shortScenarioResult.currentNotional).toBe(0);
    expect(result.shortScenarioResult.realizedProfitLoss).toBeCloseTo(62.5);
    expect(result.shortScenarioResult.totalProfitLoss).toBeCloseTo(62.5);
    expect(result.scenarioTotalProfitLoss).toBeCloseTo(
      result.longScenarioResult.totalProfitLoss + result.shortScenarioResult.totalProfitLoss,
    );
    expect(result.availableTransferAmount).toBeCloseTo(62.5);
  });

  it('uses the underlying contract grid validation for invalid legs', () => {
    expect(() =>
      calculateContractHedgeGrid({
        ...validInput,
        shortLeg: {
          ...validInput.shortLeg,
          lowerPrice: 0,
        },
      }),
    ).toThrow();
  });
});

describe('normalizeHedgeGridInput', () => {
  it('normalizes nested leg numeric fields and scenario percentages', () => {
    const input = normalizeHedgeGridInput({
      name: ' hedge ',
      longScenarioChangePercent: '5',
      shortScenarioChangePercent: '-3',
      longLeg: {
        name: ' ETH ',
        lowerPrice: '100',
        upperPrice: '200',
        entryPrice: '150',
        currentPrice: '140',
        openOnCreate: true,
        gridMode: GRID_MODE_ARITHMETIC,
        gridCount: '4',
        leverage: '5',
        investment: '400',
        additionalInvestment: '20',
        minTradeQuantity: '0.001',
      },
      shortLeg: {
        name: ' BTC ',
        lowerPrice: '100',
        upperPrice: '200',
        entryPrice: '150',
        currentPrice: '160',
        openOnCreate: false,
        gridMode: GRID_MODE_ARITHMETIC,
        gridCount: '4',
        leverage: '5',
        investment: '400',
        additionalInvestment: '30',
        minTradeQuantity: '0.0001',
      },
    });

    expect(input.name).toBe('hedge');
    expect(input.longScenarioChangePercent).toBe(5);
    expect(input.shortScenarioChangePercent).toBe(-3);
    expect(input.longLeg.name).toBe('ETH');
    expect(input.longLeg.lowerPrice).toBe(100);
    expect(input.longLeg.minTradeQuantity).toBe(0.001);
    expect(input.shortLeg.minTradeQuantity).toBe(0.0001);
    expect(input.shortLeg.openOnCreate).toBe(false);
  });

  it('validates the long and short leg minimum trade quantities independently', () => {
    const baseInput = {
      name: 'hedge grid',
      longScenarioChangePercent: -40,
      shortScenarioChangePercent: 40,
      longLeg: {
        name: 'ETH long',
        lowerPrice: 100,
        upperPrice: 200,
        entryPrice: 150,
        currentPrice: 150,
        openOnCreate: true,
        gridMode: GRID_MODE_ARITHMETIC,
        gridCount: 4,
        leverage: 5,
        investment: 400,
        additionalInvestment: 0,
      },
      shortLeg: {
        name: 'BTC short',
        lowerPrice: 100,
        upperPrice: 200,
        entryPrice: 150,
        currentPrice: 150,
        openOnCreate: true,
        gridMode: GRID_MODE_ARITHMETIC,
        gridCount: 4,
        leverage: 5,
        investment: 400,
        additionalInvestment: 0,
      },
    };

    expect(() =>
      calculateContractHedgeGrid({
        ...baseInput,
        longLeg: {
          ...baseInput.longLeg,
          upperPrice: 100000,
          investment: 10,
          leverage: 10,
          gridCount: 200,
          minTradeQuantity: 0.001,
        },
        shortLeg: {
          ...baseInput.shortLeg,
          minTradeQuantity: 0.0001,
        },
      }),
    ).toThrow(/最小成交数量不足.*最大网格数.*最低保证金/);

    const result = calculateContractHedgeGrid({
      ...baseInput,
      longLeg: {
        ...baseInput.longLeg,
        minTradeQuantity: 0.001,
      },
      shortLeg: {
        ...baseInput.shortLeg,
        minTradeQuantity: 0.0001,
      },
    });

    expect(result.longLegResult.minTradeQuantity).toBe(0.001);
    expect(result.shortLegResult.minTradeQuantity).toBe(0.0001);
  });

  it('rounds each hedge leg down to its own largest tradable quantity', () => {
    const result = calculateContractHedgeGrid({
      name: 'hedge rounding',
      longScenarioChangePercent: 0,
      shortScenarioChangePercent: 0,
      longLeg: {
        name: 'ETH long',
        lowerPrice: 100,
        upperPrice: 200,
        entryPrice: 150,
        currentPrice: 150,
        openOnCreate: false,
        gridMode: GRID_MODE_ARITHMETIC,
        gridCount: 4,
        leverage: 1,
        investment: 21,
        additionalInvestment: 0,
        minTradeQuantity: 0.01,
      },
      shortLeg: {
        name: 'BTC short',
        lowerPrice: 100,
        upperPrice: 200,
        entryPrice: 150,
        currentPrice: 150,
        openOnCreate: false,
        gridMode: GRID_MODE_ARITHMETIC,
        gridCount: 4,
        leverage: 2,
        investment: 13,
        additionalInvestment: 0,
        minTradeQuantity: 0.01,
      },
    });

    expect(result.longLegResult.minimumPerGridQuantity).toBeCloseTo(0.02625);
    expect(result.longLegResult.tradableGridUnits).toBe(2);
    expect(result.longLegResult.tradablePerGridQuantity).toBe(0.02);
    expect(result.longLegResult.tradablePerGridMargin).toBe(4);
    expect(result.longLegResult.unallocatedMargin).toBe(5);
    expect(result.longLegResult.gridOrders.map((order) => order.quantity)).toEqual([0.02, 0.02, 0.02, 0.02]);
    expect(result.longLegResult.gridMargins).toEqual([2, 2.5, 3, 3.5]);
    expect(result.shortLegResult.minimumPerGridQuantity).toBeCloseTo(0.0325);
    expect(result.shortLegResult.tradableGridUnits).toBe(3);
    expect(result.shortLegResult.tradablePerGridQuantity).toBe(0.03);
    expect(result.shortLegResult.tradablePerGridMargin).toBe(3);
    expect(result.shortLegResult.unallocatedMargin).toBe(1);
    expect(result.shortLegResult.gridOrders.map((order) => order.quantity)).toEqual([0.03, 0.03, 0.03, 0.03]);
    expect(result.shortLegResult.gridMargins).toEqual([1.5, 1.875, 2.25, 2.625]);
  });
});
