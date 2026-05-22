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

// 合约网格计算模块：在公共网格算法之上补充杠杆、保证金和强平价逻辑。
export { CONTRACT_SIDE_LONG, CONTRACT_SIDE_SHORT, GRID_MODE_ARITHMETIC, GRID_MODE_GEOMETRIC };

// 计算合约网格的完整结果，调用方需先传入已 normalize 的数值字段。
export function calculateContractGrid(input) {
  validateContractGridInput(input);

  // 保证金和名义价值是合约网格区别于现货网格的核心指标。
  const margin = input.investment + input.additionalInvestment;
  const notional = input.investment * input.leverage;
  const perGridMargin = input.investment / input.gridCount;
  const perGridNotional = notional / input.gridCount;
  const gridPrices = buildGridPrices(input.lowerPrice, input.upperPrice, input.gridCount, input.gridMode);
  const filledGridPositions = filledPositions(input, gridPrices);
  const filledGridPrices = filledGridPositions.map((position) => position.gridPrice);
  const position = calculateCurrentPosition(input, filledGridPositions, perGridNotional);
  const gridStep = gridPrices.length > 1 ? gridPrices[1] - gridPrices[0] : 0;
  const gridRatio = input.gridMode === GRID_MODE_GEOMETRIC && gridPrices.length > 1 ? gridPrices[1] / gridPrices[0] : 0;

  // 先构造结果对象，再补充依赖中间结果的权益、强平和收益率字段。
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

  // 当前权益只包含已经成交网格占用的保证金和浮动盈亏。
  result.currentEquity = result.filledMargin + result.floatingProfitLoss;
  // 估算网格强平价时，用区间极端价格模拟网格全部触发后的仓位。
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

// 将表单字符串显式转换为计算层需要的数字和布尔值。
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

// 合约网格校验覆盖价格区间、网格模式、杠杆和保证金约束。
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

// 简化强平估算：做多价格下移，做空价格上移，保证金作为可承受亏损预算。
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

// 用区间低点/高点估算极端情况下的合约仓位，用于展示网格整体风险。
function estimateGridPosition(input, gridPrices, perGridNotional) {
  const estimatedInput = {
    ...input,
    currentPrice: input.side === CONTRACT_SIDE_LONG ? input.lowerPrice : input.upperPrice,
  };
  return calculateCurrentPosition(estimatedInput, filledPositions(estimatedInput, gridPrices), perGridNotional);
}

// 合约仓位按每格名义价值累计，均价由名义价值和数量反推。
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
