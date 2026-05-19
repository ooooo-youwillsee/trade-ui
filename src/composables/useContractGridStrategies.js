import { computed, effectScope, reactive, ref, watch } from 'vue';
import { calculateContractGrid, CONTRACT_SIDE_LONG, normalizeInput } from '../contractGrid';
import { defaultInput, presets } from '../strategyDefaults';

const STORAGE_KEY = 'contract-grid-strategies';
const STORAGE_VERSION = 1;
let strategyStore;
let strategyStoreScope;

export function useContractGridStrategies() {
  if (strategyStore) return strategyStore;

  const strategies = ref(loadStrategies());
  const selectedId = ref(strategies.value[0]?.id ?? '');
  const form = reactive({ ...defaultInput });
  strategyStoreScope = effectScope(true);

  strategyStoreScope.run(() => {
    watch(
      strategies,
      (items) => {
        persistStrategies(items);
      },
      { deep: true, flush: 'sync' },
    );
  });

  const selectedStrategy = computed(() => strategies.value.find((strategy) => strategy.id === selectedId.value));

  strategyStoreScope.run(() => {
    watch(
      selectedStrategy,
      (strategy) => {
        if (strategy) {
          Object.assign(form, strategy);
        }
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
    const strategy = selectedStrategy.value;
    if (!strategy) return false;
    return JSON.stringify(normalizeInput(strategy)) === JSON.stringify(normalizeInput(form));
  });

  function selectStrategy(id) {
    selectedId.value = id;
  }

  function resetForm() {
    Object.assign(form, selectedStrategy.value || defaultInput);
  }

  function setPreset(preset) {
    Object.assign(form, preset);
  }

  function addStrategy() {
    const draft = {
      ...defaultInput,
      name: uniqueStrategyName(strategies.value, '新合约网格'),
    };
    selectedId.value = '';
    Object.assign(form, draft);
    return draft;
  }

  function duplicateStrategy() {
    const strategy = createStrategy({
      ...stripMeta(form),
      name: uniqueStrategyName(strategies.value, `${form.name || '合约网格'} 副本`),
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
      ...normalizeInput(form),
    };

    if (index >= 0) {
      strategies.value.splice(index, 1, saved);
    } else {
      strategies.value.unshift(saved);
    }
    selectedId.value = saved.id;
    persistStrategies(strategies.value);
    return { ok: true, strategy: saved, message: '策略已保存' };
  }

  function deleteStrategy(id) {
    const deleted = strategies.value.find((strategy) => strategy.id === id);
    if (strategies.value.length === 1) {
      Object.assign(form, defaultInput);
      strategies.value = [];
      selectedId.value = '';
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

  function exportStrategies() {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        version: 1,
        strategies: strategies.value,
      },
      null,
      2,
    );
  }

  function importStrategies(jsonText) {
    let payload;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      return { ok: false, message: 'JSON 格式不正确' };
    }

    const importedStrategies = Array.isArray(payload) ? payload : payload?.strategies;
    if (!Array.isArray(importedStrategies) || importedStrategies.length === 0) {
      return { ok: false, message: '没有可导入的策略数据' };
    }

    const normalized = importedStrategies.map((strategy) => ({
      ...defaultInput,
      ...strategy,
      id: strategy.id || crypto.randomUUID(),
      updatedAt: strategy.updatedAt || Date.now(),
    }));
    strategies.value = normalized;
    selectedId.value = normalized[0].id;
    persistStrategies(strategies.value);
    return { ok: true, count: normalized.length, message: `已导入 ${normalized.length} 个策略` };
  }

  strategyStore = {
    activeInput,
    addStrategy,
    calculation,
    deleteStrategy,
    duplicateStrategy,
    exportStrategies,
    form,
    formIsSaved,
    importStrategies,
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
  return strategyStore;
}

export function calculateStrategy(strategy) {
  try {
    const input = normalizeInput(strategy);
    return {
      error: '',
      input,
      result: calculateContractGrid(input),
    };
  } catch (error) {
    return {
      error: error.message,
      input: null,
      result: null,
    };
  }
}

export function currentYieldRate(strategyResult) {
  if (!strategyResult?.filledMargin) return 0;
  return (strategyResult.floatingProfitLoss / strategyResult.filledMargin) * 100;
}

export function getHealth(strategyResult, input) {
  if (!strategyResult || !input) return { label: '参数异常', tone: 'danger', distance: 0 };
  const liquidation = strategyResult.estimatedGridLiquidationPrice;
  const current = input.currentPrice;
  if (liquidation === 0 || current === 0) return { label: '未形成仓位', tone: 'muted', distance: 0 };

  const distance =
    input.side === CONTRACT_SIDE_LONG ? ((current - liquidation) / current) * 100 : ((liquidation - current) / current) * 100;

  if (distance < 8) return { label: '强平缓冲偏窄', tone: 'danger', distance };
  if (distance < 20) return { label: '强平缓冲一般', tone: 'warning', distance };
  return { label: '强平缓冲充足', tone: 'success', distance };
}

function createStrategy(input = defaultInput) {
  return {
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    ...input,
  };
}

function loadStrategies() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const savedStrategies = Array.isArray(saved) ? saved : saved?.strategies;
    if (Array.isArray(savedStrategies) && savedStrategies.length > 0) {
      return savedStrategies.map((strategy) => ({ ...defaultInput, ...strategy }));
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

function persistStrategies(strategies) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
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
    gridCount: Number(input.gridCount),
    lowerPrice: Number(input.lowerPrice),
    upperPrice: Number(input.upperPrice),
    entryPrice: Number(input.entryPrice),
    currentPrice: Number(input.currentPrice),
    leverage: Number(input.leverage),
    investment: Number(input.investment),
    additionalInvestment: Number(input.additionalInvestment),
  };
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
