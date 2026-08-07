import { MARTINGALE_MODE_FUTURES, MARTINGALE_SIDE_LONG } from '../common/martingale';

export const defaultContractMartingaleInput = {
  name: 'ETH 合约马丁',
  mode: MARTINGALE_MODE_FUTURES,
  side: MARTINGALE_SIDE_LONG,
  entryPrice: 2300,
  currentPrice: 2300,
  firstOrderAmount: 0.5,
  multiplier: 1,
  maxLayers: 200,
  triggerPercent: 0.2,
  takeProfitPercent: 0.2,
  feeRate: 0.02,
  leverage: 100,
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
