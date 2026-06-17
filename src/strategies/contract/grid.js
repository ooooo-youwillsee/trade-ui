import {
  buildGridPrices,
  buildGridPositionInvestments,
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_NEUTRAL,
  CONTRACT_SIDE_SHORT,
  filledPositions,
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
  gridProfitRate,
  gridPositionInvestment,
  limitedGridProfitLoss,
  POSITION_INCREMENT_DIFFERENCE,
  POSITION_INCREMENT_RATIO,
  totalYieldRate,
} from '../common/grid';

// 合约网格计算模块：在公共网格算法之上补充杠杆、保证金和强平价逻辑。
export {
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_NEUTRAL,
  CONTRACT_SIDE_SHORT,
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
  POSITION_INCREMENT_DIFFERENCE,
  POSITION_INCREMENT_RATIO,
};

// 计算合约网格的完整结果，调用方需先传入已 normalize 的数值字段。
export function calculateContractGrid(input) {
  validateContractGridInput(input);

  // 保证金和名义价值是合约网格区别于现货网格的核心指标。
  const margin = input.investment + input.additionalInvestment;
  const notional = input.investment * input.leverage;
  const perGridMargin = input.investment / input.gridCount;
  const perGridNotional = notional / input.gridCount;
  const gridPrices = buildGridPrices(input.lowerPrice, input.upperPrice, input.gridCount, input.gridMode);
  const gridMargins = buildContractGridMargins(input, gridPrices);
  const gridNotionals = gridMargins.map((gridMargin) => gridMargin * input.leverage);
  const filledGridPositions = contractFilledPositions(input, gridPrices);
  const positionGroups = splitContractPositions(input, filledGridPositions);
  const filledGridPrices = filledGridPositions.map((position) => position.gridPrice);
  const openGridPrices = positionGroups.openPositions.map((position) => position.gridPrice);
  const closedGridPrices = positionGroups.closedPositions.map((position) => position.gridPrice);
  const gridOrders = buildGridOrders(
    input.side,
    input.entryPrice,
    gridPrices,
    gridMargins,
    input.leverage,
    filledGridPrices,
  );
  const position = calculateCurrentPosition(input, positionGroups.openPositions, gridPrices, gridNotionals);
  const realizedProfitLoss = realizedGridProfitLoss(positionGroups.closedPositions, gridPrices, gridNotionals);
  const totalProfitLoss = realizedProfitLoss + position.floatingProfitLoss;
  const longLeg = buildContractLeg(input, CONTRACT_SIDE_LONG, filledGridPositions, gridPrices, gridNotionals);
  const shortLeg = buildContractLeg(input, CONTRACT_SIDE_SHORT, filledGridPositions, gridPrices, gridNotionals);
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
    positionIncrementMode: input.positionIncrementMode,
    positionIncrementValue: input.positionIncrementValue,
    notional,
    perGridMargin,
    perGridNotional,
    gridMargins,
    gridNotionals,
    gridOrders,
    filledGridCount: filledGridPrices.length,
    filledGridPrices,
    openGridCount: openGridPrices.length,
    openGridPrices,
    closedGridCount: closedGridPrices.length,
    closedGridPrices,
    filledMargin: position.margin + input.additionalInvestment,
    currentNotional: position.notional,
    positionQuantity: position.quantity,
    averageEntryPrice: position.averageEntryPrice,
    realizedProfitLoss,
    unrealizedProfitLoss: position.floatingProfitLoss,
    totalProfitLoss,
    // 兼容旧 UI：floatingProfitLoss 暂时保留为总收益，避免列表和详情页断裂。
    floatingProfitLoss: totalProfitLoss,
    currentEquity: 0,
    liquidationPrice: 0,
    estimatedGridLiquidationPrice: 0,
    gridPrices,
    gridStep,
    gridRatio,
    longLeg,
    shortLeg,
    gridProfitRate: 0,
    totalYieldRate: 0,
  };

  // 当前权益只包含已经成交网格占用的保证金和浮动盈亏。
  result.currentEquity = result.filledMargin + result.totalProfitLoss;
  // 估算网格强平价时，用区间极端价格模拟网格全部触发后的仓位。
  const estimatedGridPosition = estimateGridPosition(input, gridPrices, gridNotionals);
  result.estimatedGridLiquidationPrice = estimatedLiquidationPrice(input, result, estimatedGridPosition);
  result.gridProfitRate = contractGridProfitRate(input.side, gridStep, gridRatio, gridPrices, input.gridMode);
  result.totalYieldRate = totalYieldRate(input.side, input.lowerPrice, input.upperPrice);

  if (result.currentNotional === 0) {
    return result;
  }

  result.liquidationPrice =
    input.side === CONTRACT_SIDE_NEUTRAL
      ? nearestLiquidationPrice(input.currentPrice, result.longLeg.liquidationPrice, result.shortLeg.liquidationPrice)
      : liquidationPrice(input.side, result.averageEntryPrice, result.currentNotional, result.filledMargin);
  return result;
}

