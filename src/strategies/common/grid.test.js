import { describe, expect, it } from 'vitest';
import {
  buildGridPrices,
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_SHORT,
  filledPositions,
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
  limitedGridProfitLoss,
} from './grid';

// 公共网格算法测试：验证价格序列、成交网格识别和单格盈亏封顶。
describe('buildGridPrices', () => {
  it('builds arithmetic grid prices including both bounds', () => {
    expect(buildGridPrices(100, 200, 4, GRID_MODE_ARITHMETIC)).toEqual([100, 125, 150, 175, 200]);
  });

  it('builds geometric grid prices with stable first and last bounds', () => {
    expect(buildGridPrices(100, 1600, 4, GRID_MODE_GEOMETRIC)).toEqual([100, 200, 400, 800, 1600]);
  });
});

describe('filledPositions', () => {
  // 固定网格价格便于明确测试当前价和入场价之间的触发范围。
  const gridPrices = [100, 125, 150, 175, 200];

  it('returns filled long grid positions between current and entry prices', () => {
    expect(
      filledPositions(
        {
          side: CONTRACT_SIDE_LONG,
          entryPrice: 150,
          currentPrice: 110,
          openOnCreate: false,
        },
        gridPrices,
      ),
    ).toEqual([{ gridPrice: 125, openPrice: 125, targetPrice: 150 }]);
  });

  it('returns filled short grid positions between entry and current prices', () => {
    expect(
      filledPositions(
        {
          side: CONTRACT_SIDE_SHORT,
          entryPrice: 150,
          currentPrice: 190,
          openOnCreate: false,
        },
        gridPrices,
      ),
    ).toEqual([{ gridPrice: 175, openPrice: 175, targetPrice: 150 }]);
  });
});

describe('limitedGridProfitLoss', () => {
  it('caps long grid profit at the target price', () => {
    expect(limitedGridProfitLoss(200, 100, 150, 2, CONTRACT_SIDE_LONG)).toBe(100);
  });

  it('caps short grid profit at the target price', () => {
    expect(limitedGridProfitLoss(100, 200, 150, 2, CONTRACT_SIDE_SHORT)).toBe(100);
  });
});
