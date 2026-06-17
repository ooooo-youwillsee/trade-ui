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
});
