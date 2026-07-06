import {
  buildGridPrices,
  calculateGridOrderProfit,
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_SHORT,
  filledPositions,
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
  gridProfitRate,
  limitedGridProfitLoss,
  normalizeMinTradeQuantity,
  totalYieldRate,
  validateMinimumTradeQuantity,
} from '../common/grid';

// 现货手续费率使用百分数语义，0.1 表示单边 0.1%。
export const DEFAULT_SPOT_GRID_FEE_RATE = 0.1;

// 现货网格计算模块：复用公共网格算法，并用投入金额计算持仓价值。

// 将现货网格表单字段规范成计算层需要的类型。
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
    feeRate: Number(rawInput.feeRate ?? DEFAULT_SPOT_GRID_FEE_RATE),
    minTradeQuantity: normalizeMinTradeQuantity(rawInput.minTradeQuantity, rawInput.name),
    openOnCreate: Boolean(rawInput.openOnCreate),
  };
}

// 计算现货网格的持仓、浮动盈亏、当前权益和网格收益率。
export function calculateSpotGrid(input) {
  input = {
    ...input,
    minTradeQuantity: normalizeMinTradeQuantity(input.minTradeQuantity, input.name),
  };
  validateSpotGridInput(input);
  // 兼容尚未保存 feeRate 的旧策略，缺失时使用现货默认费率。
  const feeRate = Number(input.feeRate ?? DEFAULT_SPOT_GRID_FEE_RATE);

  const gridPrices = buildGridPrices(input.lowerPrice, input.upperPrice, input.gridCount, input.gridMode);
  const perGridInvestment = input.investment / input.gridCount;
  const minimumTradeCheck = validateMinimumTradeQuantity({
    gridCount: input.gridCount,
    investment: input.investment,
    minTradeQuantity: input.minTradeQuantity,
    upperPrice: input.upperPrice,
    investmentLabel: '投入',
  });
  const gridInvestments = buildQuantityBasedInvestments(
    gridPrices,
    input.gridCount,
    minimumTradeCheck.tradablePerGridQuantity,
  );
  const filledGridPositions = filledPositions(input, gridPrices);
  const filledGridPrices = filledGridPositions.map((position) => position.gridPrice);
  const gridOrders = buildGridOrders(
    input.side,
    gridPrices,
    minimumTradeCheck.tradablePerGridQuantity,
    filledGridPrices,
    feeRate,
  );
  const position = calculateCurrentPosition(input, filledGridPositions, minimumTradeCheck.tradablePerGridQuantity);
  const gridStep = gridPrices.length > 1 ? gridPrices[1] - gridPrices[0] : 0;
  const gridRatio = input.gridMode === GRID_MODE_GEOMETRIC && gridPrices.length > 1 ? gridPrices[1] / gridPrices[0] : 0;

  return {
    name: input.name,
    entryPrice: input.entryPrice,
    currentPrice: input.currentPrice,
    gridMode: input.gridMode,
    investment: input.investment,
    feeRate,
    minTradeQuantity: minimumTradeCheck.minTradeQuantity,
    perGridInvestment,
    minimumPerGridQuantity: minimumTradeCheck.minimumPerGridQuantity,
    tradableGridUnits: minimumTradeCheck.tradableGridUnits,
    tradablePerGridQuantity: minimumTradeCheck.tradablePerGridQuantity,
    tradablePerGridInvestment: minimumTradeCheck.tradablePerGridInvestment,
    unallocatedInvestment: minimumTradeCheck.unallocatedInvestment,
    maxGridCountByMinTradeQuantity: minimumTradeCheck.maxGridCountByMinTradeQuantity,
    minimumRequiredInvestment: minimumTradeCheck.minimumRequiredInvestment,
    gridInvestments,
    gridOrders,
    filledGridCount: filledGridPrices.length,
    filledGridPrices,
    filledInvestment: position.cost,
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

// 固定每格成交数量，投入金额按该格开仓价反推，避免不同价格层产生不同成交数量。
function buildQuantityBasedInvestments(gridPrices, gridCount, quantity) {
  return gridPrices.slice(0, gridCount).map((price) => quantity * price);
}

// 挂单展示同样使用固定数量，利润以该格实际投入金额为名义成本计算。
function buildGridOrders(side, gridPrices, quantity, filledGridPrices, feeRate) {
  return gridPrices.slice(0, -1).map((price, index) => {
    const investment = quantity * price;
    const targetPrice = side === CONTRACT_SIDE_LONG ? gridPrices[index + 1] : gridPrices[index - 1];
    const profits = calculateGridOrderProfit(price, targetPrice, investment, side, feeRate);
    return {
      price,
      quantity,
      investment,
      ...profits,
      filled: filledGridPrices.includes(price),
    };
  });
}

// 现货网格不涉及杠杆，但仍需要价格区间、网格数和投入金额有效。
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
  // 手续费率允许为 0，但必须是有限数字且不能达到 100%。
  const feeRate = Number(input.feeRate ?? DEFAULT_SPOT_GRID_FEE_RATE);
  if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate >= 100) throw new Error('手续费率必须大于等于 0 且小于 100');
  if (input.side !== CONTRACT_SIDE_LONG && input.side !== CONTRACT_SIDE_SHORT) throw new Error('方向必须是做多或做空');
}

// 现货仓位以成本和数量累计，当前价值等于成本加受目标价限制后的浮盈浮亏。
function calculateCurrentPosition(input, positions, quantity) {
  const position = {
    quantity: 0,
    cost: 0,
    averageEntryPrice: 0,
    floatingProfitLoss: 0,
    currentValue: 0,
  };

  for (const filled of positions) {
    // 创建即建仓的格子可能按 entryPrice 成交，因此持仓成本必须按实际 openPrice 反推。
    const investment = quantity * filled.openPrice;
    position.quantity += quantity;
    position.cost += investment;
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
