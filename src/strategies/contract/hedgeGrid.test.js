import { describe, expect, it } from 'vitest';
import { GRID_MODE_ARITHMETIC, POSITION_INCREMENT_RATIO } from '../common/grid';
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
      positionIncrementMode: POSITION_INCREMENT_RATIO,
      positionIncrementValue: 0,
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
      positionIncrementMode: POSITION_INCREMENT_RATIO,
      positionIncrementValue: 0,
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

    expect(result.shortRequiredMarginAmount).toBeCloseTo(305.3571428571);
    expect(result.requiredMarginAmount).toBeCloseTo(305.3571428571);
  });

  it('calculates required margin when the long leg falls toward liquidation', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longScenarioChangePercent: -50,
      shortScenarioChangePercent: 0,
    });

    expect(result.longRequiredMarginAmount).toBeCloseTo(425);
    expect(result.requiredMarginAmount).toBeCloseTo(425);
  });

  it('uses profitable scenario floating profit to cover required margin', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longScenarioChangePercent: -10,
      shortScenarioChangePercent: -50,
    });

    expect(result.requiredMarginAmount).toBeCloseTo(0);
    expect(result.availableTransferAmount).toBeCloseTo(250);
    expect(result.marginShortfall).toBe(0);
  });

  it('reports the shortfall when profitable floating profit is not enough', () => {
    const result = calculateContractHedgeGrid({
      ...validInput,
      longScenarioChangePercent: -50,
      shortScenarioChangePercent: -10,
    });

    expect(result.requiredMarginAmount).toBeCloseTo(425);
    expect(result.availableTransferAmount).toBeCloseTo(100);
    expect(result.marginShortfall).toBeCloseTo(325);
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

    expect(result.longLegResult.currentNotional).toBe(500);
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

    expect(result.shortLegResult.currentNotional).toBe(500);
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
    expect(result.longScenarioResult.realizedProfitLoss).toBe(100);
    expect(result.longScenarioResult.totalProfitLoss).toBe(100);
    expect(result.scenarioTotalProfitLoss).toBeCloseTo(
      result.longScenarioResult.totalProfitLoss + result.shortScenarioResult.totalProfitLoss,
    );
    expect(result.availableTransferAmount).toBe(100);
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
    expect(result.shortScenarioResult.realizedProfitLoss).toBeCloseTo(71.4285714286);
    expect(result.shortScenarioResult.totalProfitLoss).toBeCloseTo(71.4285714286);
    expect(result.scenarioTotalProfitLoss).toBeCloseTo(
      result.longScenarioResult.totalProfitLoss + result.shortScenarioResult.totalProfitLoss,
    );
    expect(result.availableTransferAmount).toBeCloseTo(71.4285714286);
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
        positionIncrementMode: POSITION_INCREMENT_RATIO,
        positionIncrementValue: '10',
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
        positionIncrementMode: POSITION_INCREMENT_RATIO,
        positionIncrementValue: '0',
      },
    });

    expect(input.name).toBe('hedge');
    expect(input.longScenarioChangePercent).toBe(5);
    expect(input.shortScenarioChangePercent).toBe(-3);
    expect(input.longLeg.name).toBe('ETH');
    expect(input.longLeg.lowerPrice).toBe(100);
    expect(input.shortLeg.openOnCreate).toBe(false);
  });
});
