import { createGridStrategyStore } from '../strategies/common/useGridStrategyStoreFactory';
import { calculateSpotGrid, normalizeSpotGridInput } from '../strategies/spot/grid';
import { defaultSpotGridInput, spotGridPresets } from '../strategies/spot/gridDefaults';

// 现货网格策略 composable：复用公共网格 store，并注入现货计算口径。
export const useSpotGridStrategies = createGridStrategyStore({
  calculateStrategy,
  defaultInput: defaultSpotGridInput,
  deleteMessage: '现货网格已删除',
  duplicateFallbackName: '现货网格',
  newName: '新现货网格',
  normalizeInput: normalizeSpotGridInput,
  presets: spotGridPresets,
  saveMessage: '现货网格已保存',
  storageKey: 'spot-grid-strategies',
  stripNumericFields: [
    'lowerPrice',
    'upperPrice',
    'entryPrice',
    'currentPrice',
    'gridCount',
    'investment',
    'feeRate',
    'positionIncrementValue',
  ],
});

// 现货网格计算入口：先规范化表单，再捕获计算校验错误供页面展示。
export function calculateStrategy(strategy) {
  try {
    const input = normalizeSpotGridInput(strategy);
    return { error: '', input, result: calculateSpotGrid(input) };
  } catch (error) {
    return { error: error.message, input: null, result: null };
  }
}
