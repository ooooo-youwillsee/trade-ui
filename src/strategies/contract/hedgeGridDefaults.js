import { GRID_MODE_GEOMETRIC, POSITION_INCREMENT_RATIO } from './hedgeGrid';

// 默认多头腿只是前端示例参数，实际方向会在计算层固定为 long。
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

// 默认空头腿只是前端示例参数，实际方向会在计算层固定为 short。
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
  // 涨跌幅单位是百分比，-10 表示下跌 10%，10 表示上涨 10%。
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
