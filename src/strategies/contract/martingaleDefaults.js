import { MARTINGALE_MODE_FUTURES, MARTINGALE_SIDE_LONG } from '../common/martingale';

export const defaultContractMartingaleInput = {
  name: 'ETH 合约马丁',
  mode: MARTINGALE_MODE_FUTURES,
  side: MARTINGALE_SIDE_LONG,
  entryPrice: 2300,
  currentPrice: 2300,
  firstOrderAmount: 0.2,
  multiplier: 1.1,
  priceGapMultiplier: 1.1,
  maxLayers: 25,
  triggerPercent: 1.1,
  takeProfitPercent: 3,
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
