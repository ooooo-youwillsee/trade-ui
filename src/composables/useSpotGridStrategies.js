import { computed, effectScope, reactive, ref, watch } from 'vue';
import { calculateSpotGrid, normalizeSpotGridInput } from '../spotGrid';
import { defaultSpotGridInput, spotGridPresets } from '../spotGridDefaults';

const STORAGE_KEY = 'spot-grid-strategies';
const STORAGE_VERSION = 1;
let spotGridStore;

export function useSpotGridStrategies() {
  if (spotGridStore) return spotGridStore;

  const strategies = ref(loadStrategies());
  const selectedId = ref(strategies.value[0]?.id ?? '');
  const form = reactive({ ...defaultSpotGridInput });
  const scope = effectScope(true);

  scope.run(() => {
    watch(
      strategies,
      (items) => persistStrategies(items),
      { deep: true, flush: 'sync' },
    );
  });

  const selectedStrategy = computed(() => strategies.value.find((strategy) => strategy.id === selectedId.value));
  scope.run(() => {
    watch(
      selectedStrategy,
      (strategy) => {
        if (strategy) Object.assign(form, strategy);
      },
      { immediate: true },
    );
  });

  const calculation = computed(() => calculateStrategy(form));
  const result = computed(() => calculation.value.result);
  const activeInput = computed(() => calculation.value.input);
  const strategySummaries = computed(() => strategies.value.map((strategy) => ({ strategy, calculation: calculateStrategy(strategy) })));
  const formIsSaved = computed(() => {
    const strategy = selectedStrategy.value;
    if (!strategy) return false;
    return JSON.stringify(normalizeSpotGridInput(strategy)) === JSON.stringify(normalizeSpotGridInput(form));
  });

  function selectStrategy(id) {
    selectedId.value = id;
  }

  function resetForm() {
    Object.assign(form, selectedStrategy.value || defaultSpotGridInput);
  }

  function setPreset(preset) {
    Object.assign(form, preset);
  }

  function addStrategy() {
    const draft = {
      ...defaultSpotGridInput,
      name: uniqueStrategyName(strategies.value, '新现货网格'),
    };
    selectedId.value = '';
    Object.assign(form, draft);
    return draft;
  }

  function duplicateStrategy() {
    const strategy = createStrategy({
      ...stripMeta(form),
      name: uniqueStrategyName(strategies.value, `${form.name || '现货网格'} 副本`),
    });
    strategies.value = [strategy, ...strategies.value];
    selectedId.value = strategy.id;
    persistStrategies(strategies.value);
    return strategy;
  }

  function saveStrategy() {
    if (calculation.value.error) return { ok: false, message: calculation.value.error };
    const index = strategies.value.findIndex((strategy) => strategy.id === selectedId.value);
    const saved = {
      id: selectedId.value || crypto.randomUUID(),
      updatedAt: Date.now(),
      ...normalizeSpotGridInput(form),
    };
    if (index >= 0) strategies.value.splice(index, 1, saved);
    else strategies.value.unshift(saved);
    selectedId.value = saved.id;
    persistStrategies(strategies.value);
    return { ok: true, strategy: saved, message: '现货网格已保存' };
  }

  function deleteStrategy(id) {
    const deleted = strategies.value.find((strategy) => strategy.id === id);
    if (strategies.value.length === 1) {
      Object.assign(form, defaultSpotGridInput);
      strategies.value = [];
      selectedId.value = '';
      persistStrategies(strategies.value);
      return { ok: true, strategy: deleted, message: '现货网格已删除' };
    }
    const deleteIndex = strategies.value.findIndex((strategy) => strategy.id === id);
    strategies.value = strategies.value.filter((strategy) => strategy.id !== id);
    if (selectedId.value === id) {
      selectedId.value = strategies.value[Math.max(deleteIndex - 1, 0)]?.id || strategies.value[0]?.id || '';
    }
    persistStrategies(strategies.value);
    return { ok: true, strategy: deleted, message: '现货网格已删除' };
  }

  spotGridStore = {
    activeInput,
    addStrategy,
    calculation,
    deleteStrategy,
    duplicateStrategy,
    form,
    formIsSaved,
    presets: spotGridPresets,
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
  return spotGridStore;
}

export function calculateStrategy(strategy) {
  try {
    const input = normalizeSpotGridInput(strategy);
    return { error: '', input, result: calculateSpotGrid(input) };
  } catch (error) {
    return { error: error.message, input: null, result: null };
  }
}

function createStrategy(input = defaultSpotGridInput) {
  return { id: crypto.randomUUID(), updatedAt: Date.now(), ...input };
}

function loadStrategies() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const savedStrategies = Array.isArray(saved) ? saved : saved?.strategies;
    if (Array.isArray(savedStrategies) && savedStrategies.length > 0) {
      return savedStrategies.map((strategy) => ({ ...defaultSpotGridInput, ...strategy }));
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

function persistStrategies(strategies) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, updatedAt: new Date().toISOString(), strategies }));
  } catch {
    // Keep the in-memory workflow available if browser storage is unavailable.
  }
}

function stripMeta(strategy) {
  const { id, updatedAt, ...input } = strategy;
  return {
    ...input,
    lowerPrice: Number(input.lowerPrice),
    upperPrice: Number(input.upperPrice),
    entryPrice: Number(input.entryPrice),
    currentPrice: Number(input.currentPrice),
    gridCount: Number(input.gridCount),
    investment: Number(input.investment),
  };
}

function uniqueStrategyName(strategies, baseName) {
  const existingNames = new Set(strategies.map((strategy) => strategy.name));
  if (!existingNames.has(baseName)) return baseName;
  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}
