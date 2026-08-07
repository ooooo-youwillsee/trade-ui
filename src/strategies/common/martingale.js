// 马丁策略公共计算模块：统一现货和合约的层级、止盈、持仓与风险估算。

export const MARTINGALE_MODE_SPOT = 'spot';
export const MARTINGALE_MODE_FUTURES = 'futures';

export const MARTINGALE_SIDE_LONG = 'long';
export const MARTINGALE_SIDE_SHORT = 'short';

// 统一将表单输入转换为计算和持久化使用的稳定结构。
export function normalizeMartingaleInput(rawInput) {
  return {
    name: String(rawInput.name || '').trim(),
    mode: rawInput.mode,
    side: rawInput.side,
    entryPrice: Number(rawInput.entryPrice),
    currentPrice: Number(rawInput.currentPrice),
    firstOrderAmount: Number(rawInput.firstOrderAmount),
    multiplier: Number(rawInput.multiplier),
    maxLayers: Number(rawInput.maxLayers),
    triggerPercent: Number(rawInput.triggerPercent),
    takeProfitPercent: Number(rawInput.takeProfitPercent),
    leverage: Number(rawInput.leverage),
    additionalMargin: Number(rawInput.additionalMargin),
  };
}

// 层级价格只由入场价决定；当前价仅用于判断执行层数和计算浮动盈亏。
export function calculateMartingale(rawInput) {
  const input = normalizeMartingaleInput(rawInput);
  validateMartingaleInput(input);

  const layers = [];
  let cumulativeInvestment = 0;
  let cumulativeMargin = 0;
  let cumulativeNotional = 0;
  let cumulativeQuantity = 0;
  let cumulativeCost = 0;

  for (let index = 0; index < input.maxLayers; index += 1) {
    const triggerPrice = layerTriggerPrice(input, index);
    const orderAmount = input.firstOrderAmount * Math.pow(input.multiplier, index);
    const marginAmount = input.mode === MARTINGALE_MODE_FUTURES ? orderAmount : 0;
    const notional = input.mode === MARTINGALE_MODE_FUTURES ? orderAmount * input.leverage : orderAmount;
    const quantity = notional / triggerPrice;

    assertCalculableMartingaleValues(triggerPrice > 0, triggerPrice, orderAmount, marginAmount, notional, quantity);

    cumulativeInvestment += input.mode === MARTINGALE_MODE_SPOT ? orderAmount : 0;
    cumulativeMargin += marginAmount;
    cumulativeNotional += notional;
    cumulativeQuantity += quantity;
    cumulativeCost += quantity * triggerPrice;

    const averageEntryPrice = cumulativeCost / cumulativeQuantity;
    const takeProfitPrice = takeProfitTarget(input.side, averageEntryPrice, input.takeProfitPercent);
    const takeProfitProfit = Math.abs(takeProfitPrice - averageEntryPrice) * cumulativeQuantity;
    const currentFloatingProfitLoss = calculateFloatingProfitLoss(
      input.side,
      input.currentPrice,
      averageEntryPrice,
      cumulativeQuantity,
    );
    const currentFloatingProfitRate = (currentFloatingProfitLoss / cumulativeNotional) * 100;
    const capitalUsed = input.mode === MARTINGALE_MODE_FUTURES ? cumulativeMargin : cumulativeInvestment;

    assertCalculableMartingaleValues(
      true,
      cumulativeInvestment,
      cumulativeMargin,
      cumulativeNotional,
      cumulativeQuantity,
      cumulativeCost,
      averageEntryPrice,
      takeProfitPrice,
      takeProfitProfit,
      currentFloatingProfitLoss,
      currentFloatingProfitRate,
      capitalUsed,
    );

    layers.push({
      layer: index + 1,
      triggerPrice,
      orderAmount,
      marginAmount,
      notional,
      cumulativeInvestment,
      cumulativeMargin,
      cumulativeNotional,
      quantity,
      cumulativeQuantity,
      averageEntryPrice,
      takeProfitPrice,
      takeProfitProfit,
      currentFloatingProfitLoss,
      currentFloatingProfitRate,
      capitalUsed,
    });
  }

  const currentExecutedLayers = countExecutedLayers(input, layers);
  const currentPosition = summarizeLayers(input, layers.slice(0, currentExecutedLayers));
  const maxPosition = summarizeLayers(input, layers);
  const liquidationPrice =
    input.mode === MARTINGALE_MODE_FUTURES
      ? estimateLiquidationPrice(
          input.side,
          currentPosition.averageEntryPrice,
          currentPosition.notional,
          currentPosition.margin,
          input.additionalMargin,
        )
      : 0;
  const liquidationDistance =
    input.mode === MARTINGALE_MODE_FUTURES
      ? distanceToLiquidation(input.side, input.currentPrice, liquidationPrice)
      : 0;

  return {
    name: input.name,
    mode: input.mode,
    side: input.side,
    entryPrice: input.entryPrice,
    currentPrice: input.currentPrice,
    layers,
    currentExecutedLayers,
    currentAverageEntryPrice: currentPosition.averageEntryPrice,
    currentQuantity: currentPosition.quantity,
    currentNotional: currentPosition.notional,
    currentMargin: currentPosition.margin,
    currentFloatingProfitLoss: currentPosition.floatingProfitLoss,
    currentEquity:
      input.mode === MARTINGALE_MODE_FUTURES
        ? currentPosition.margin + input.additionalMargin + currentPosition.floatingProfitLoss
        : 0,
    currentTakeProfitPrice: currentPosition.takeProfitPrice,
    currentTakeProfitProfit: currentPosition.takeProfitProfit,
    maxAverageEntryPrice: maxPosition.averageEntryPrice,
    maxTakeProfitPrice: maxPosition.takeProfitPrice,
    maxTakeProfitProfit: maxPosition.takeProfitProfit,
    liquidationPrice,
    liquidationDistance,
  };
}

