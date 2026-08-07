import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MARTINGALE_MODE_FUTURES, MARTINGALE_MODE_SPOT } from './martingale';
import { createMartingaleStrategyStore } from './useMartingaleStrategyStoreFactory';
import { defaultContractMartingaleInput } from '../contract/martingaleDefaults';
import { defaultSpotMartingaleInput } from '../spot/martingaleDefaults';

function createStore({ defaultInput = defaultSpotMartingaleInput, mode = MARTINGALE_MODE_SPOT, storageKey }) {
  return createMartingaleStrategyStore({
    defaultInput,
    mode,
    newName: 'new martingale',
    presets: [],
    storageKey,
  })();
}

describe('createMartingaleStrategyStore', () => {
  beforeEach(() => {
    const storage = new Map();
    vi.stubGlobal('localStorage', {
      clear: () => storage.clear(),
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key),
      setItem: (key, value) => storage.set(key, String(value)),
    });
  });

  it.each([
    ['v1 envelope', JSON.stringify({ version: 1, strategies: [{ name: 'old' }] })],
    ['bare array', JSON.stringify([{ name: 'old' }])],
    ['missing version', JSON.stringify({ strategies: [{ name: 'old' }] })],
    ['broken json', '{broken'],
  ])('clears %s without migrating it', (name, serialized) => {
    const storageKey = `martingale-invalid-${name}`;
    localStorage.setItem(storageKey, serialized);

    const store = createStore({ storageKey });

    expect(store.strategies.value).toEqual([]);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it.each([
    ['missing entry price', [{ ...defaultSpotMartingaleInput, id: 'spot-1', updatedAt: 1, entryPrice: null }]],
    ['missing id', [{ ...defaultSpotMartingaleInput, updatedAt: 1 }]],
    [
      'duplicate id',
      [
        { ...defaultSpotMartingaleInput, id: 'duplicate', updatedAt: 1 },
        { ...defaultSpotMartingaleInput, id: 'duplicate', updatedAt: 2 },
      ],
    ],
  ])('clears structurally invalid v2 data: %s', (name, strategies) => {
    const storageKey = `martingale-invalid-v2-${name}`;
    localStorage.setItem(storageKey, JSON.stringify({ version: 2, strategies }));

    const store = createStore({ storageKey });

    expect(store.strategies.value).toEqual([]);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it.each([
    ['spot', MARTINGALE_MODE_SPOT, defaultSpotMartingaleInput],
    ['futures', MARTINGALE_MODE_FUTURES, defaultContractMartingaleInput],
  ])('restores valid v2 %s strategies with numeric entry price', (_name, mode, defaultInput) => {
    const storageKey = `martingale-v2-${mode}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 2,
        strategies: [
          {
            ...defaultInput,
            id: `${mode}-1`,
            updatedAt: 1,
            entryPrice: '2100.5',
            currentPrice: '2050',
          },
        ],
      }),
    );

    const store = createStore({ defaultInput, mode, storageKey });

    expect(store.strategies.value).toHaveLength(1);
    expect(store.activeInput.value.entryPrice).toBe(2100.5);
    expect(store.activeInput.value.currentPrice).toBe(2050);
    expect(store.activeInput.value.mode).toBe(mode);
  });

  it('saves and duplicates only the v2 input contract', () => {
    const storageKey = 'martingale-save-v2';
    const store = createStore({ storageKey });
    store.addStrategy();
    Object.assign(store.form, {
      name: 'persisted strategy',
      entryPrice: '100',
      currentPrice: '89',
      totalCapital: 1000,
      maintenanceMarginRate: 0.005,
      includeInitialOrder: false,
      restrictByCapital: true,
    });

    const saved = store.saveStrategy();
    const duplicated = store.duplicateStrategy();
    const persisted = JSON.parse(localStorage.getItem(storageKey));

    expect(saved.ok).toBe(true);
    expect(saved.strategy.entryPrice).toBe(100);
    expect(duplicated.entryPrice).toBe(100);
    expect(persisted.version).toBe(2);
    expect(persisted.strategies).toHaveLength(2);
    for (const strategy of persisted.strategies) {
      expect(strategy.entryPrice).toBe(100);
      expect(strategy).not.toHaveProperty('totalCapital');
      expect(strategy).not.toHaveProperty('maintenanceMarginRate');
      expect(strategy).not.toHaveProperty('includeInitialOrder');
      expect(strategy).not.toHaveProperty('restrictByCapital');
    }
  });
});