// 中性网格需要按价格方向选择仓位权重：入场价下方沿用多头分配，上方沿用空头分配。
function buildContractGridMargins(input, gridPrices) {
  if (input.side !== CONTRACT_SIDE_NEUTRAL) {
    return buildGridPositionInvestments(
      input.investment,
      input.gridCount,
      input.side,
      input.positionIncrementMode,
      input.positionIncrementValue,
    );
  }

  const longMargins = buildGridPositionInvestments(
    input.investment,
    input.gridCount,
    CONTRACT_SIDE_LONG,
    input.positionIncrementMode,
    input.positionIncrementValue,
  );
  const shortMargins = buildGridPositionInvestments(
    input.investment,
    input.gridCount,
    CONTRACT_SIDE_SHORT,
    input.positionIncrementMode,
    input.positionIncrementValue,
  );

  return Array.from({ length: input.gridCount }, (_, index) => {
    const price = gridPrices[index];
    return price > input.entryPrice ? shortMargins[index] : longMargins[index];
  });
}

// 为合约网格成交仓位补充 side 字段，中性模式会同时合并多腿和空腿成交结果。
function contractFilledPositions(input, gridPrices) {
  if (input.side !== CONTRACT_SIDE_NEUTRAL) {
    return filledPositions(input, gridPrices).map((position) => ({ ...position, side: input.side }));
  }

  const longPositions = filledPositions({ ...input, side: CONTRACT_SIDE_LONG }, gridPrices).map((position) => ({
    ...position,
    side: CONTRACT_SIDE_LONG,
  }));
  const shortPositions = filledPositions({ ...input, side: CONTRACT_SIDE_SHORT }, gridPrices).map((position) => ({
    ...position,
    side: CONTRACT_SIDE_SHORT,
  }));
  return [...longPositions, ...shortPositions].sort((left, right) => left.gridPrice - right.gridPrice);
}

// 将已成交网格拆成未平仓和已止盈：成交由价格穿越判断，达到目标价后只保留收益，不再计入持仓。
function splitContractPositions(input, positions) {
  return positions.reduce(
    (groups, position) => {
      const side = position.side || input.side;
      const closed =
        side === CONTRACT_SIDE_LONG
          ? input.currentPrice >= position.targetPrice
          : input.currentPrice <= position.targetPrice;
      if (closed) groups.closedPositions.push(position);
      else groups.openPositions.push(position);
      return groups;
    },
    { openPositions: [], closedPositions: [] },
  );
}

// 已实现收益只来自已止盈平仓的网格，未实现收益仍由未平仓仓位按当前价计算。
function realizedGridProfitLoss(positions, gridPrices, gridNotionals) {
  return positions.reduce((sum, position) => {
    const notional = gridPositionInvestment(position, gridPrices, gridNotionals);
    const quantity = notional / position.openPrice;
    const side = position.side || CONTRACT_SIDE_LONG;
    if (side === CONTRACT_SIDE_LONG) return sum + (position.targetPrice - position.openPrice) * quantity;
    if (side === CONTRACT_SIDE_SHORT) return sum + (position.openPrice - position.targetPrice) * quantity;
    return sum;
  }, 0);
}

