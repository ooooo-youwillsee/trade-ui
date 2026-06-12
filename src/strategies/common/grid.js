// 网格策略公共算法：提供方向/模式常量、网格价格生成、成交网格识别和收益率计算。

// 合约和现货网格共用同一套方向值，便于表单、列表和计算模块统一判断。
export const CONTRACT_SIDE_LONG = 'long';
export const CONTRACT_SIDE_NEUTRAL = 'neutral';
export const CONTRACT_SIDE_SHORT = 'short';

// 网格价格支持等差和等比两种模式，计算结果会用于仓位、收益和展示。
export const GRID_MODE_ARITHMETIC = 'arithmetic';
export const GRID_MODE_GEOMETRIC = 'geometric';

// 仓位递增支持按比例和按固定金额差两种模式，默认值为 0 时保持等额分配。
export const POSITION_INCREMENT_RATIO = 'ratio';
export const POSITION_INCREMENT_DIFFERENCE = 'difference';

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

// 按网格方向生成每个价格层对应的计划金额，做多低价更大，做空高价更大。
export function buildGridPositionInvestments(totalInvestment, gridCount, side, incrementMode, incrementValue) {
  const normalizedMode = incrementMode || POSITION_INCREMENT_RATIO;
  const value = Number(incrementValue || 0);
  if (value < 0) throw new Error('仓位递增值不能小于 0');
  if (normalizedMode !== POSITION_INCREMENT_RATIO && normalizedMode !== POSITION_INCREMENT_DIFFERENCE) {
    throw new Error('仓位递增方式必须是比例或差额');
  }
  if (value === 0) return Array.from({ length: gridCount }, () => totalInvestment / gridCount);

  const lowToHighAmounts =
    normalizedMode === POSITION_INCREMENT_RATIO
      ? buildRatioInvestments(totalInvestment, gridCount, side, value)
      : buildDifferenceInvestments(totalInvestment, gridCount, side, value);
  return lowToHighAmounts;
}

// 根据成交网格价格找到对应价格层的计划金额；边界价格会归入最靠近的一格。
export function gridPositionInvestment(position, gridPrices, gridInvestments) {
  const priceIndex = gridPrices.findIndex((price) => price === position.gridPrice);
  const normalizedIndex = Math.min(Math.max(priceIndex, 0), gridInvestments.length - 1);
  return gridInvestments[normalizedIndex] || 0;
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

// 区间振幅只描述上下限价格本身的波动空间，不随网格方向变化。
export function totalYieldRate(side, lowerPrice, upperPrice) {
  return ((upperPrice - lowerPrice) / lowerPrice) * 100;
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

function buildRatioInvestments(totalInvestment, gridCount, side, incrementPercent) {
  const ratio = 1 + incrementPercent / 100;
  const weights = Array.from({ length: gridCount }, (_, index) => {
    const adverseRank = side === CONTRACT_SIDE_LONG ? gridCount - 1 - index : index;
    return Math.pow(ratio, adverseRank);
  });
  return normalizeWeights(totalInvestment, weights);
}

function buildDifferenceInvestments(totalInvestment, gridCount, side, incrementAmount) {
  const baseAmount = (totalInvestment - (incrementAmount * gridCount * (gridCount - 1)) / 2) / gridCount;
  if (baseAmount <= 0) throw new Error('单格递增金额过大，无法在总投资额内分配');
  return Array.from({ length: gridCount }, (_, index) => {
    const adverseRank = side === CONTRACT_SIDE_LONG ? gridCount - 1 - index : index;
    return baseAmount + adverseRank * incrementAmount;
  });
}

function normalizeWeights(totalInvestment, weights) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (totalInvestment * weight) / totalWeight);
}
