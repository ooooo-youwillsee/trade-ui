import { computed, effectScope, reactive, ref, watch } from 'vue';
import { calculateMartingale, normalizeMartingaleInput } from './martingale';

const STORAGE_VERSION = 1;

export function createMartingaleStrategyStore({ defaultInput, mode, newName, presets, storageKey }) {
  let store;

  return function useFixedMartingaleStrategies() {
    if (store) return store;

    const strategies = ref(loadStrategies(storageKey, defaultInput, mode));
    const selectedId = ref(strategies.value[0]?.id ?? '');
    const form = reactive({ ...defaultInput, mode });
    const scope = effectScope(true);

    scope.run(() => {
      watch(
        strategies,
        (items) => {
          persistStrategies(storageKey, items);
        },
        { deep: true, flush: 'sync' },
      );
    });

    const selectedStrategy = computed(() => strategies.value.find((strategy) => strategy.id === selectedId.value));

    scope.run(() => {
      watch(
        selectedStrategy,
        (strategy) => {
          if (strategy) Object.assign(form, { ...strategy, mode });
        },
        { immediate: true },
      );
    });

    const calculation = computed(() => calculateStrategy({ ...form, mode }));
    const result = computed(() => calculation.value.result);
    const activeInput = computed(() => calculation.value.input);
    const strategySummaries = computed(() =>
      strategies.value.map((strategy) => ({
        strategy,
        calculation: calculateStrategy(strategy),
      })),
    );
    const formIsSaved = computed(() => {
      const strategy = selectedStrategy.value;
      if (!strategy) return false;
      return (
        JSON.stringify(normalizeMartingaleInput(strategy)) ===
        JSON.stringify(normalizeMartingaleInput({ ...form, mode }))
      );
    });

    function selectStrategy(id) {
      selectedId.value = id;
    }

    function resetForm() {
      Object.assign(form, selectedStrategy.value || defaultInput, { mode });
    }

    function setPreset(preset) {
      Object.assign(form, preset, { mode });
    }

    function addStrategy() {
      const draft = {
        ...defaultInput,
        mode,
        name: uniqueStrategyName(strategies.value, newName),
      };
      selectedId.value = '';
      Object.assign(form, draft);
      return draft;
    }

    function duplicateStrategy() {
      const strategy = createStrategy({
        ...stripMeta(form),
        mode,
        name: uniqueStrategyName(strategies.value, `${form.name || '马丁策略'} 副本`),
      });
      strategies.value = [strategy, ...strategies.value];
      selectedId.value = strategy.id;
      persistStrategies(storageKey, strategies.value);
      return strategy;
    }

    function saveStrategy() {
      if (calculation.value.error) return { ok: false, message: calculation.value.error };
      const index = strategies.value.findIndex((strategy) => strategy.id === selectedId.value);
      const saved = {
        id: selectedId.value || crypto.randomUUID(),
        updatedAt: Date.now(),
        ...normalizeMartingaleInput({ ...form, mode }),
      };

      if (index >= 0) strategies.value.splice(index, 1, saved);
      else strategies.value.unshift(saved);
      selectedId.value = saved.id;
      persistStrategies(storageKey, strategies.value);
      return { ok: true, strategy: saved, message: '马丁策略已保存' };
    }

    function deleteStrategy(id) {
      const deleted = strategies.value.find((strategy) => strategy.id === id);
      if (strategies.value.length === 1) {
        Object.assign(form, defaultInput, { mode });
        strategies.value = [];
        selectedId.value = '';
        persistStrategies(storageKey, strategies.value);
        return { ok: true, strategy: deleted, message: '马丁策略已删除' };
      }

      const deleteIndex = strategies.value.findIndex((strategy) => strategy.id === id);
      strategies.value = strategies.value.filter((strategy) => strategy.id !== id);
      if (selectedId.value === id) {
        selectedId.value = strategies.value[Math.max(deleteIndex - 1, 0)]?.id || strategies.value[0]?.id || '';
      }
      persistStrategies(storageKey, strategies.value);
      return { ok: true, strategy: deleted, message: '马丁策略已删除' };
    }

    store = {
      activeInput,
      addStrategy,
      calculation,
      deleteStrategy,
      duplicateStrategy,
      form,
      formIsSaved,
      mode,
      presets,
      resetForm,
      result,
      saveStrategy,
      selectedId,
      selectedStrategy,
      selectStrategy,
      setPreset,
      strategies,
      strategySummaries,
    };
    return store;
  };
}

export function calculateStrategy(strategy) {
  try {
    const input = normalizeMartingaleInput(strategy);
    return {
      error: '',
      input,
      result: calculateMartingale(input),
    };
  } catch (error) {
    return {
      error: error.message,
      input: null,
      result: null,
    };
  }
}

function createStrategy(input) {
  return {
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    ...input,
  };
}

function loadStrategies(storageKey, defaultInput, mode) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const savedStrategies = Array.isArray(saved) ? saved : saved?.strategies;
    if (Array.isArray(savedStrategies) && savedStrategies.length > 0) {
      return savedStrategies.map((strategy) => ({ ...defaultInput, ...strategy, mode }));
    }
  } catch {
    localStorage.removeItem(storageKey);
  }
  return [];
}

function persistStrategies(storageKey, strategies) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: STORAGE_VERSION,
        updatedAt: new Date().toISOString(),
        strategies,
      }),
    );
  } catch {
    // Keep the in-memory workflow available if browser storage is unavailable.
  }
}

function stripMeta(strategy) {
  const { id, updatedAt, ...input } = strategy;
  return {
    ...input,
    currentPrice: Number(input.currentPrice),
    firstOrderAmount: Number(input.firstOrderAmount),
    multiplier: Number(input.multiplier),
    maxLayers: Number(input.maxLayers),
    triggerPercent: Number(input.triggerPercent),
    takeProfitPercent: Number(input.takeProfitPercent),
    totalCapital: Number(input.totalCapital),
    leverage: Number(input.leverage),
    additionalMargin: Number(input.additionalMargin),
    maintenanceMarginRate: Number(input.maintenanceMarginRate),
  };
}

function uniqueStrategyName(strategies, baseName) {
  const existingNames = new Set(strategies.map((strategy) => strategy.name));
  if (!existingNames.has(baseName)) return baseName;
  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}
