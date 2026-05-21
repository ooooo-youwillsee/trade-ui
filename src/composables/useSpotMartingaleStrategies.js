import { createMartingaleStrategyStore } from '../strategies/common/useMartingaleStrategyStoreFactory';
import { MARTINGALE_MODE_SPOT } from '../strategies/common/martingale';
import { defaultSpotMartingaleInput, spotMartingalePresets } from '../strategies/spot/martingaleDefaults';

export const useSpotMartingaleStrategies = createMartingaleStrategyStore({
  defaultInput: defaultSpotMartingaleInput,
  mode: MARTINGALE_MODE_SPOT,
  newName: '新现货马丁',
  presets: spotMartingalePresets,
  storageKey: 'spot-martingale-strategies',
});
