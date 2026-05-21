import { MARTINGALE_MODE_FUTURES, MARTINGALE_SIDE_LONG } from './martingale';

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

export const contractMartingalePresets = [
  {
    label: 'ETH 合约马丁',
    value: {
      ...defaultContractMartingaleInput,
    },
  },
];
