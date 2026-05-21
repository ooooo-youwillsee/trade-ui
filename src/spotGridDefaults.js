import { CONTRACT_SIDE_LONG, GRID_MODE_GEOMETRIC } from './contractGrid';

export const defaultSpotGridInput = {
  name: 'ETH 现货网格',
  lowerPrice: 900,
  upperPrice: 4500,
  entryPrice: 2300,
  currentPrice: 1000,
  openOnCreate: true,
  gridMode: GRID_MODE_GEOMETRIC,
  gridCount: 100,
  side: CONTRACT_SIDE_LONG,
  investment: 500,
};

export const spotGridPresets = [
  {
    label: 'ETH 现货网格',
    value: {
      ...defaultSpotGridInput,
    },
  },
];
