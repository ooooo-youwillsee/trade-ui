import {
  buildGridPrices,
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_SHORT,
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
  nextHigherGridPrice,
  nextLowerGridPrice,
  POSITION_INCREMENT_DIFFERENCE,
  POSITION_INCREMENT_RATIO,
} from '../common/grid';
import { calculateContractGrid } from './grid';

export { GRID_MODE_ARITHMETIC, GRID_MODE_GEOMETRIC, POSITION_INCREMENT_DIFFERENCE, POSITION_INCREMENT_RATIO };

export function calculateContractHedgeGrid(input) {
  // 两条腿固定方向：多头腿只做多，空头腿只做空，避免表单方向污染计算口径。
  const longLegInput = buildLegInput(input.longLeg, CONTRACT_SIDE_LONG);
  const shortLegInput = buildLegInput(input.shortLeg, CONTRACT_SIDE_SHORT);
  const longLegResult = calculateContractGrid(longLegInput);
  const shortLegResult = calculateContractGrid(shortLegInput);
  const longScenarioPrice = scenarioPrice(longLegInput.currentPrice, input.longScenarioChangePercent);
  const shortScenarioPrice = scenarioPrice(shortLegInput.currentPrice, input.shortScenarioChangePercent);
  const longScenarioResult = calculateScenarioLegResult(longLegInput, longLegResult, longScenarioPrice);
  const shortScenarioResult = calculateScenarioLegResult(shortLegInput, shortLegResult, shortScenarioPrice);
  const longRequiredMarginAmount = requiredScenarioMargin(CONTRACT_SIDE_LONG, longScenarioResult);
  const shortRequiredMarginAmount = requiredScenarioMargin(CONTRACT_SIDE_SHORT, shortScenarioResult);
  // 可转出盈利取两条腿场景总收益中的正数，已止盈收益也会被纳入。
  const availableTransferAmount =
    Math.max(0, longScenarioResult.totalProfitLoss ?? longScenarioResult.floatingProfitLoss) +
    Math.max(0, shortScenarioResult.totalProfitLoss ?? shortScenarioResult.floatingProfitLoss);
  const requiredMarginAmount = longRequiredMarginAmount + shortRequiredMarginAmount;
  const scenarioFloatingProfitLoss = longScenarioResult.floatingProfitLoss + shortScenarioResult.floatingProfitLoss;

  return {
    name: input.name,
    longScenarioChangePercent: input.longScenarioChangePercent,
    shortScenarioChangePercent: input.shortScenarioChangePercent,
    longScenarioPrice,
    shortScenarioPrice,
    longLegInput,
    shortLegInput,
    longLegResult,
    shortLegResult,
    longScenarioResult,
    shortScenarioResult,
    longRequiredMarginAmount,
    shortRequiredMarginAmount,
    availableTransferAmount,
    requiredMarginAmount,
    marginShortfall: Math.max(0, requiredMarginAmount - availableTransferAmount),
    scenarioFloatingProfitLoss,
  };
}

export function normalizeHedgeGridInput(rawInput) {
  return {
    name: String(rawInput.name || '').trim(),
    longScenarioChangePercent: Number(rawInput.longScenarioChangePercent),
    shortScenarioChangePercent: Number(rawInput.shortScenarioChangePercent),
    longLeg: normalizeLegInput(rawInput.longLeg),
    shortLeg: normalizeLegInput(rawInput.shortLeg),
  };
}

function buildLegInput(rawLeg, side) {
  return {
    ...normalizeLegInput(rawLeg),
    side,
  };
}

function normalizeLegInput(rawLeg = {}) {
  return {
    name: String(rawLeg.name || '').trim(),
    lowerPrice: Number(rawLeg.lowerPrice),
    upperPrice: Number(rawLeg.upperPrice),
    entryPrice: Number(rawLeg.entryPrice),
    currentPrice: Number(rawLeg.currentPrice),
    openOnCreate: Boolean(rawLeg.openOnCreate),
    gridMode: rawLeg.gridMode,
    gridCount: Number(rawLeg.gridCount),
    leverage: Number(rawLeg.leverage),
    investment: Number(rawLeg.investment),
    additionalInvestment: Number(rawLeg.additionalInvestment),
    positionIncrementMode: rawLeg.positionIncrementMode || POSITION_INCREMENT_RATIO,
    positionIncrementValue: Number(rawLeg.positionIncrementValue || 0),
  };
}

function scenarioPrice(currentPrice, changePercent) {
  return currentPrice * (1 + Number(changePercent || 0) / 100);
}

