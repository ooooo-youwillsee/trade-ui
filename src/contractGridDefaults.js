import { CONTRACT_SIDE_LONG, CONTRACT_SIDE_SHORT, GRID_MODE_GEOMETRIC } from './contractGrid';

export const defaultContractGridInput = {
  name: 'ETH 合约网格',
  lowerPrice: 900,
  upperPrice: 4500,
  entryPrice: 2300,
  currentPrice: 1000,
  openOnCreate: true,
  gridMode: GRID_MODE_GEOMETRIC,
  gridCount: 500,
  side: CONTRACT_SIDE_LONG,
  leverage: 10,
  investment: 500,
  additionalInvestment: 0,
};

export const contractGridPresets = [
  {
    label: 'ETH 做多',
    value: {
      ...defaultContractGridInput,
      name: 'ETH 合约网格',
      lowerPrice: 900,
      upperPrice: 4500,
      entryPrice: 2300,
      currentPrice: 1000,
      gridMode: GRID_MODE_GEOMETRIC,
      gridCount: 500,
      side: CONTRACT_SIDE_LONG,
      leverage: 10,
      investment: 500,
      additionalInvestment: 0,
      openOnCreate: true,
    },
  },
];
