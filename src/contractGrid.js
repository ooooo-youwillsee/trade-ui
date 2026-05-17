export const CONTRACT_SIDE_LONG = 'long';
export const CONTRACT_SIDE_SHORT = 'short';
export const GRID_MODE_ARITHMETIC = 'arithmetic';
export const GRID_MODE_GEOMETRIC = 'geometric';

export function calculateContractGrid(input) {
  validateContractGridInput(input);

  const margin = input.investment + input.additionalInvestment;
  const notional = input.investment * input.leverage;
  const perGridMargin = input.investment / input.gridCount;
  const perGridNotional = notional / input.gridCount;
  const gridPrices = buildGridPrices(input.lowerPrice, input.upperPrice, input.gridCount, input.gridMode);
  const filledGridPositions = filledPositions(input, gridPrices);
  const filledGridPrices = filledGridPositions.map((position) => position.gridPrice);
  const position = calculateCurrentPosition(input, filledGridPositions, perGridNotional);
  const gridStep = gridPrices.length > 1 ? gridPrices[1] - gridPrices[0] : 0;
  const gridRatio =
    input.gridMode === GRID_MODE_GEOMETRIC && gridPrices.length > 1 ? gridPrices[1] / gridPrices[0] : 0;

  const result = {
    name: input.name,
    entryPrice: input.entryPrice,
    currentPrice: input.currentPrice,
    gridMode: input.gridMode,
    margin,
    initialMargin: input.investment,
    additionalInvestment: input.additionalInvestment,
    notional,
    perGridMargin,
    perGridNotional,
    filledGridCount: filledGridPrices.length,
    filledGridPrices,
    filledMargin: perGridMargin * filledGridPrices.length + input.additionalInvestment,
    currentNotional: position.notional,
    positionQuantity: position.quantity,
    averageEntryPrice: position.averageEntryPrice,
    floatingProfitLoss: position.floatingProfitLoss,
    currentEquity: 0,
    liquidationPrice: 0,
    estimatedGridLiquidationPrice: 0,
    gridPrices,
    gridStep,
    gridRatio,
    gridProfitRate: 0,
    totalYieldRate: 0,
  };

  result.currentEquity = result.filledMargin + result.floatingProfitLoss;
  const estimatedGridPosition = estimateGridPosition(input, gridPrices, perGridNotional);
  result.estimatedGridLiquidationPrice = liquidationPrice(
    input.side,
    estimatedGridPosition.averageEntryPrice,
    estimatedGridPosition.notional,
    result.margin,
  );
  result.gridProfitRate = gridProfitRate(input.side, gridStep, gridRatio, gridPrices, input.gridMode);
  result.totalYieldRate = totalYieldRate(input.side, input.lowerPrice, input.upperPrice);

  if (result.currentNotional === 0) {
    return result;
  }

  result.liquidationPrice = liquidationPrice(
    input.side,
    result.averageEntryPrice,
    result.currentNotional,
    result.filledMargin,
  );
  return result;
}

export function normalizeInput(rawInput) {
  return {
    name: rawInput.name.trim(),
    lowerPrice: Number(rawInput.lowerPrice),
    upperPrice: Number(rawInput.upperPrice),
    entryPrice: Number(rawInput.entryPrice),
    currentPrice: Number(rawInput.currentPrice),
    openOnCreate: Boolean(rawInput.openOnCreate),
    gridMode: rawInput.gridMode,
    gridCount: Number(rawInput.gridCount),
    side: rawInput.side,
    leverage: Number(rawInput.leverage),
    investment: Number(rawInput.investment),
    additionalInvestment: Number(rawInput.additionalInvestment),
  };
}

function validateContractGridInput(input) {
  if (input.lowerPrice <= 0) throw new Error('下限价格必须大于 0');
  if (input.upperPrice <= input.lowerPrice) throw new Error('上限价格必须大于下限价格');
  if (input.entryPrice <= 0) throw new Error('入场价格必须大于 0');
  if (input.currentPrice <= 0) throw new Error('当前价格必须大于 0');
  if (input.gridMode !== GRID_MODE_ARITHMETIC && input.gridMode !== GRID_MODE_GEOMETRIC) {
    throw new Error('网格模式必须是等差或等比');
  }
  if (!Number.isInteger(input.gridCount) || input.gridCount <= 0) throw new Error('网格数量必须是正整数');
  if (input.leverage <= 0) throw new Error('杠杆倍数必须大于 0');
  if (input.investment <= 0) throw new Error('初始保证金必须大于 0');
  if (input.additionalInvestment < 0) throw new Error('追加保证金不能小于 0');
  if (input.side !== CONTRACT_SIDE_LONG && input.side !== CONTRACT_SIDE_SHORT) {
    throw new Error('方向必须是做多或做空');
  }
}

