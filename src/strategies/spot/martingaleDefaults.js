import { MARTINGALE_MODE_SPOT, MARTINGALE_SIDE_LONG } from '../common/martingale';

export const defaultSpotMartingaleInput = {
  name: 'ETH 现货马丁',
  mode: MARTINGALE_MODE_SPOT,
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
