// 网格策略公共算法：提供方向/模式常量、网格价格生成、成交网格识别和收益率计算。

// 合约和现货网格共用同一套方向值，便于表单、列表和计算模块统一判断。
export const CONTRACT_SIDE_LONG = 'long';
export const CONTRACT_SIDE_NEUTRAL = 'neutral';
export const CONTRACT_SIDE_SHORT = 'short';

// 网格价格支持等差和等比两种模式，计算结果会用于仓位、收益和展示。
export const GRID_MODE_ARITHMETIC = 'arithmetic';
export const GRID_MODE_GEOMETRIC = 'geometric';

// 旧策略可能没有保存最小成交数量，按策略/币种名称补一个可交易的默认值。
export function defaultMinTradeQuantity(name) {
  const symbolName = String(name || '').toUpperCase();
  if (symbolName.includes('BTC')) return 0.0001;
  if (symbolName.includes('ETH')) return 0.001;
  return 0.01;
}

export function normalizeMinTradeQuantity(rawValue, name) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return defaultMinTradeQuantity(name);
  return Number(rawValue);
}

// 用最高价作为保守口径计算统一单格数量，确保所有更低价格的网格也能满足最小成交数量。
export function buildTradableGridAllocation({
  gridCount,
  investment,
  leverage = 1,
  minTradeQuantity,
  upperPrice,
  investmentLabel,
}) {
  const normalizedMinTradeQuantity = Number(minTradeQuantity || 0);
  if (!Number.isFinite(normalizedMinTradeQuantity) || normalizedMinTradeQuantity < 0) {
    throw new Error('最小成交数量必须大于等于 0');
  }
  if (normalizedMinTradeQuantity === 0) {
    return {
      minTradeQuantity: normalizedMinTradeQuantity,
      minimumPerGridQuantity: 0,
      maxGridCountByMinTradeQuantity: 0,
      minimumRequiredInvestment: 0,
    };
  }

  const minimumPerGridQuantity = (investment * leverage) / gridCount / upperPrice;
  // 不足一个最小成交单位时直接报错；能成交但不能整除时向下取最大可成交份数。
  const tradableGridUnits = Math.floor(minimumPerGridQuantity / normalizedMinTradeQuantity + 1e-12);
  const tradablePerGridQuantity = roundTradeQuantity(tradableGridUnits * normalizedMinTradeQuantity);
  const tradablePerGridInvestment = (tradablePerGridQuantity * upperPrice) / leverage;
  const unallocatedInvestment = investment - tradablePerGridInvestment * gridCount;
  const minimumRequiredInvestment = (normalizedMinTradeQuantity * upperPrice * gridCount) / leverage;
  const maxGridCount = Math.floor((investment * leverage) / (normalizedMinTradeQuantity * upperPrice));

  if (tradableGridUnits > 0) {
    return {
      minTradeQuantity: normalizedMinTradeQuantity,
      minimumPerGridQuantity,
      tradableGridUnits,
      tradablePerGridQuantity,
      tradablePerGridInvestment,
      unallocatedInvestment,
      maxGridCountByMinTradeQuantity: maxGridCount,
      minimumRequiredInvestment,
    };
  }

  throw new Error(
    `最小成交数量不足：当前每格可成交数量 ${formatValidationNumber(minimumPerGridQuantity)}，` +
      `最小成交数量 ${formatValidationNumber(normalizedMinTradeQuantity)}，` +
      `当前资金下最大网格数 ${maxGridCount}，` +
      `当前网格数下最低${investmentLabel} ${formatValidationNumber(minimumRequiredInvestment)}`,
  );
}

export const validateMinimumTradeQuantity = buildTradableGridAllocation;

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

// 单格完整交易按开仓名义金额计算毛利润，并扣除开仓与目标平仓两次手续费。
// 毛利率和净利率都以开仓名义金额为分母，便于合约与现货使用同一口径比较。
export function calculateGridOrderProfit(openPrice, targetPrice, openNotional, side, feeRate) {
  // 边界网格没有下一档止盈价，不构成完整开平仓，因此所有利润字段归零。
  if (!openPrice || !targetPrice || openPrice === targetPrice || openNotional <= 0) {
    return {
      grossProfitAmount: 0,
      grossProfitRate: 0,
      netProfitAmount: 0,
      netProfitRate: 0,
    };
  }

  const quantity = openNotional / openPrice;
  const grossProfitRate =
    side === CONTRACT_SIDE_LONG
      ? ((targetPrice - openPrice) / openPrice) * 100
      : side === CONTRACT_SIDE_SHORT
        ? ((openPrice - targetPrice) / openPrice) * 100
        : 0;
  const grossProfitAmount = (openNotional * grossProfitRate) / 100;
  // 平仓手续费基于目标价对应的成交名义金额，而不是直接复用开仓名义金额。
  const targetNotional = quantity * targetPrice;
  const totalFee = ((openNotional + targetNotional) * feeRate) / 100;
  const netProfitAmount = grossProfitAmount - totalFee;
  const netProfitRate = (netProfitAmount / openNotional) * 100;

  return {
    grossProfitAmount,
    grossProfitRate,
    netProfitAmount,
    netProfitRate,
  };
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

function formatValidationNumber(value) {
  return Number(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 10,
  });
}

function roundTradeQuantity(value) {
  return Number(value.toFixed(12));
}
