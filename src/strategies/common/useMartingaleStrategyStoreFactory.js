import { computed, effectScope, reactive, ref, watch } from 'vue';
import { calculateMartingale, normalizeMartingaleInput } from './martingale';

// 马丁策略 store 工厂：抽出合约/现货马丁共同的策略管理和本地持久化流程。
// version 只描述当前写出格式；加载时不会用它拒绝旧数据，而是按当前默认参数补齐。
const STORAGE_VERSION = 5;

/**
 * 创建一个固定市场类型的马丁策略 Store。
 *
 * defaultInput 提供新建策略默认值和旧数据缺失字段的回填值；mode 由调用方固定，
 * storageKey 隔离合约与现货的数据。工厂返回单例 composable，保证列表页、编辑页和详情页
 * 使用同一份响应式状态。
 */
export function createMartingaleStrategyStore({ defaultInput, mode, newName, presets, storageKey }) {
  // 每个工厂实例维护自己的单例 store，合约和现货互不影响。
  let store;

  return function useFixedMartingaleStrategies() {
    if (store) return store;

    // mode 被写入 form 和持久化策略，确保现货/合约计算口径稳定。
    // form 使用深拷贝，避免 customLayers 数组与默认值或已保存策略共享引用。
    const strategies = ref(loadStrategies(storageKey, defaultInput, mode));
    const selectedId = ref(strategies.value[0]?.id ?? '');
    const form = reactive({ ...cloneMartingaleInput(defaultInput), mode });
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
          if (strategy) Object.assign(form, { ...cloneMartingaleInput(strategy), mode });
        },
        { immediate: true },
      );
    });

    // 计算始终使用当前 market 的 mode，页面可以直接消费 result 和 activeInput。
    // calculateStrategy 将异常转成数据状态，输入过程中即使存在临时非法值也不会打断 Vue 渲染。
    const calculation = computed(() => calculateStrategy({ ...form, mode }));
    const result = computed(() => calculation.value.result);
    const activeInput = computed(() => calculation.value.input);
    const strategySummaries = computed(() =>
      // 列表中的每条策略独立计算；单条错误只影响自己的摘要卡片。
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
      // 有选中策略时恢复已保存值，否则恢复市场默认草稿。
      Object.assign(form, cloneMartingaleInput(selectedStrategy.value || defaultInput), { mode });
    }

    function setPreset(preset) {
      // 自由参数是独立配置：快捷预设只覆盖公共字段和普通比例参数，不能清空用户逐层编辑的计划。
      const executionPlatform = form.executionPlatform;
      const useFreeParameters = form.useFreeParameters;
      const customLayers = cloneCustomLayers(form.customLayers);
      Object.assign(form, cloneMartingaleInput(preset), {
        mode,
        executionPlatform,
        useFreeParameters: executionPlatform === 'gate' && useFreeParameters,
        customLayers,
      });
    }

    function addStrategy() {
      // 新建马丁策略只形成草稿，用户保存后才加入列表。
      const draft = {
        ...cloneMartingaleInput(defaultInput),
        mode,
        name: uniqueStrategyName(strategies.value, newName),
      };
      selectedId.value = '';
      Object.assign(form, draft);
      return draft;
    }

    function duplicateStrategy() {
      // 复制策略时保留参数，替换 id、更新时间和名称。
      const strategy = createStrategy(
        normalizeMartingaleInput({
          ...form,
          mode,
          name: uniqueStrategyName(strategies.value, `${form.name || '马丁策略'} 副本`),
        }),
      );
      strategies.value = [strategy, ...strategies.value];
      selectedId.value = strategy.id;
      persistStrategies(storageKey, strategies.value);
      return strategy;
    }

    function saveStrategy() {
      // 计算失败时拒绝写入，保证持久化列表中的策略都能被当前计算器正常消费。
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

/**
 * 安全执行单条策略计算。
 * 成功时同时返回规范化输入和结果；失败时保留错误消息并将两者置空，
 * 供表单提示、保存按钮禁用和列表异常状态共同使用。
 */
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

/**
 * 从 localStorage 恢复策略。
 *
 * 兼容裸数组和任意 version 的 { strategies: [] } 包装；每条记录先用当前市场默认值补字段，
 * 再规范化并执行一次完整计算。损坏记录逐条跳过，不能因为一条坏数据清空其他健康策略。
 * 恢复成功后立即按 v5 结构回写，从而让后续加载获得稳定、完整的新结构。
 */
function loadStrategies(storageKey, defaultInput, mode) {
  try {
    const serialized = localStorage.getItem(storageKey);
    if (!serialized) return [];
    const saved = JSON.parse(serialized);
    const savedStrategies = Array.isArray(saved) ? saved : saved?.strategies;
    if (!Array.isArray(savedStrategies)) {
      localStorage.removeItem(storageKey);
      return [];
    }
    const ids = new Set();
    const migratedAt = Date.now();
    const strategies = [];

    for (const strategy of savedStrategies) {
      try {
        if (!strategy || typeof strategy !== 'object' || Array.isArray(strategy)) continue;
        if (hasInvalidExplicitNumericInput(strategy, defaultInput) || hasInvalidExplicitCustomLayers(strategy))
          continue;

        // 展开顺序保证旧策略的显式合法值优先，缺失字段才使用当前默认值；mode 始终强制覆盖。
        const input = normalizeMartingaleInput({ ...defaultInput, ...strategy, mode });
        // 加载阶段执行完整业务校验，而不是只检查 JSON 类型。
        calculateMartingale(input);

        // 缺失或重复 id 会破坏 Vue key 和编辑/删除定位，因此重新生成直到唯一。
        let id = typeof strategy.id === 'string' && strategy.id.trim() ? strategy.id : crypto.randomUUID();
        while (ids.has(id)) id = crypto.randomUUID();
        ids.add(id);
        strategies.push({
          id,
          updatedAt: Number.isFinite(strategy.updatedAt) ? strategy.updatedAt : migratedAt,
          ...input,
        });
      } catch {
        // 单条无法修复的策略不影响同组其他数据恢复。
      }
    }

    if (strategies.length === 0) {
      localStorage.removeItem(storageKey);
      return [];
    }
    persistStrategies(storageKey, strategies);
    return strategies;
  } catch {
    localStorage.removeItem(storageKey);
  }
  return [];
}

// 只有“缺失”字段可以使用默认值；显式传入 null、空串或非有限数字代表数据损坏，必须跳过。
function hasInvalidExplicitNumericInput(strategy, defaultInput) {
  return Object.entries(defaultInput).some(([key, defaultValue]) => {
    if (typeof defaultValue !== 'number' || !Object.prototype.hasOwnProperty.call(strategy, key)) return false;
    const value = strategy[key];
    if (typeof value !== 'number' && typeof value !== 'string') return true;
    if (typeof value === 'string' && !value.trim()) return true;
    return !Number.isFinite(Number(value));
  });
}

// 自由参数是嵌套结构，需要在 Number 转换前单独检查每层对象和两个数值字段。
function hasInvalidExplicitCustomLayers(strategy) {
  if (!Object.prototype.hasOwnProperty.call(strategy, 'customLayers')) return false;
  if (!Array.isArray(strategy.customLayers)) return true;
  return strategy.customLayers.some(
    (layer) =>
      !layer ||
      typeof layer !== 'object' ||
      Array.isArray(layer) ||
      !Number.isFinite(Number(layer.gapPercent)) ||
      !Number.isFinite(Number(layer.amountShares)),
  );
}

// 对 customLayers 做最小必要的深拷贝，防止表单原地编辑影响默认值、预设或已保存对象。
function cloneMartingaleInput(input) {
  return {
    ...input,
    customLayers: cloneCustomLayers(input?.customLayers),
  };
}

function cloneCustomLayers(customLayers) {
  return Array.isArray(customLayers) ? customLayers.map((layer) => ({ ...layer })) : [];
}

// 本地存储失败时不抛出，让页面继续以内存态运行。
// updatedAt 是整个存储包的写入时间；单条策略仍保留自己的 updatedAt。
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

// 同名策略自动追加序号，避免列表识别困难。
function uniqueStrategyName(strategies, baseName) {
  const existingNames = new Set(strategies.map((strategy) => strategy.name));
  if (!existingNames.has(baseName)) return baseName;
  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}