// 从中性网格的混合仓位中提取单条腿，用于详情页展示独立强平价、仓位和浮盈亏。
function buildContractLeg(input, side, positions, gridPrices, gridNotionals) {
  const legPositions = positions.filter((position) => position.side === side);
  const allPositionGroups = splitContractPositions(input, positions);
  const positionGroups = splitContractPositions({ ...input, side }, legPositions);
  const position = calculateCurrentPosition(
    { ...input, side },
    positionGroups.openPositions,
    gridPrices,
    gridNotionals,
  );
  const realizedProfitLoss = realizedGridProfitLoss(positionGroups.closedPositions, gridPrices, gridNotionals);
  const totalProfitLoss = realizedProfitLoss + position.floatingProfitLoss;
  const additionalMargin = legAdditionalMargin(
    side,
    input.additionalInvestment,
    input.leverage,
    allPositionGroups.openPositions,
    gridPrices,
    gridNotionals,
  );
  const filledMargin = position.margin + additionalMargin;
  return {
    side,
    filledGridCount: legPositions.length,
    filledGridPrices: legPositions.map((position) => position.gridPrice),
    openGridCount: positionGroups.openPositions.length,
    openGridPrices: positionGroups.openPositions.map((position) => position.gridPrice),
    closedGridCount: positionGroups.closedPositions.length,
    closedGridPrices: positionGroups.closedPositions.map((position) => position.gridPrice),
    filledMargin,
    currentNotional: position.notional,
    positionQuantity: position.quantity,
    averageEntryPrice: position.averageEntryPrice,
    realizedProfitLoss,
    unrealizedProfitLoss: position.floatingProfitLoss,
    totalProfitLoss,
    floatingProfitLoss: totalProfitLoss,
    currentEquity: filledMargin + totalProfitLoss,
    liquidationPrice: liquidationPrice(side, position.averageEntryPrice, position.notional, filledMargin),
  };
}

// 追加保证金按两条腿当前已占用保证金比例分摊，未形成仓位时两边均分。
function legAdditionalMargin(side, additionalInvestment, leverage, positions, gridPrices, gridNotionals) {
  if (additionalInvestment <= 0) return 0;
  const longMargin = legUsedMargin(CONTRACT_SIDE_LONG, positions, gridPrices, gridNotionals, leverage);
  const shortMargin = legUsedMargin(CONTRACT_SIDE_SHORT, positions, gridPrices, gridNotionals, leverage);
  const totalMargin = longMargin + shortMargin;
  if (totalMargin === 0) return additionalInvestment / 2;
  return (additionalInvestment * (side === CONTRACT_SIDE_LONG ? longMargin : shortMargin)) / totalMargin;
}

// 统计指定腿已成交网格实际占用的保证金，用于追加保证金比例分配。
function legUsedMargin(side, positions, gridPrices, gridNotionals, leverage) {
  return positions
    .filter((position) => position.side === side)
    .reduce((sum, position) => sum + gridPositionInvestment(position, gridPrices, gridNotionals) / leverage, 0);
}

// 构造挂单展示行，中性模式会把每格标记为做多腿或做空腿。
function buildGridOrders(side, entryPrice, gridPrices, gridMargins, leverage, filledGridPrices) {
  return gridMargins.map((margin, index) => {
    const price = gridPrices[index];
    const orderSide = gridOrderSide(side, entryPrice, price);
    const profitRate = gridOrderProfitRate(orderSide, gridPrices, index);
    return {
      price,
      margin,
      side: orderSide,
      profitRate,
      profitAmount: (margin * leverage * profitRate) / 100,
      filled: filledGridPrices.includes(price),
    };
  });
}

// 中性挂单按入场价分界：下方按做多腿处理，上方按做空腿处理。
function gridOrderSide(side, entryPrice, price) {
  if (side !== CONTRACT_SIDE_NEUTRAL) return side;
  return price > entryPrice ? CONTRACT_SIDE_SHORT : CONTRACT_SIDE_LONG;
}

