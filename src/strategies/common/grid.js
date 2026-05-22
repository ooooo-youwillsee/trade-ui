// 网格策略公共算法：提供方向/模式常量、网格价格生成、成交网格识别和收益率计算。

// 合约和现货网格共用同一套方向值，便于表单、列表和计算模块统一判断。
export const CONTRACT_SIDE_LONG = 'long';
export const CONTRACT_SIDE_SHORT = 'short';

// 网格价格支持等差和等比两种模式，计算结果会用于仓位、收益和展示。
export const GRID_MODE_ARITHMETIC = 'arithmetic';
export const GRID_MODE_GEOMETRIC = 'geometric';

// 根据上下限和网格数量生成包含边界的价格数组，等比模式会强制校准最后一个价格。
export function buildGridPrices(lowerPrice, upperPrice, gridCount, gridMode) {
  const prices = Array.from({ length: gridCount + 1 }, () => 0);
  if (gridMode === GRID_MODE_ARITHMETIC) {
    const step = (upperPrice - lowerPrice) / gridCount;
    return prices.map((_, index) => lowerPrice + index * step);
  }

  const ratio = Math.pow(upperPrice / lowerPrice, 1 / gridCount);
  prices[0] = lowerPrice;
  for (let index = 1; index < prices.length; index += 1) {
    prices[index] = prices[index - 1] * ratio;
  }
  prices[prices.length - 1] = upperPrice;
  return prices;
}

// 找出当前价格与入场价之间已经触发的网格，并记录每格的开仓价和目标平仓价。
export function filledPositions(input, gridPrices) {
  const positions = [];
  gridPrices.forEach((price, index) => {
    if (price === input.entryPrice) return;

    if (input.side === CONTRACT_SIDE_LONG) {
      if (input.openOnCreate && price > input.entryPrice) {
        positions.push({ gridPrice: price, openPrice: input.entryPrice, targetPrice: price });
        return;
      }
      if (price < input.entryPrice && price >= input.currentPrice) {
        positions.push({
          gridPrice: price,
          openPrice: price,
          targetPrice: nextHigherGridPrice(gridPrices, index),
        });
      }
      return;
    }

    if (input.side === CONTRACT_SIDE_SHORT) {
      if (input.openOnCreate && price < input.entryPrice) {
        positions.push({ gridPrice: price, openPrice: input.entryPrice, targetPrice: price });
        return;
      }
      if (price > input.entryPrice && price <= input.currentPrice) {
        positions.push({
          gridPrice: price,
          openPrice: price,
          targetPrice: nextLowerGridPrice(gridPrices, index),
        });
      }
    }
  });
  return positions;
}

// 单格浮动盈亏会被限制在目标价以内，避免已经越过目标价的格子继续放大利润。
export function limitedGridProfitLoss(currentPrice, openPrice, targetPrice, quantity, side) {
  if (side === CONTRACT_SIDE_LONG) {
    const profitLoss = (currentPrice - openPrice) * quantity;
    const maxProfit = (targetPrice - openPrice) * quantity;
    return maxProfit > 0 && profitLoss > maxProfit ? maxProfit : profitLoss;
  }
  if (side === CONTRACT_SIDE_SHORT) {
    const profitLoss = (openPrice - currentPrice) * quantity;
    const maxProfit = (openPrice - targetPrice) * quantity;
    return maxProfit > 0 && profitLoss > maxProfit ? maxProfit : profitLoss;
  }
  return 0;
}

// 做多网格向上一个价位止盈，数组末端没有更高价时回落到自身。
export function nextHigherGridPrice(gridPrices, index) {
  return index + 1 < gridPrices.length ? gridPrices[index + 1] : gridPrices[index];
}

// 做空网格向下一个价位止盈，数组起点没有更低价时回落到自身。
export function nextLowerGridPrice(gridPrices, index) {
  return index - 1 >= 0 ? gridPrices[index - 1] : gridPrices[index];
}

// 根据方向选择收益率口径：做多以低价为成本，做空以高价卖出价为成本。
export function gridProfitRate(side, gridStep, gridRatio, gridPrices, gridMode) {
  if (side === CONTRACT_SIDE_LONG) return longGridProfitRate(gridStep, gridRatio, gridPrices, gridMode);
  if (side === CONTRACT_SIDE_SHORT) return shortGridProfitRate(gridStep, gridRatio, gridPrices, gridMode);
  return 0;
}

// 区间总收益率用于展示策略上下限理论波动空间。
export function totalYieldRate(side, lowerPrice, upperPrice) {
  if (side === CONTRACT_SIDE_LONG) return ((upperPrice - lowerPrice) / lowerPrice) * 100;
  if (side === CONTRACT_SIDE_SHORT) return ((upperPrice - lowerPrice) / upperPrice) * 100;
  return 0;
}

// 做多单格收益率：等比直接使用比例，等差按最低买入价估算。
function longGridProfitRate(gridStep, gridRatio, gridPrices, gridMode) {
  if (gridStep === 0 || gridPrices.length < 2 || gridPrices[0] === 0) return 0;
  if (gridMode === GRID_MODE_GEOMETRIC) return (gridRatio - 1) * 100;
  return (gridStep / gridPrices[0]) * 100;
}

// 做空单格收益率：等比按卖出后回补比例，等差按最高卖出价估算。
function shortGridProfitRate(gridStep, gridRatio, gridPrices, gridMode) {
  if (gridStep === 0 || gridPrices.length < 2) return 0;
  if (gridMode === GRID_MODE_GEOMETRIC) return (1 - 1 / gridRatio) * 100;
  const highSellPrice = gridPrices[gridPrices.length - 1];
  return highSellPrice === 0 ? 0 : (gridStep / highSellPrice) * 100;
}
