// 马丁策略公共计算模块：同时支持现货和合约模式的层级、止盈、资金占用和风险估算。

// 交易模式决定资金占用口径：现货使用投入金额，合约使用保证金和杠杆。
export const MARTINGALE_MODE_SPOT = 'spot';
export const MARTINGALE_MODE_FUTURES = 'futures';

// 做多/做空会影响触发价、止盈价、浮盈和强平距离的方向。
export const MARTINGALE_SIDE_LONG = 'long';
export const MARTINGALE_SIDE_SHORT = 'short';

const DEFAULT_MAINTENANCE_MARGIN_RATE = 0.005;

// 统一把表单输入转换为数值、布尔值和默认维持保证金率。
export function normalizeMartingaleInput(rawInput) {
  return {
    name: String(rawInput.name || '').trim(),
    mode: rawInput.mode,
    side: rawInput.side,
    currentPrice: Number(rawInput.currentPrice),
    firstOrderAmount: Number(rawInput.firstOrderAmount),
    multiplier: Number(rawInput.multiplier),
    maxLayers: Number(rawInput.maxLayers),
    triggerPercent: Number(rawInput.triggerPercent),
    takeProfitPercent: Number(rawInput.takeProfitPercent),
    totalCapital: Number(rawInput.totalCapital),
    leverage: Number(rawInput.leverage),
    additionalMargin: Number(rawInput.additionalMargin),
    maintenanceMarginRate: Number(rawInput.maintenanceMarginRate ?? DEFAULT_MAINTENANCE_MARGIN_RATE),
    includeInitialOrder: Boolean(rawInput.includeInitialOrder),
    restrictByCapital: Boolean(rawInput.restrictByCapital),
  };
}

