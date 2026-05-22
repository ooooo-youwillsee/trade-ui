import { createMartingaleStrategyStore } from '../strategies/common/useMartingaleStrategyStoreFactory';
import { MARTINGALE_MODE_FUTURES } from '../strategies/common/martingale';
import { defaultContractMartingaleInput, contractMartingalePresets } from '../strategies/contract/martingaleDefaults';

// 合约马丁策略固定使用 futures 模式，避免页面层重复传递交易模式。
export const useContractMartingaleStrategies = createMartingaleStrategyStore({
  defaultInput: defaultContractMartingaleInput,
  mode: MARTINGALE_MODE_FUTURES,
  newName: '新合约马丁',
  presets: contractMartingalePresets,
  storageKey: 'contract-martingale-strategies',
});
