import { CONTRACT_SIDE_LONG, GRID_MODE_GEOMETRIC, POSITION_INCREMENT_RATIO } from './grid';

// 合约网格默认表单值：用于首次进入页面和删除最后一个策略后的回填。
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
  positionIncrementMode: POSITION_INCREMENT_RATIO,
  positionIncrementValue: 0,
};

// 合约网格预设：为用户提供可快速开始的典型参数组合。
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
      positionIncrementMode: POSITION_INCREMENT_RATIO,
      positionIncrementValue: 0,
      openOnCreate: true,
    },
  },
];
