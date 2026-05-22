import { MARTINGALE_MODE_FUTURES, MARTINGALE_SIDE_LONG } from '../common/martingale';

// 合约马丁默认输入：固定 futures 模式，并提供杠杆、追加保证金和维持保证金率。
export const defaultContractMartingaleInput = {
  name: 'ETH 合约马丁',
  mode: MARTINGALE_MODE_FUTURES,
  side: MARTINGALE_SIDE_LONG,
  currentPrice: 2300,
  firstOrderAmount: 50,
  multiplier: 2,
  maxLayers: 6,
  triggerPercent: 3,
  takeProfitPercent: 1,
  totalCapital: 1000,
  leverage: 5,
  additionalMargin: 0,
  maintenanceMarginRate: 0.005,
  includeInitialOrder: true,
  restrictByCapital: true,
};

// 合约马丁预设：保持与默认输入一致，作为快速创建入口。
export const contractMartingalePresets = [
  {
    label: 'ETH 合约马丁',
    value: {
      ...defaultContractMartingaleInput,
    },
  },
];
