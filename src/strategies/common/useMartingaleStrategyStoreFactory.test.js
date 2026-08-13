import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MARTINGALE_MODE_FUTURES, MARTINGALE_MODE_SPOT, MARTINGALE_PLATFORM_GATE } from './martingale';
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
    ['legacy version', { version: 1, strategies: [{ name: 'legacy strategy', currentPrice: '2050' }] }],
    ['unknown version', { version: 999, strategies: [{ name: 'legacy strategy', currentPrice: '2050' }] }],
    ['missing version', { strategies: [{ name: 'legacy strategy', currentPrice: '2050' }] }],
    ['bare array', [{ name: 'legacy strategy', currentPrice: '2050' }]],
  ])('restores %s without using its version', (name, saved) => {
    const storageKey = `martingale-compatible-${name}`;
    localStorage.setItem(storageKey, JSON.stringify(saved));

    const store = createStore({ storageKey });
    const strategy = store.strategies.value[0];
    const persisted = JSON.parse(localStorage.getItem(storageKey));

    expect(store.strategies.value).toHaveLength(1);
    expect(strategy).toMatchObject({
      name: 'legacy strategy',
      mode: MARTINGALE_MODE_SPOT,
      entryPrice: defaultSpotMartingaleInput.entryPrice,
      currentPrice: 2050,
      feeRate: defaultSpotMartingaleInput.feeRate,
      priceGapMultiplier: defaultSpotMartingaleInput.priceGapMultiplier,
    });
    expect(strategy.id).toEqual(expect.any(String));
    expect(strategy.updatedAt).toEqual(expect.any(Number));
    expect(persisted.version).toBe(5);
    expect(persisted.strategies).toEqual(store.strategies.value);
  });

  it.each([
    ['spot', MARTINGALE_MODE_SPOT, MARTINGALE_MODE_FUTURES, defaultSpotMartingaleInput],
    ['futures', MARTINGALE_MODE_FUTURES, MARTINGALE_MODE_SPOT, defaultContractMartingaleInput],
  ])('fills missing %s inputs from its market defaults and forces its mode', (_name, mode, savedMode, defaultInput) => {
    const storageKey = `martingale-defaults-${mode}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 'ignored',
        strategies: [{ name: 'partial strategy', mode: savedMode, currentPrice: '2100', totalCapital: 1000 }],
      }),
    );

    const store = createStore({ defaultInput, mode, storageKey });
    const strategy = store.strategies.value[0];

    expect(strategy).toMatchObject({
      name: 'partial strategy',
      mode,
      entryPrice: defaultInput.entryPrice,
      currentPrice: 2100,
      firstOrderAmount: defaultInput.firstOrderAmount,
      multiplier: defaultInput.multiplier,
      priceGapMultiplier: defaultInput.priceGapMultiplier,
      executionPlatform: MARTINGALE_PLATFORM_GATE,
      useFreeParameters: false,
      customLayers: [],
      feeRate: defaultInput.feeRate,
      leverage: defaultInput.leverage,
    });
    expect(strategy).not.toHaveProperty('totalCapital');
  });

  it('repairs metadata, skips invalid records, and keeps rewritten v5 data stable', () => {
    const storageKey = 'martingale-repair-metadata';
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 2,
        strategies: [
          { ...defaultSpotMartingaleInput, name: 'kept id', id: 'duplicate', updatedAt: 1 },
          { ...defaultSpotMartingaleInput, name: 'replaced duplicate', id: 'duplicate', updatedAt: 'invalid' },
          { ...defaultSpotMartingaleInput, name: 'generated metadata' },
          { ...defaultSpotMartingaleInput, name: 'invalid strategy', currentPrice: null },
          null,
        ],
      }),
    );

    const firstStore = createStore({ storageKey });
    const firstIds = firstStore.strategies.value.map((strategy) => strategy.id);
    const persisted = JSON.parse(localStorage.getItem(storageKey));
    const secondStore = createStore({ storageKey });

    expect(firstStore.strategies.value.map((strategy) => strategy.name)).toEqual([
      'kept id',
      'replaced duplicate',
      'generated metadata',
    ]);
    expect(new Set(firstIds).size).toBe(3);
    expect(firstIds[0]).toBe('duplicate');
    expect(firstStore.strategies.value[0].updatedAt).toBe(1);
    expect(firstStore.strategies.value.slice(1).every((strategy) => Number.isFinite(strategy.updatedAt))).toBe(true);
    expect(persisted).toMatchObject({ version: 5, strategies: firstStore.strategies.value });
    expect(secondStore.strategies.value.map((strategy) => strategy.id)).toEqual(firstIds);
  });

  it.each([
    ['broken json', '{broken'],
    ['non-array strategies', JSON.stringify({ version: 4, strategies: {} })],
    ['missing strategies', JSON.stringify({ version: 4 })],
    ['empty strategies', JSON.stringify({ version: 4, strategies: [] })],
    [
      'all invalid strategies',
      JSON.stringify({
        strategies: [
          { ...defaultSpotMartingaleInput, currentPrice: null },
          { ...defaultSpotMartingaleInput, feeRate: '' },
          { ...defaultSpotMartingaleInput, entryPrice: true },
        ],
      }),
    ],
  ])('clears %s when no strategy can be restored', (name, serialized) => {
    const storageKey = `martingale-invalid-${name}`;
    localStorage.setItem(storageKey, serialized);

    const store = createStore({ storageKey });

    expect(store.strategies.value).toEqual([]);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it.each([
    ['spot', MARTINGALE_MODE_SPOT, defaultSpotMartingaleInput],
    ['futures', MARTINGALE_MODE_FUTURES, defaultContractMartingaleInput],
  ])('restores valid v5 %s strategies with numeric inputs', (_name, mode, defaultInput) => {
    const storageKey = `martingale-v5-${mode}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 5,
        strategies: [
          {
            ...defaultInput,
            id: `${mode}-1`,
            updatedAt: 1,
            entryPrice: '2100.5',
            currentPrice: '2050',
            feeRate: '0.02',
            priceGapMultiplier: '1.5',
            maxLayers: 3,
          },
        ],
      }),
    );

    const store = createStore({ defaultInput, mode, storageKey });

    expect(store.strategies.value).toHaveLength(1);
    expect(store.activeInput.value.entryPrice).toBe(2100.5);
    expect(store.activeInput.value.currentPrice).toBe(2050);
    expect(store.activeInput.value.feeRate).toBe(0.02);
    expect(store.activeInput.value.priceGapMultiplier).toBe(1.5);
    expect(store.activeInput.value.mode).toBe(mode);
  });

  it('saves and duplicates only the v5 input contract', () => {
    const storageKey = 'martingale-save-v5';
    const store = createStore({ storageKey });
    store.addStrategy();
    Object.assign(store.form, {
      name: 'persisted strategy',
      entryPrice: '100',
      currentPrice: '89',
      priceGapMultiplier: '1.5',
      maxLayers: 3,
      executionPlatform: MARTINGALE_PLATFORM_GATE,
      useFreeParameters: true,
      customLayers: [
        { gapPercent: 0, amountShares: 1 },
        { gapPercent: '2.5', amountShares: '1.5' },
      ],
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
    expect(saved.strategy.feeRate).toBe(0.02);
    expect(saved.strategy.priceGapMultiplier).toBe(1.5);
    expect(saved.strategy.customLayers).toEqual([
      { gapPercent: 0, amountShares: 1 },
      { gapPercent: 2.5, amountShares: 1.5 },
    ]);
    expect(duplicated.entryPrice).toBe(100);
    expect(duplicated.feeRate).toBe(0.02);
    expect(duplicated.priceGapMultiplier).toBe(1.5);
    expect(persisted.version).toBe(5);
    expect(persisted.strategies).toHaveLength(2);
    for (const strategy of persisted.strategies) {
      expect(strategy.entryPrice).toBe(100);
      expect(strategy.priceGapMultiplier).toBe(1.5);
      expect(strategy.executionPlatform).toBe(MARTINGALE_PLATFORM_GATE);
      expect(strategy.useFreeParameters).toBe(true);
      expect(strategy.customLayers).toEqual([
        { gapPercent: 0, amountShares: 1 },
        { gapPercent: 2.5, amountShares: 1.5 },
      ]);
      expect(strategy).not.toHaveProperty('totalCapital');
      expect(strategy).not.toHaveProperty('maintenanceMarginRate');
      expect(strategy).not.toHaveProperty('includeInitialOrder');
      expect(strategy).not.toHaveProperty('restrictByCapital');
    }
  });
});
