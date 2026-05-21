import {
  buildGridPrices,
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_SHORT,
  filledPositions,
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
  gridProfitRate,
  limitedGridProfitLoss,
  totalYieldRate,
} from '../common/grid';

export function normalizeSpotGridInput(rawInput) {
  return {
    name: String(rawInput.name || '').trim(),
    lowerPrice: Number(rawInput.lowerPrice),
    upperPrice: Number(rawInput.upperPrice),
    entryPrice: Number(rawInput.entryPrice),
    currentPrice: Number(rawInput.currentPrice),
    gridMode: rawInput.gridMode,
    gridCount: Number(rawInput.gridCount),
    side: rawInput.side,
    investment: Number(rawInput.investment),
    openOnCreate: Boolean(rawInput.openOnCreate),
  };
}

export function calculateSpotGrid(input) {
  validateSpotGridInput(input);

  const gridPrices = buildGridPrices(input.lowerPrice, input.upperPrice, input.gridCount, input.gridMode);
  const perGridInvestment = input.investment / input.gridCount;
  const filledGridPositions = filledPositions(input, gridPrices);
  const filledGridPrices = filledGridPositions.map((position) => position.gridPrice);
  const position = calculateCurrentPosition(input, filledGridPositions, perGridInvestment);
  const gridStep = gridPrices.length > 1 ? gridPrices[1] - gridPrices[0] : 0;
  const gridRatio = input.gridMode === GRID_MODE_GEOMETRIC && gridPrices.length > 1 ? gridPrices[1] / gridPrices[0] : 0;

  return {
    name: input.name,
    entryPrice: input.entryPrice,
    currentPrice: input.currentPrice,
    gridMode: input.gridMode,
    investment: input.investment,
    perGridInvestment,
    filledGridCount: filledGridPrices.length,
    filledGridPrices,
    filledInvestment: perGridInvestment * filledGridPrices.length,
    currentValue: position.currentValue,
    positionQuantity: position.quantity,
    averageEntryPrice: position.averageEntryPrice,
    floatingProfitLoss: position.floatingProfitLoss,
    currentEquity: position.currentValue,
    gridPrices,
    gridStep,
    gridRatio,
    gridProfitRate: gridProfitRate(input.side, gridStep, gridRatio, gridPrices, input.gridMode),
    totalYieldRate: totalYieldRate(input.side, input.lowerPrice, input.upperPrice),
  };
}

function validateSpotGridInput(input) {
  if (!input.name) throw new Error('策略名称不能为空');
  if (input.lowerPrice <= 0) throw new Error('下限价格必须大于 0');
  if (input.upperPrice <= input.lowerPrice) throw new Error('上限价格必须大于下限价格');
  if (input.entryPrice <= 0) throw new Error('入场价格必须大于 0');
  if (input.currentPrice <= 0) throw new Error('当前价格必须大于 0');
  if (input.gridMode !== GRID_MODE_ARITHMETIC && input.gridMode !== GRID_MODE_GEOMETRIC) {
    throw new Error('网格模式必须是等差或等比');
  }
  if (!Number.isInteger(input.gridCount) || input.gridCount <= 0) throw new Error('网格数量必须是正整数');
  if (input.investment <= 0) throw new Error('投入金额必须大于 0');
  if (input.side !== CONTRACT_SIDE_LONG && input.side !== CONTRACT_SIDE_SHORT) throw new Error('方向必须是做多或做空');
}

function calculateCurrentPosition(input, positions, perGridInvestment) {
  const position = {
    quantity: 0,
    cost: 0,
    averageEntryPrice: 0,
    floatingProfitLoss: 0,
    currentValue: 0,
  };

  for (const filled of positions) {
    const quantity = perGridInvestment / filled.openPrice;
    position.quantity += quantity;
    position.cost += perGridInvestment;
    position.floatingProfitLoss += limitedGridProfitLoss(
      input.currentPrice,
      filled.openPrice,
      filled.targetPrice,
      quantity,
      input.side,
    );
  }

  if (position.quantity > 0) {
    position.averageEntryPrice = position.cost / position.quantity;
    position.currentValue = position.cost + position.floatingProfitLoss;
  }
  return position;
}