function validateMartingaleInput(input) {
  if (!input.name) throw new Error('策略名称不能为空');
  if (input.mode !== MARTINGALE_MODE_SPOT && input.mode !== MARTINGALE_MODE_FUTURES)
    throw new Error('交易模式必须是现货或合约');
  if (input.side !== MARTINGALE_SIDE_LONG && input.side !== MARTINGALE_SIDE_SHORT)
    throw new Error('方向必须是做多或做空');
  if (input.entryPrice <= 0) throw new Error('入场价必须大于 0');
  if (input.currentPrice <= 0) throw new Error('当前价必须大于 0');
  if (input.firstOrderAmount <= 0) throw new Error('首单金额必须大于 0');
  if (input.multiplier < 1) throw new Error('加仓倍数必须大于或等于 1');
  if (!Number.isInteger(input.maxLayers) || input.maxLayers <= 0) throw new Error('最大层数必须是正整数');
  if (input.triggerPercent <= 0) throw new Error('触发幅度必须大于 0');
  if (input.triggerPercent >= 100 && input.side === MARTINGALE_SIDE_LONG) throw new Error('做多触发幅度必须小于 100%');
  if (input.takeProfitPercent <= 0) throw new Error('止盈比例必须大于 0');
  if (input.mode === MARTINGALE_MODE_FUTURES && input.leverage <= 0) throw new Error('合约杠杆必须大于 0');
  if (!Number.isFinite(input.additionalMargin)) throw new Error('马丁参数组合超出可计算范围');
  if (input.additionalMargin < 0) throw new Error('追加保证金不能小于 0');
}

function assertCalculableMartingaleValues(condition, ...values) {
  if (!condition || values.some((value) => !Number.isFinite(value))) {
    throw new Error('马丁参数组合超出可计算范围');
  }
}

function layerTriggerPrice(input, index) {
  const step = input.triggerPercent / 100;
  if (input.side === MARTINGALE_SIDE_LONG) return input.entryPrice * Math.pow(1 - step, index);
  return input.entryPrice * Math.pow(1 + step, index);
}

function takeProfitTarget(side, averageEntryPrice, takeProfitPercent) {
  const rate = takeProfitPercent / 100;
  if (side === MARTINGALE_SIDE_LONG) return averageEntryPrice * (1 + rate);
  return averageEntryPrice * (1 - rate);
}

// 第一层代表已成交的入场单，因此执行层数始终至少为一层。
function countExecutedLayers(input, layers) {
  const subsequentLayers = layers.slice(1).filter((layer) => {
    const tolerance = Number.EPSILON * Math.max(input.currentPrice, layer.triggerPrice) * 8;
    if (input.side === MARTINGALE_SIDE_LONG) return input.currentPrice <= layer.triggerPrice + tolerance;
    return input.currentPrice + tolerance >= layer.triggerPrice;
  }).length;
  return Math.min(1 + subsequentLayers, layers.length);
}

function summarizeLayers(input, layers) {
  const summary = layers.reduce(
    (total, layer) => ({
      margin: total.margin + layer.marginAmount,
      notional: total.notional + layer.notional,
      quantity: total.quantity + layer.quantity,
      cost: total.cost + layer.quantity * layer.triggerPrice,
    }),
    { margin: 0, notional: 0, quantity: 0, cost: 0 },
  );
  const averageEntryPrice = summary.quantity > 0 ? summary.cost / summary.quantity : 0;
  const takeProfitPrice = takeProfitTarget(input.side, averageEntryPrice, input.takeProfitPercent);
  const floatingProfitLoss = calculateFloatingProfitLoss(
    input.side,
    input.currentPrice,
    averageEntryPrice,
    summary.quantity,
  );
  const takeProfitProfit = Math.abs(takeProfitPrice - averageEntryPrice) * summary.quantity;

  return {
    ...summary,
    averageEntryPrice,
    floatingProfitLoss,
    takeProfitPrice,
    takeProfitProfit,
  };
}

function calculateFloatingProfitLoss(side, currentPrice, averageEntryPrice, quantity) {
  if (quantity <= 0 || averageEntryPrice <= 0) return 0;
  if (side === MARTINGALE_SIDE_LONG) return (currentPrice - averageEntryPrice) * quantity;
  return (averageEntryPrice - currentPrice) * quantity;
}

// 简化强平模型以已执行保证金与追加保证金之和作为最大亏损预算。
function estimateLiquidationPrice(side, averageEntryPrice, notional, margin, additionalMargin) {
  if (averageEntryPrice <= 0 || notional <= 0) return 0;
  const moveRatio = (margin + additionalMargin) / notional;
  if (side === MARTINGALE_SIDE_LONG) return Math.max(averageEntryPrice * (1 - moveRatio), 0);
  return averageEntryPrice * (1 + moveRatio);
}

function distanceToLiquidation(side, currentPrice, liquidationPrice) {
  if (currentPrice <= 0 || liquidationPrice <= 0) return 0;
  if (side === MARTINGALE_SIDE_LONG) return ((currentPrice - liquidationPrice) / currentPrice) * 100;
  return ((liquidationPrice - currentPrice) / currentPrice) * 100;
}
