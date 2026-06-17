import { GRID_MODE_GEOMETRIC, POSITION_INCREMENT_RATIO } from './hedgeGrid';

const defaultLongLeg = {
  name: 'ETHUSDT',
  lowerPrice: 900,
  upperPrice: 4500,
  entryPrice: 2300,
  currentPrice: 2300,
  openOnCreate: true,
  gridMode: GRID_MODE_GEOMETRIC,
  gridCount: 200,
  leverage: 10,
  investment: 500,
  additionalInvestment: 0,
  positionIncrementMode: POSITION_INCREMENT_RATIO,
  positionIncrementValue: 0,
};

const defaultShortLeg = {
  name: 'BTCUSDT',
  lowerPrice: 60000,
  upperPrice: 120000,
  entryPrice: 90000,
  currentPrice: 90000,
  openOnCreate: true,
  gridMode: GRID_MODE_GEOMETRIC,
  gridCount: 200,
  leverage: 10,
  investment: 500,
  additionalInvestment: 0,
  positionIncrementMode: POSITION_INCREMENT_RATIO,
  positionIncrementValue: 0,
};

export const defaultContractHedgeGridInput = {
  name: '对冲合约网格',
  longScenarioChangePercent: -10,
  shortScenarioChangePercent: 10,
  longLeg: defaultLongLeg,
  shortLeg: defaultShortLeg,
};

export const contractHedgeGridPresets = [
  {
    label: 'ETH 多 / BTC 空',
    value: {
      ...defaultContractHedgeGridInput,
      longLeg: { ...defaultLongLeg },
      shortLeg: { ...defaultShortLeg },
    },
  },
];
