import { createMartingaleStrategyStore } from './useMartingaleStrategyStoreFactory';
import { MARTINGALE_MODE_FUTURES } from '../martingale';
import { defaultContractMartingaleInput, contractMartingalePresets } from '../contractMartingaleDefaults';

export const useContractMartingaleStrategies = createMartingaleStrategyStore({
  defaultInput: defaultContractMartingaleInput,
  mode: MARTINGALE_MODE_FUTURES,
  newName: '新合约马丁',
  presets: contractMartingalePresets,
  storageKey: 'contract-martingale-strategies',
});
