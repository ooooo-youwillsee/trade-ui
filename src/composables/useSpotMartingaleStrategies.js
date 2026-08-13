import { createMartingaleStrategyStore } from '../strategies/common/useMartingaleStrategyStoreFactory';
import { MARTINGALE_MODE_SPOT } from '../strategies/common/martingale';
import { defaultSpotMartingaleInput, spotMartingalePresets } from '../strategies/spot/martingaleDefaults';

// 现货马丁策略固定使用 spot 模式，保证资金占用按现货投入金额计算。
// 独立 storageKey 用于隔离合约策略和现货策略的数据生命周期。
export const useSpotMartingaleStrategies = createMartingaleStrategyStore({
  defaultInput: defaultSpotMartingaleInput,
  mode: MARTINGALE_MODE_SPOT,
  newName: '新现货马丁',
  presets: spotMartingalePresets,
  storageKey: 'spot-martingale-strategies',
});
