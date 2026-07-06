import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTRACT_SIDE_NEUTRAL } from '../strategies/common/grid';
import { getHealth } from './useContractGridStrategies';

describe('useContractGridStrategies', () => {
  beforeEach(() => {
    const storage = new Map();
    vi.stubGlobal('localStorage', {
      clear: () => storage.clear(),
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key),
      setItem: (key, value) => storage.set(key, String(value)),
    });
    localStorage.clear();
  });

  it('infers minimum trade quantity for old saved strategies that do not have the field', async () => {
    localStorage.setItem(
      'contract-grid-strategies',
      JSON.stringify({
        strategies: [
          {
            id: 'old-btc',
            updatedAt: 1,
            name: 'BTCUSDT old grid',
            lowerPrice: 60000,
            upperPrice: 120000,
            entryPrice: 90000,
            currentPrice: 90000,
            openOnCreate: false,
            gridMode: 'geometric',
            gridCount: 100,
            side: 'long',
            leverage: 10,
            investment: 500,
            additionalInvestment: 0,
            feeRate: 0.02,
          },
        ],
      }),
    );

    vi.resetModules();
    const { useContractGridStrategies } = await import('./useContractGridStrategies');
    const store = useContractGridStrategies();

    expect(store.activeInput.value.minTradeQuantity).toBe(0.0001);
  });
});

describe('getHealth', () => {
  it('calculates neutral liquidation buffer by absolute distance to the nearest liquidation price', () => {
    const health = getHealth(
      {
        estimatedGridLiquidationPrice: 140,
      },
      {
        currentPrice: 150,
        side: CONTRACT_SIDE_NEUTRAL,
      },
    );

    expect(health.distance).toBeCloseTo(6.6666666667);
    expect(health.tone).toBe('danger');
  });
});