// 生成马丁层级表，并汇总当前触发仓位、最大可执行仓位和资金缺口。
export function calculateMartingale(rawInput) {
  const input = normalizeMartingaleInput(rawInput);
  validateMartingaleInput(input);

  const layers = [];
  let cumulativeInvestment = 0;
  let cumulativeMargin = 0;
  let cumulativeNotional = 0;
  let cumulativeQuantity = 0;
  let cumulativeCost = 0;
  let executableLayers = 0;

  // 每一层都按倍数放大订单金额，同时累计成本、数量和资金占用。
  for (let index = 0; index < input.maxLayers; index += 1) {
    const layerNumber = index + 1;
    const triggerPrice = layerTriggerPrice(input, index);
    const orderAmount = input.firstOrderAmount * Math.pow(input.multiplier, index);
    const marginAmount = input.mode === MARTINGALE_MODE_FUTURES ? orderAmount : 0;
    const notional = input.mode === MARTINGALE_MODE_FUTURES ? orderAmount * input.leverage : orderAmount;
    const quantity = triggerPrice > 0 ? notional / triggerPrice : 0;

    cumulativeInvestment += input.mode === MARTINGALE_MODE_SPOT ? orderAmount : 0;
    cumulativeMargin += marginAmount;
    cumulativeNotional += notional;
    cumulativeQuantity += quantity;
    cumulativeCost += quantity * triggerPrice;

    const averageEntryPrice = cumulativeQuantity > 0 ? cumulativeCost / cumulativeQuantity : 0;
    const takeProfitPrice = takeProfitTarget(input.side, averageEntryPrice, input.takeProfitPercent);
    const takeProfitProfit = Math.abs(takeProfitPrice - averageEntryPrice) * cumulativeQuantity;
    const capitalUsed = input.mode === MARTINGALE_MODE_FUTURES ? cumulativeMargin : cumulativeInvestment;
    const availableCapital =
      input.mode === MARTINGALE_MODE_FUTURES ? input.totalCapital + input.additionalMargin : input.totalCapital;
    const executable = !input.restrictByCapital || capitalUsed <= availableCapital;

    // executableLayers 只统计资金约束下仍可执行的连续层数。
    if (executable) executableLayers += 1;

    layers.push({
      layer: layerNumber,
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
      executable,
      capitalUsed,
      availableCapital,
    });
  }

  // 当前仓位只统计已经触发且资金允许执行的层。
  const currentExecutedLayers = countTriggeredLayers(input, layers);
  const executedRows = layers.slice(0, currentExecutedLayers).filter((layer) => layer.executable);
  const currentPosition = summarizeLayers(input, executedRows);
  const maxExecutableRows = layers.slice(0, executableLayers);
  const maxPosition = summarizeLayers(input, maxExecutableRows);
  // 最大资金需求用于判断策略完整执行是否超过用户设定资金上限。
  const maxCapitalRequired =
    input.mode === MARTINGALE_MODE_FUTURES
      ? (layers.at(-1)?.cumulativeMargin ?? 0)
      : (layers.at(-1)?.cumulativeInvestment ?? 0);
  const availableCapital =
    input.mode === MARTINGALE_MODE_FUTURES ? input.totalCapital + input.additionalMargin : input.totalCapital;
  const liquidationPrice =
    input.mode === MARTINGALE_MODE_FUTURES
      ? estimateLiquidationPrice(
          input.side,
          currentPosition.averageEntryPrice,
          currentPosition.notional,
          currentPosition.margin,
          input,
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
    currentPrice: input.currentPrice,
    layers,
    currentTriggeredLayers: currentExecutedLayers,
    executableLayers,
    capitalShortfall: Math.max(maxCapitalRequired - availableCapital, 0),
    hasCapitalShortfall: maxCapitalRequired > availableCapital,
    maxCapitalRequired,
    availableCapital,
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

// 输入校验把不合理的价格、层数、倍数和资金参数尽早挡在计算外。
function validateMartingaleInput(input) {
  if (!input.name) throw new Error('策略名称不能为空');
  if (input.mode !== MARTINGALE_MODE_SPOT && input.mode !== MARTINGALE_MODE_FUTURES)
    throw new Error('交易模式必须是现货或合约');
  if (input.side !== MARTINGALE_SIDE_LONG && input.side !== MARTINGALE_SIDE_SHORT)
    throw new Error('方向必须是做多或做空');
  if (input.currentPrice <= 0) throw new Error('当前价必须大于 0');
  if (input.firstOrderAmount <= 0) throw new Error('首单金额必须大于 0');
  if (input.multiplier < 1) throw new Error('加仓倍数必须大于或等于 1');
  if (!Number.isInteger(input.maxLayers) || input.maxLayers <= 0) throw new Error('最大层数必须是正整数');
  if (input.maxLayers > 50) throw new Error('最大层数不能超过 50');
  if (input.triggerPercent <= 0) throw new Error('触发幅度必须大于 0');
  if (input.triggerPercent >= 100 && input.side === MARTINGALE_SIDE_LONG) throw new Error('做多触发幅度必须小于 100%');
  if (input.takeProfitPercent <= 0) throw new Error('止盈比例必须大于 0');
  if (input.totalCapital <= 0) throw new Error('总资金上限必须大于 0');
  if (input.mode === MARTINGALE_MODE_FUTURES && input.leverage <= 0) throw new Error('合约杠杆必须大于 0');
  if (input.additionalMargin < 0) throw new Error('追加保证金不能小于 0');
  if (input.maintenanceMarginRate < 0) throw new Error('维持保证金率不能小于 0');
}

// 首单是否立即成交会改变触发序号，后续层按百分比指数递进。
function layerTriggerPrice(input, index) {
  if (index === 0 && input.includeInitialOrder) return input.currentPrice;
  const triggerIndex = input.includeInitialOrder ? index : index + 1;
  const step = input.triggerPercent / 100;
  if (input.side === MARTINGALE_SIDE_LONG) return input.currentPrice * Math.pow(1 - step, triggerIndex);
  return input.currentPrice * Math.pow(1 + step, triggerIndex);
}

// 止盈目标始终相对平均持仓价计算，方向决定上移还是下移。
function takeProfitTarget(side, averageEntryPrice, takeProfitPercent) {
  const rate = takeProfitPercent / 100;
  if (side === MARTINGALE_SIDE_LONG) return averageEntryPrice * (1 + rate);
  return averageEntryPrice * (1 - rate);
}

// 当前触发层数用于模拟“已经走到哪一层”的实时仓位。
function countTriggeredLayers(input, layers) {
  if (!input.includeInitialOrder) return 0;
  return layers.filter((layer) => {
    if (input.side === MARTINGALE_SIDE_LONG) return input.currentPrice <= layer.triggerPrice;
    return input.currentPrice >= layer.triggerPrice;
  }).length;
}

// 将多层订单压缩成一个仓位摘要，供当前仓位和最大仓位复用。
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
  const takeProfitPrice =
    averageEntryPrice > 0 ? takeProfitTarget(input.side, averageEntryPrice, input.takeProfitPercent) : 0;
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

// 浮盈浮亏只和方向、现价、均价、数量有关。
function calculateFloatingProfitLoss(side, currentPrice, averageEntryPrice, quantity) {
  if (quantity <= 0 || averageEntryPrice <= 0) return 0;
  if (side === MARTINGALE_SIDE_LONG) return (currentPrice - averageEntryPrice) * quantity;
  return (averageEntryPrice - currentPrice) * quantity;
}

// 合约强平估算使用权益扣除维持保证金后的亏损预算。
function estimateLiquidationPrice(side, averageEntryPrice, notional, margin, input) {
  if (averageEntryPrice <= 0 || notional <= 0) return 0;
  const equityMargin = margin + input.additionalMargin;
  const maintenanceMargin = notional * input.maintenanceMarginRate;
  const lossBudget = Math.max(equityMargin - maintenanceMargin, 0);
  const moveRatio = lossBudget / notional;
  if (side === MARTINGALE_SIDE_LONG) return Math.max(averageEntryPrice * (1 - moveRatio), 0);
  return averageEntryPrice * (1 + moveRatio);
}

// 强平距离展示为距离当前价格的百分比，方便页面做风险分级。
function distanceToLiquidation(side, currentPrice, liquidationPrice) {
  if (currentPrice <= 0 || liquidationPrice <= 0) return 0;
  if (side === MARTINGALE_SIDE_LONG) return ((currentPrice - liquidationPrice) / currentPrice) * 100;
  return ((liquidationPrice - currentPrice) / currentPrice) * 100;
}
