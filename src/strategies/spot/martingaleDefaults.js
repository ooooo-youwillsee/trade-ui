import { MARTINGALE_MODE_SPOT, MARTINGALE_SIDE_LONG } from '../common/martingale';

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

export const spotMartingalePresets = [
  {
    label: 'ETH 现货马丁',
    value: {
      ...defaultSpotMartingaleInput,
    },
  },
];
