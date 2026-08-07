import { MARTINGALE_MODE_SPOT, MARTINGALE_SIDE_LONG } from '../common/martingale';

export const defaultSpotMartingaleInput = {
  name: 'ETH 现货马丁',
  mode: MARTINGALE_MODE_SPOT,
  side: MARTINGALE_SIDE_LONG,
  entryPrice: 2300,
  currentPrice: 2300,
  firstOrderAmount: 0.5,
  multiplier: 1,
  maxLayers: 200,
  triggerPercent: 0.2,
  takeProfitPercent: 0.2,
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
