import { computed, effectScope, reactive, ref, watch } from 'vue';

const STORAGE_VERSION = 1;

export function createGridStrategyStore({
  calculateStrategy,
  defaultInput,
  deleteMessage,
  duplicateFallbackName,
  enableImportExport = false,
  newName,
  normalizeInput,
  presets,
  saveMessage,
  storageKey,
  stripNumericFields,
}) {
  let store;

  return function useFixedGridStrategies() {
    if (store) return store;

    const strategies = ref(loadStrategies(storageKey, defaultInput));
    const selectedId = ref(strategies.value[0]?.id ?? '');
    const form = reactive({ ...defaultInput });
    const scope = effectScope(true);

    scope.run(() => {
      watch(strategies, (items) => persistStrategies(storageKey, items), {
        deep: true,
        flush: 'sync',
      });
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
        name: uniqueStrategyName(strategies.value, newName),
      };
      selectedId.value = '';
      Object.assign(form, draft);
      return draft;
    }

    function duplicateStrategy() {
      const strategy = createStrategy({
        ...stripMeta(form, stripNumericFields),
        name: uniqueStrategyName(strategies.value, `${form.name || duplicateFallbackName} 副本`),
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
        ...normalizeInput(form),
      };

      if (index >= 0) strategies.value.splice(index, 1, saved);
      else strategies.value.unshift(saved);
      selectedId.value = saved.id;
      persistStrategies(storageKey, strategies.value);
      return { ok: true, strategy: saved, message: saveMessage };
    }

    function deleteStrategy(id) {
      const deleted = strategies.value.find((strategy) => strategy.id === id);
      if (strategies.value.length === 1) {
        Object.assign(form, defaultInput);
        strategies.value = [];
        selectedId.value = '';
        persistStrategies(storageKey, strategies.value);
        return { ok: true, strategy: deleted, message: deleteMessage };
      }

      const deleteIndex = strategies.value.findIndex((strategy) => strategy.id === id);
      strategies.value = strategies.value.filter((strategy) => strategy.id !== id);
      if (selectedId.value === id) {
        selectedId.value = strategies.value[Math.max(deleteIndex - 1, 0)]?.id || strategies.value[0]?.id || '';
      }
      persistStrategies(storageKey, strategies.value);
      return { ok: true, strategy: deleted, message: deleteMessage };
    }

    store = {
      activeInput,
      addStrategy,
      calculation,
      deleteStrategy,
      duplicateStrategy,
      ...(enableImportExport ? { exportStrategies, importStrategies } : {}),
      form,
      formIsSaved,
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
      persistStrategies(storageKey, strategies.value);
      return { ok: true, count: normalized.length, message: `已导入 ${normalized.length} 个策略` };
    }
  };
}

function createStrategy(input) {
  return {
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    ...input,
  };
}

function loadStrategies(storageKey, defaultInput) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const savedStrategies = Array.isArray(saved) ? saved : saved?.strategies;
    if (Array.isArray(savedStrategies) && savedStrategies.length > 0) {
      return savedStrategies.map((strategy) => ({ ...defaultInput, ...strategy }));
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

function stripMeta(strategy, numericFields) {
  const { id, updatedAt, ...input } = strategy;
  return numericFields.reduce(
    (stripped, field) => ({
      ...stripped,
      [field]: Number(input[field]),
    }),
    { ...input },
  );
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