function gridOrderProfitRate(side, gridPrices, index) {
  const price = gridPrices[index];
  const targetPrice = side === CONTRACT_SIDE_LONG ? gridPrices[index + 1] : gridPrices[index - 1];
  if (!price || !targetPrice) return 0;
  if (side === CONTRACT_SIDE_LONG) return ((targetPrice - price) / price) * 100;
  if (side === CONTRACT_SIDE_SHORT) return ((price - targetPrice) / price) * 100;
  return 0;
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
    side: rawInput.side || CONTRACT_SIDE_LONG,
    leverage: Number(rawInput.leverage),
    investment: Number(rawInput.investment),
    additionalInvestment: Number(rawInput.additionalInvestment),
    positionIncrementMode: rawInput.positionIncrementMode || POSITION_INCREMENT_RATIO,
    positionIncrementValue: Number(rawInput.positionIncrementValue || 0),
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
  if (input.side !== CONTRACT_SIDE_LONG && input.side !== CONTRACT_SIDE_SHORT && input.side !== CONTRACT_SIDE_NEUTRAL) {
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
// 列表兼容字段只保留一个强平价，中性模式取距离当前价最近的一侧风险。
function estimatedLiquidationPrice(input, result, estimatedGridPosition) {
  if (input.side === CONTRACT_SIDE_NEUTRAL) {
    return nearestLiquidationPrice(
      input.currentPrice,
      result.longLeg.liquidationPrice,
      result.shortLeg.liquidationPrice,
    );
  }
  return liquidationPrice(
    input.side,
    estimatedGridPosition.averageEntryPrice,
    estimatedGridPosition.notional,
    result.margin,
  );
}

// 在多腿和空腿强平价之间选择离当前价更近的风险价格。
function nearestLiquidationPrice(currentPrice, longLiquidationPrice, shortLiquidationPrice) {
  if (!longLiquidationPrice) return shortLiquidationPrice || 0;
  if (!shortLiquidationPrice) return longLiquidationPrice || 0;
  return Math.abs(currentPrice - longLiquidationPrice) <= Math.abs(shortLiquidationPrice - currentPrice)
    ? longLiquidationPrice
    : shortLiquidationPrice;
}

// 中性网格的单格收益率取多空两侧中更保守的一侧，避免列表指标过度乐观。
function contractGridProfitRate(side, gridStep, gridRatio, gridPrices, gridMode) {
  if (side !== CONTRACT_SIDE_NEUTRAL) return gridProfitRate(side, gridStep, gridRatio, gridPrices, gridMode);
  return Math.min(
    gridProfitRate(CONTRACT_SIDE_LONG, gridStep, gridRatio, gridPrices, gridMode),
    gridProfitRate(CONTRACT_SIDE_SHORT, gridStep, gridRatio, gridPrices, gridMode),
  );
}

function estimateGridPosition(input, gridPrices, gridNotionals) {
  const estimatedInput = {
    ...input,
    currentPrice: input.side === CONTRACT_SIDE_LONG ? input.lowerPrice : input.upperPrice,
  };
  return calculateCurrentPosition(
    estimatedInput,
    filledPositions(estimatedInput, gridPrices),
    gridPrices,
    gridNotionals,
  );
}

// 合约仓位按每格名义价值累计，均价由名义价值和数量反推。
function calculateCurrentPosition(input, positions, gridPrices, gridNotionals) {
  const position = {
    margin: 0,
    notional: 0,
    quantity: 0,
    averageEntryPrice: 0,
    floatingProfitLoss: 0,
  };

  for (const filled of positions) {
    const notional = gridPositionInvestment(filled, gridPrices, gridNotionals);
    const quantity = notional / filled.openPrice;
    const side = filled.side || input.side;
    position.margin += notional / input.leverage;
    position.notional += notional;
    position.quantity += quantity;
    position.floatingProfitLoss += limitedGridProfitLoss(
      input.currentPrice,
      filled.openPrice,
      filled.targetPrice,
      quantity,
      side,
    );
  }

  if (position.quantity > 0) {
    position.averageEntryPrice = position.notional / position.quantity;
  }
  return position;
}
