import { createMartingaleStrategyStore } from '../strategies/common/useMartingaleStrategyStoreFactory';
import { MARTINGALE_MODE_FUTURES } from '../strategies/common/martingale';
import { defaultContractMartingaleInput, contractMartingalePresets } from '../strategies/contract/martingaleDefaults';

export const useContractMartingaleStrategies = createMartingaleStrategyStore({
  defaultInput: defaultContractMartingaleInput,
  mode: MARTINGALE_MODE_FUTURES,
  newName: '新合约马丁',
  presets: contractMartingalePresets,
  storageKey: 'contract-martingale-strategies',
});
