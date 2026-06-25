import { CONTRACT_SIDE_LONG, GRID_MODE_GEOMETRIC, POSITION_INCREMENT_RATIO } from '../common/grid';
import { DEFAULT_SPOT_GRID_FEE_RATE } from './grid';

// 现货网格默认表单值：不含杠杆和追加保证金，只关注投入金额。
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
  feeRate: DEFAULT_SPOT_GRID_FEE_RATE,
  positionIncrementMode: POSITION_INCREMENT_RATIO,
  positionIncrementValue: 0,
};

// 现货网格预设：当前复用默认输入，后续可扩展更多币种或区间。
export const spotGridPresets = [
  {
    label: 'ETH 现货网格',
    value: {
      ...defaultSpotGridInput,
    },
  },
];
