import { MARTINGALE_MODE_SPOT, MARTINGALE_SIDE_LONG } from '../common/martingale';

// 现货马丁默认输入：固定 spot 模式，杠杆保留为 1 以兼容统一计算结构。
export const defaultSpotMartingaleInput = {
  name: 'ETH 现货马丁',
  mode: MARTINGALE_MODE_SPOT,
  side: MARTINGALE_SIDE_LONG,
  currentPrice: 2300,
  firstOrderAmount: 50,
  multiplier: 2,
  maxLayers: 6,
  triggerPercent: 3,
  takeProfitPercent: 1,
  totalCapital: 1000,
  leverage: 1,
  additionalMargin: 0,
  maintenanceMarginRate: 0.005,
  includeInitialOrder: true,
  restrictByCapital: true,
};

// 现货马丁预设：当前提供一组默认 ETH 参数供表单快速填充。
export const spotMartingalePresets = [
  {
    label: 'ETH 现货马丁',
    value: {
      ...defaultSpotMartingaleInput,
    },
  },
];
