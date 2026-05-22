export const CONTRACT_SIDE_LONG = 'long';
export const CONTRACT_SIDE_SHORT = 'short';
export const GRID_MODE_ARITHMETIC = 'arithmetic';
export const GRID_MODE_GEOMETRIC = 'geometric';

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

export function nextHigherGridPrice(gridPrices, index) {
  return index + 1 < gridPrices.length ? gridPrices[index + 1] : gridPrices[index];
}

export function nextLowerGridPrice(gridPrices, index) {
  return index - 1 >= 0 ? gridPrices[index - 1] : gridPrices[index];
}

export function gridProfitRate(side, gridStep, gridRatio, gridPrices, gridMode) {
  if (side === CONTRACT_SIDE_LONG) return longGridProfitRate(gridStep, gridRatio, gridPrices, gridMode);
  if (side === CONTRACT_SIDE_SHORT) return shortGridProfitRate(gridStep, gridRatio, gridPrices, gridMode);
  return 0;
}

export function totalYieldRate(side, lowerPrice, upperPrice) {
  if (side === CONTRACT_SIDE_LONG) return ((upperPrice - lowerPrice) / lowerPrice) * 100;
  if (side === CONTRACT_SIDE_SHORT) return ((upperPrice - lowerPrice) / upperPrice) * 100;
  return 0;
}

function longGridProfitRate(gridStep, gridRatio, gridPrices, gridMode) {
  if (gridStep === 0 || gridPrices.length < 2 || gridPrices[0] === 0) return 0;
  if (gridMode === GRID_MODE_GEOMETRIC) return (gridRatio - 1) * 100;
  return (gridStep / gridPrices[0]) * 100;
}

function shortGridProfitRate(gridStep, gridRatio, gridPrices, gridMode) {
  if (gridStep === 0 || gridPrices.length < 2) return 0;
  if (gridMode === GRID_MODE_GEOMETRIC) return (1 - 1 / gridRatio) * 100;
  const highSellPrice = gridPrices[gridPrices.length - 1];
  return highSellPrice === 0 ? 0 : (gridStep / highSellPrice) * 100;
}