function calculateScenarioLegResult(input, currentResult, nextPrice) {
  // 逆势场景会继续触发新网格，直接复用公共合约网格按场景价重算。
  if (!isFavorableMove(input.side, input.currentPrice, nextPrice)) {
    return calculateContractGrid({ ...input, currentPrice: nextPrice });
  }

  // 顺势场景从当前未平仓网格出发，只处理止盈平仓，不新增逆势仓位。
  const gridPrices = buildGridPrices(input.lowerPrice, input.upperPrice, input.gridCount, input.gridMode);
  const openPositions = currentResult.openGridPrices.map((gridPrice) =>
    buildScenarioPosition(input, gridPrice, gridPrices, currentResult.gridNotionals),
  );
  const nextOpenPositions = [];
  const nextClosedPositions = [...(currentResult.closedGridPrices || [])];
  let realizedProfitLoss = currentResult.realizedProfitLoss || 0;

  // 对冲场景是从当前价推演到场景价，顺势到达目标价的当前持仓要转成已实现收益。
  openPositions.forEach((position) => {
    if (positionClosed(input.side, nextPrice, position.targetPrice)) {
      nextClosedPositions.push(position.gridPrice);
      realizedProfitLoss += profitAtTarget(input.side, position);
      return;
    }
    nextOpenPositions.push(position);
  });

  const openPosition = aggregateScenarioPositions(input.side, nextPrice, nextOpenPositions, input.leverage);
  const filledMargin = openPosition.margin + input.additionalInvestment;
  // 场景总收益 = 已止盈收益 + 剩余未平仓浮盈亏，用于权益和可转出盈利。
  const totalProfitLoss = realizedProfitLoss + openPosition.floatingProfitLoss;

  return {
    ...currentResult,
    currentPrice: nextPrice,
    openGridCount: nextOpenPositions.length,
    openGridPrices: nextOpenPositions.map((position) => position.gridPrice),
    closedGridCount: nextClosedPositions.length,
    closedGridPrices: nextClosedPositions,
    filledMargin,
    currentNotional: openPosition.notional,
    positionQuantity: openPosition.quantity,
    averageEntryPrice: openPosition.averageEntryPrice,
    realizedProfitLoss,
    unrealizedProfitLoss: openPosition.floatingProfitLoss,
    totalProfitLoss,
    floatingProfitLoss: totalProfitLoss,
    currentEquity: filledMargin + totalProfitLoss,
    liquidationPrice: liquidationPrice(input.side, openPosition.averageEntryPrice, openPosition.notional, filledMargin),
  };
}

function isFavorableMove(side, currentPrice, nextPrice) {
  return side === CONTRACT_SIDE_LONG ? nextPrice > currentPrice : nextPrice < currentPrice;
}

function buildScenarioPosition(input, gridPrice, gridPrices, gridNotionals) {
  const priceIndex = gridPrices.findIndex((price) => price === gridPrice);
  const notional = gridNotionals[Math.min(Math.max(priceIndex, 0), gridNotionals.length - 1)] || 0;
  // 创建时建仓的初始仓位按入场价成交，目标价是对应网格价。
  const openedOnCreate =
    input.openOnCreate &&
    ((input.side === CONTRACT_SIDE_LONG && gridPrice > input.entryPrice) ||
      (input.side === CONTRACT_SIDE_SHORT && gridPrice < input.entryPrice));
  const openPrice = openedOnCreate ? input.entryPrice : gridPrice;
  const targetPrice = openedOnCreate
    ? gridPrice
    : input.side === CONTRACT_SIDE_LONG
      ? nextHigherGridPrice(gridPrices, priceIndex)
      : nextLowerGridPrice(gridPrices, priceIndex);
  return {
    gridPrice,
    openPrice,
    targetPrice,
    notional,
    quantity: notional / openPrice,
  };
}

function positionClosed(side, price, targetPrice) {
  return side === CONTRACT_SIDE_LONG ? price >= targetPrice : price <= targetPrice;
}

function profitAtTarget(side, position) {
  if (side === CONTRACT_SIDE_LONG) return (position.targetPrice - position.openPrice) * position.quantity;
  return (position.openPrice - position.targetPrice) * position.quantity;
}

function aggregateScenarioPositions(side, currentPrice, positions, leverage) {
  // 只聚合场景下仍未平仓的网格，强平价和均价不能包含已止盈仓位。
  const aggregate = {
    margin: 0,
    notional: 0,
    quantity: 0,
    averageEntryPrice: 0,
    floatingProfitLoss: 0,
  };

  positions.forEach((position) => {
    aggregate.margin += position.notional / leverage;
    aggregate.notional += position.notional;
    aggregate.quantity += position.quantity;
    aggregate.floatingProfitLoss += limitedScenarioProfitLoss(side, currentPrice, position);
  });

  if (aggregate.quantity > 0) {
    aggregate.averageEntryPrice = aggregate.notional / aggregate.quantity;
  }
  return aggregate;
}

function limitedScenarioProfitLoss(side, currentPrice, position) {
  // 顺势推演时浮盈最多只认到目标止盈价，超过部分视为已平仓后的空档。
  if (side === CONTRACT_SIDE_LONG) {
    const profitLoss = (currentPrice - position.openPrice) * position.quantity;
    const maxProfit = (position.targetPrice - position.openPrice) * position.quantity;
    return maxProfit > 0 && profitLoss > maxProfit ? maxProfit : profitLoss;
  }

  const profitLoss = (position.openPrice - currentPrice) * position.quantity;
  const maxProfit = (position.openPrice - position.targetPrice) * position.quantity;
  return maxProfit > 0 && profitLoss > maxProfit ? maxProfit : profitLoss;
}

function liquidationPrice(side, averageEntryPrice, positionNotional, margin) {
  if (positionNotional <= 0) return 0;
  if (side === CONTRACT_SIDE_LONG) return Math.max(averageEntryPrice * (1 - margin / positionNotional), 0);
  return averageEntryPrice * (1 + margin / positionNotional);
}

function requiredScenarioMargin(side, scenarioResult) {
  // 没有未平仓持仓时不存在场景强平风险，也不需要补充保证金。
  if (
    scenarioResult.currentNotional <= 0 ||
    scenarioResult.averageEntryPrice <= 0 ||
    scenarioResult.filledMargin <= 0
  ) {
    return 0;
  }

  if (side === CONTRACT_SIDE_LONG) {
    // 多头亏损来自价格低于持仓均价，补保证金只覆盖简化强平口径下的缺口。
    return Math.max(
      0,
      scenarioResult.currentNotional * (1 - scenarioResult.currentPrice / scenarioResult.averageEntryPrice) -
        scenarioResult.filledMargin,
    );
  }

  // 空头亏损来自价格高于持仓均价，公式与多头方向相反。
  return Math.max(
    0,
    scenarioResult.currentNotional * (scenarioResult.currentPrice / scenarioResult.averageEntryPrice - 1) -
      scenarioResult.filledMargin,
  );
}