function liquidationPrice(side, averageEntryPrice, positionNotional, margin) {
  if (positionNotional <= 0) return 0;
  if (side === CONTRACT_SIDE_LONG) {
    return Math.max(averageEntryPrice * (1 - margin / positionNotional), 0);
  }
  if (side === CONTRACT_SIDE_SHORT) {
    return averageEntryPrice * (1 + margin / positionNotional);
  }
  return 0;
}

function estimateGridPosition(input, gridPrices, perGridNotional) {
  const estimatedInput = {
    ...input,
    currentPrice: input.side === CONTRACT_SIDE_LONG ? input.lowerPrice : input.upperPrice,
  };
  return calculateCurrentPosition(estimatedInput, filledPositions(estimatedInput, gridPrices), perGridNotional);
}

function calculateCurrentPosition(input, positions, perGridNotional) {
  const position = {
    notional: 0,
    quantity: 0,
    averageEntryPrice: 0,
    floatingProfitLoss: 0,
  };

  for (const filled of positions) {
    const quantity = perGridNotional / filled.openPrice;
    position.notional += perGridNotional;
    position.quantity += quantity;
    position.floatingProfitLoss += limitedGridProfitLoss(
      input.currentPrice,
      filled.openPrice,
      filled.targetPrice,
      quantity,
      input.side,
    );
  }

  if (position.quantity > 0) {
    position.averageEntryPrice = position.notional / position.quantity;
  }
  return position;
}

function limitedGridProfitLoss(currentPrice, openPrice, targetPrice, quantity, side) {
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

function filledPositions(input, gridPrices) {
  const positions = [];
  gridPrices.forEach((price, index) => {
    if (price === input.entryPrice) return;

    if (input.side === CONTRACT_SIDE_LONG) {
      if (input.openOnCreate && price > input.entryPrice) {
        positions.push({ gridPrice: price, openPrice: input.entryPrice, targetPrice: price });
        return;
      }
      if (price < input.entryPrice && price >= input.currentPrice) {
        positions.push({ gridPrice: price, openPrice: price, targetPrice: nextHigherGridPrice(gridPrices, index) });
      }
      return;
    }

    if (input.side === CONTRACT_SIDE_SHORT) {
      if (input.openOnCreate && price < input.entryPrice) {
        positions.push({ gridPrice: price, openPrice: input.entryPrice, targetPrice: price });
        return;
      }
      if (price > input.entryPrice && price <= input.currentPrice) {
        positions.push({ gridPrice: price, openPrice: price, targetPrice: nextLowerGridPrice(gridPrices, index) });
      }
    }
  });
  return positions;
}

function nextHigherGridPrice(gridPrices, index) {
  return index + 1 < gridPrices.length ? gridPrices[index + 1] : gridPrices[index];
}

function nextLowerGridPrice(gridPrices, index) {
  return index - 1 >= 0 ? gridPrices[index - 1] : gridPrices[index];
}

function buildGridPrices(lowerPrice, upperPrice, gridCount, gridMode) {
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

function gridProfitRate(side, gridStep, gridRatio, gridPrices, gridMode) {
  if (side === CONTRACT_SIDE_LONG) {
    return longGridProfitRate(gridStep, gridRatio, gridPrices, gridMode);
  }
  if (side === CONTRACT_SIDE_SHORT) {
    return shortGridProfitRate(gridStep, gridRatio, gridPrices, gridMode);
  }
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

function totalYieldRate(side, lowerPrice, upperPrice) {
  if (side === CONTRACT_SIDE_LONG) return ((upperPrice - lowerPrice) / lowerPrice) * 100;
  if (side === CONTRACT_SIDE_SHORT) return ((upperPrice - lowerPrice) / upperPrice) * 100;
  return 0;
}
