import { computed, effectScope, reactive, ref, watch } from 'vue';
import { calculateMartingale, normalizeMartingaleInput } from './martingale';

// 马丁策略 store 工厂：抽出合约/现货马丁共同的策略管理和本地持久化流程。
const STORAGE_VERSION = 1;

// 通过固定 mode 生成对应市场的马丁策略 composable，避免页面误改交易模式。
export function createMartingaleStrategyStore({ defaultInput, mode, newName, presets, storageKey }) {
  // 每个工厂实例维护自己的单例 store，合约和现货互不影响。
  let store;

  return function useFixedMartingaleStrategies() {
    if (store) return store;

    // mode 被写入 form 和持久化策略，确保现货/合约计算口径稳定。
    const strategies = ref(loadStrategies(storageKey, defaultInput, mode));
    const selectedId = ref(strategies.value[0]?.id ?? '');
    const form = reactive({ ...defaultInput, mode });
    const scope = effectScope(true);

    scope.run(() => {
      // 策略列表变化后立即同步到 localStorage，减少刷新丢数据的窗口。
      watch(
        strategies,
        (items) => {
          persistStrategies(storageKey, items);
        },
        { deep: true, flush: 'sync' },
      );
    });

    // 当前选中策略驱动详情、编辑页和表单回填。
    const selectedStrategy = computed(() => strategies.value.find((strategy) => strategy.id === selectedId.value));

    scope.run(() => {
      // 回填时强制覆盖 mode，防止导入数据中的 mode 污染当前市场。
      watch(
        selectedStrategy,
        (strategy) => {
          if (strategy) Object.assign(form, { ...strategy, mode });
        },
        { immediate: true },
      );
    });

    // 计算始终使用当前 market 的 mode，页面可以直接消费 result 和 activeInput。
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
      // 规范化后比较，避免表单数字字符串造成“未保存”的误判。
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
      // 新建马丁策略只形成草稿，用户保存后才加入列表。
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
      // 复制策略时保留参数，替换 id、更新时间和名称。
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
      // 保存会覆盖已选策略，未选中时创建新策略。
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
      // 删除最后一个策略时回到默认草稿，避免 selectedId 指向不存在的数据。
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

    // 对外返回字段保持和网格 store 相近，便于页面组件按统一心智使用。
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

// 单策略计算包装：失败时把错误放到 calculation.error，让页面统一展示。
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

// 新策略统一补充随机 id 和更新时间。
function createStrategy(input) {
  return {
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    ...input,
  };
}

// 读取本地策略时兼容旧数组格式，并强制写回当前固定 mode。
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

// 本地存储失败时不抛出，让页面继续以内存态运行。
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

// 去除元信息并把表单数字字段转为 Number，保证复制后的策略可直接计算。
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

// 同名策略自动追加序号，避免列表识别困难。
function uniqueStrategyName(strategies, baseName) {
  const existingNames = new Set(strategies.map((strategy) => strategy.name));
  if (!existingNames.has(baseName)) return baseName;
  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}
