import { MARTINGALE_MODE_FUTURES, MARTINGALE_PLATFORM_GATE, MARTINGALE_SIDE_LONG } from '../common/martingale';

// 合约马丁的新建草稿默认值，同时也是旧存储缺失字段时的兼容回填来源。
// firstOrderAmount 在合约中表示保证金；实际本层名义仓位还会乘以 leverage。
export const defaultContractMartingaleInput = {
  name: 'ETH 合约马丁',
  mode: MARTINGALE_MODE_FUTURES,
  side: MARTINGALE_SIDE_LONG,
  entryPrice: 2300,
  currentPrice: 2300,
  executionPlatform: MARTINGALE_PLATFORM_GATE,
  useFreeParameters: false,
  // 普通模式无需预生成自由层；首次打开自由参数时仅创建固定首单层。
  customLayers: [],
  firstOrderAmount: 2,
  multiplier: 1.1,
  priceGapMultiplier: 1.1,
  maxLayers: 25,
  triggerPercent: 1.1,
  takeProfitPercent: 3,
  feeRate: 0.02,
  leverage: 10,
  additionalMargin: 0,
};

export const contractMartingalePresets = [
  {
    label: 'ETH 合约马丁',
    value: {
      ...defaultContractMartingaleInput,
    },
  },
];
