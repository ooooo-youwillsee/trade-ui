import { createGridStrategyStore } from '../strategies/common/useGridStrategyStoreFactory';
import { calculateSpotGrid, normalizeSpotGridInput } from '../strategies/spot/grid';
import { defaultSpotGridInput, spotGridPresets } from '../strategies/spot/gridDefaults';

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
  stripNumericFields: ['lowerPrice', 'upperPrice', 'entryPrice', 'currentPrice', 'gridCount', 'investment'],
});

export function calculateStrategy(strategy) {
  try {
    const input = normalizeSpotGridInput(strategy);
    return { error: '', input, result: calculateSpotGrid(input) };
  } catch (error) {
    return { error: error.message, input: null, result: null };
  }
}
