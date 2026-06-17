import { computed, effectScope, reactive, ref, watch } from 'vue';
import { calculateContractHedgeGrid, normalizeHedgeGridInput } from '../strategies/contract/hedgeGrid';
import { contractHedgeGridPresets, defaultContractHedgeGridInput } from '../strategies/contract/hedgeGridDefaults';

const STORAGE_KEY = 'contract-hedge-grid-strategies';
const STORAGE_VERSION = 1;

let store;

export function useContractHedgeGridStrategies() {
  if (store) return store;

  const strategies = ref(loadStrategies());
  const selectedId = ref(strategies.value[0]?.id ?? '');
  const form = reactive(cloneInput(defaultContractHedgeGridInput));
  const scope = effectScope(true);

  scope.run(() => {
    watch(strategies, persistStrategies, { deep: true, flush: 'sync' });
  });

  const selectedStrategy = computed(() => strategies.value.find((strategy) => strategy.id === selectedId.value));

  scope.run(() => {
    watch(
      selectedStrategy,
      (strategy) => {
        if (strategy) replaceForm(strategy);
      },
      { immediate: true },
    );
  });

  const calculation = computed(() => calculateStrategy(form));
  const result = computed(() => calculation.value.result);
  const activeInput = computed(() => calculation.value.input);
  const strategySummaries = computed(() =>
    strategies.value.map((strategy) => ({
      strategy,
      calculation: calculateStrategy(strategy),
    })),
  );
  const formIsSaved = computed(() => {
    if (!selectedStrategy.value) return false;
    return (
      JSON.stringify(normalizeHedgeGridInput(selectedStrategy.value)) === JSON.stringify(normalizeHedgeGridInput(form))
    );
  });

  store = {
    activeInput,
    addStrategy,
    calculation,
    deleteStrategy,
    duplicateStrategy,
    form,
    formIsSaved,
    presets: contractHedgeGridPresets,
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

  function addStrategy() {
    const draft = {
      ...cloneInput(defaultContractHedgeGridInput),
      name: uniqueStrategyName(strategies.value, '新对冲合约网格'),
    };
    selectedId.value = '';
    replaceForm(draft);
    return draft;
  }

  function deleteStrategy(id) {
    const deleted = strategies.value.find((strategy) => strategy.id === id);
    if (strategies.value.length === 1) {
      strategies.value = [];
      selectedId.value = '';
      replaceForm(defaultContractHedgeGridInput);
      persistStrategies(strategies.value);
      return { ok: true, strategy: deleted, message: '策略已删除' };
    }

    const deleteIndex = strategies.value.findIndex((strategy) => strategy.id === id);
    strategies.value = strategies.value.filter((strategy) => strategy.id !== id);
    if (selectedId.value === id) {
      selectedId.value = strategies.value[Math.max(deleteIndex - 1, 0)]?.id || strategies.value[0]?.id || '';
    }
    persistStrategies(strategies.value);
    return { ok: true, strategy: deleted, message: '策略已删除' };
  }

  function duplicateStrategy() {
    const strategy = createStrategy({
      ...normalizeHedgeGridInput(form),
      name: uniqueStrategyName(strategies.value, `${form.name || '对冲合约网格'} 副本`),
    });
    strategies.value = [strategy, ...strategies.value];
    selectedId.value = strategy.id;
    persistStrategies(strategies.value);
    return strategy;
  }

  function resetForm() {
    replaceForm(selectedStrategy.value || defaultContractHedgeGridInput);
  }

  function saveStrategy() {
    if (calculation.value.error) return { ok: false, message: calculation.value.error };

    const index = strategies.value.findIndex((strategy) => strategy.id === selectedId.value);
    const saved = {
      id: selectedId.value || crypto.randomUUID(),
      updatedAt: Date.now(),
      ...normalizeHedgeGridInput(form),
    };

    if (index >= 0) strategies.value.splice(index, 1, saved);
    else strategies.value.unshift(saved);
    selectedId.value = saved.id;
    persistStrategies(strategies.value);
    return { ok: true, strategy: saved, message: '策略已保存' };
  }

  function selectStrategy(id) {
    selectedId.value = id;
  }

  function setPreset(preset) {
    replaceForm(preset);
  }

  function replaceForm(input) {
    const cloned = cloneInput(input);
    Object.assign(form, cloned);
    form.longLeg = cloned.longLeg;
    form.shortLeg = cloned.shortLeg;
  }
}

export function calculateStrategy(strategy) {
  try {
    const input = normalizeHedgeGridInput(strategy);
    return {
      error: '',
      input,
      result: calculateContractHedgeGrid(input),
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

function cloneInput(input) {
  return {
    ...input,
    longLeg: { ...input.longLeg },
    shortLeg: { ...input.shortLeg },
  };
}

function loadStrategies() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const savedStrategies = Array.isArray(saved) ? saved : saved?.strategies;
    if (Array.isArray(savedStrategies) && savedStrategies.length > 0) {
      return savedStrategies.map((strategy) => ({
        ...cloneInput(defaultContractHedgeGridInput),
        ...strategy,
        longLeg: { ...defaultContractHedgeGridInput.longLeg, ...strategy.longLeg },
        shortLeg: { ...defaultContractHedgeGridInput.shortLeg, ...strategy.shortLeg },
      }));
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

function persistStrategies(items) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        updatedAt: new Date().toISOString(),
        strategies: items,
      }),
    );
  } catch {
    // Keep the in-memory workflow available if browser storage fails.
  }
}

function uniqueStrategyName(strategies, baseName) {
  const existingNames = new Set(strategies.map((strategy) => strategy.name));
  if (!existingNames.has(baseName)) return baseName;
  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) {
    index += 1;
  }
  return `${baseName} ${index}`;
}
