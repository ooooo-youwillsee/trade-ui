import { MARTINGALE_MODE_SPOT, MARTINGALE_PLATFORM_GATE, MARTINGALE_SIDE_LONG } from '../common/martingale';

// 现货马丁的新建草稿默认值，同时用于兼容加载旧策略中缺失的新字段。
// 现货没有杠杆和追加保证金，但保留稳定字段结构，便于共用计算器与 Store。
export const defaultSpotMartingaleInput = {
  name: 'ETH 现货马丁',
  mode: MARTINGALE_MODE_SPOT,
  side: MARTINGALE_SIDE_LONG,
  entryPrice: 2300,
  currentPrice: 2300,
  executionPlatform: MARTINGALE_PLATFORM_GATE,
  useFreeParameters: false,
  // 自由参数采用延迟初始化，避免普通模式无意义地持久化几十层默认对象。
  customLayers: [],
  firstOrderAmount: 0.2,
  multiplier: 1.1,
  priceGapMultiplier: 1.1,
  maxLayers: 25,
  triggerPercent: 1.1,
  takeProfitPercent: 3,
  feeRate: 0.02,
  leverage: 1,
  additionalMargin: 0,
};

export const spotMartingalePresets = [
  {
    label: 'ETH 现货马丁',
    value: {
      ...defaultSpotMartingaleInput,
    },
  },
];
