import { computed, effectScope, reactive, ref, watch } from 'vue';

// 网格策略 store 工厂：把合约/现货网格共用的列表、表单、持久化逻辑集中维护。
const STORAGE_VERSION = 1;

// 通过注入计算函数、默认值和文案，生成固定类型的网格策略 composable。
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
  // 闭包内缓存单例 store，保证多个页面拿到同一份策略状态。
  let store;

  return function useFixedGridStrategies() {
    if (store) return store;

    // strategies 是持久化主体，form 是当前编辑草稿，二者需要保持可独立变化。
    const strategies = ref(loadStrategies(storageKey, defaultInput));
    const selectedId = ref(strategies.value[0]?.id ?? '');
    const form = reactive({ ...defaultInput });
    const scope = effectScope(true);

    scope.run(() => {
      // 使用同步 watch，确保用户操作后 localStorage 立即落盘。
      watch(strategies, (items) => persistStrategies(storageKey, items), {
        deep: true,
        flush: 'sync',
      });
    });

    // selectedStrategy 作为列表选择和表单回填之间的桥梁。
    const selectedStrategy = computed(() => strategies.value.find((strategy) => strategy.id === selectedId.value));

    scope.run(() => {
      // 选中策略变化时回填表单；新建草稿时 selectedId 为空，不覆盖用户正在编辑的 draft。
      watch(
        selectedStrategy,
        (strategy) => {
          if (strategy) Object.assign(form, strategy);
        },
        { immediate: true },
      );
    });

    // calculation 同时返回规范化 input 和 result，页面可分别展示输入摘要和计算结果。
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
      // 使用 normalize 后的 JSON 比较，避免字符串/数字类型差异导致误判未保存。
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
      // 新建只生成草稿，不立即写入列表，直到用户显式保存。
      const draft = {
        ...defaultInput,
        name: uniqueStrategyName(strategies.value, newName),
      };
      selectedId.value = '';
      Object.assign(form, draft);
      return draft;
    }

    function duplicateStrategy() {
      // 复制会立即生成新策略，保留原表单参数但去掉 id/updatedAt 等元信息。
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
      // 有 selectedId 时覆盖原策略，否则创建新策略并放到列表顶部。
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
      // 删除最后一个策略时清空列表并把表单恢复为默认输入。
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

    // 返回对象保持页面使用的公开接口稳定，合约和现货页面共享同一套字段。
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
      // 导出格式带版本和时间戳，后续如果结构升级可以兼容判断。
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

      // 兼容直接数组和带 strategies 字段的导出对象两种导入格式。
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

// 创建持久化策略时统一补齐元信息。
function createStrategy(input) {
  return {
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    ...input,
  };
}

// 从 localStorage 读取策略，旧格式数组和新格式对象都能兼容。
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

// 存储失败时不打断内存态工作流，避免隐私模式等环境让页面不可用。
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
    // 浏览器存储不可用时，保留当前内存工作流。
  }
}

// 复制策略时去掉元字段，并把指定字段强制转为数字，避免表单字符串混入计算。
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

// 新策略命名按“名称 2/3/4”递增，避免列表里出现同名项。
function uniqueStrategyName(strategies, baseName) {
  const existingNames = new Set(strategies.map((strategy) => strategy.name));
  if (!existingNames.has(baseName)) return baseName;
  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) {
    index += 1;
  }
  return `${baseName} ${index}`;
}
