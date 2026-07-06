import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { useContractHedgeGridStrategies } from './useContractHedgeGridStrategies';

describe('useContractHedgeGridStrategies', () => {
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

  it('saves, duplicates, and deletes hedge grid strategies in their own storage key', async () => {
    const store = useContractHedgeGridStrategies();

    store.addStrategy();
    store.form.name = 'ETH BTC hedge';
    store.form.longLeg.name = 'ETHUSDT';
    store.form.shortLeg.name = 'BTCUSDT';

    const saved = store.saveStrategy();
    await nextTick();

    expect(saved.ok).toBe(true);
    expect(store.strategies.value).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('contract-hedge-grid-strategies')).strategies).toHaveLength(1);
    expect(localStorage.getItem('contract-grid-strategies')).toBeNull();

    const duplicated = store.duplicateStrategy();
    await nextTick();

    expect(duplicated.name).toContain('副本');
    expect(store.strategies.value).toHaveLength(2);

    const deleted = store.deleteStrategy(saved.strategy.id);
    await nextTick();

    expect(deleted.ok).toBe(true);
    expect(store.strategies.value).toHaveLength(1);
    expect(store.strategies.value[0].id).toBe(duplicated.id);
  });

  it('infers minimum trade quantities for old saved hedge legs that do not have the field', async () => {
    localStorage.setItem(
      'contract-hedge-grid-strategies',
      JSON.stringify({
        strategies: [
          {
            id: 'old-hedge',
            updatedAt: 1,
            name: 'old hedge',
            longScenarioChangePercent: -10,
            shortScenarioChangePercent: 10,
            longLeg: {
              name: 'BTCUSDT long',
              lowerPrice: 60000,
              upperPrice: 120000,
              entryPrice: 90000,
              currentPrice: 90000,
              openOnCreate: false,
              gridMode: 'geometric',
              gridCount: 100,
              leverage: 10,
              investment: 500,
              additionalInvestment: 0,
            },
            shortLeg: {
              name: 'ETHUSDT short',
              lowerPrice: 900,
              upperPrice: 4500,
              entryPrice: 2300,
              currentPrice: 2300,
              openOnCreate: false,
              gridMode: 'geometric',
              gridCount: 100,
              leverage: 10,
              investment: 500,
              additionalInvestment: 0,
            },
          },
        ],
      }),
    );

    vi.resetModules();
    const { useContractHedgeGridStrategies } = await import('./useContractHedgeGridStrategies');
    const store = useContractHedgeGridStrategies();

    expect(store.activeInput.value.longLeg.minTradeQuantity).toBe(0.0001);
    expect(store.activeInput.value.shortLeg.minTradeQuantity).toBe(0.001);
  });
});
