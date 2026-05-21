import { createMartingaleStrategyStore } from './useMartingaleStrategyStoreFactory';
import { MARTINGALE_MODE_SPOT } from '../martingale';
import { defaultSpotMartingaleInput, spotMartingalePresets } from '../spotMartingaleDefaults';

export const useSpotMartingaleStrategies = createMartingaleStrategyStore({
  defaultInput: defaultSpotMartingaleInput,
  mode: MARTINGALE_MODE_SPOT,
  newName: '新现货马丁',
  presets: spotMartingalePresets,
  storageKey: 'spot-martingale-strategies',
});
