// 马丁策略公共计算模块：统一现货和合约的层级、止盈、持仓与风险估算。

export const MARTINGALE_MODE_SPOT = 'spot';
export const MARTINGALE_MODE_FUTURES = 'futures';

export const MARTINGALE_SIDE_LONG = 'long';
export const MARTINGALE_SIDE_SHORT = 'short';

// 执行平台决定普通模式下“价差百分比”的价格基准：
// - Gate：每一层都以上一层触发价为基准，价格变化会逐层复利；
// - Bitget：每一层价差都以首单入场价为基准，再累加为总涨跌幅。
export const MARTINGALE_PLATFORM_GATE = 'gate';
export const MARTINGALE_PLATFORM_BITGET = 'bitget';
// 自由参数逐层渲染输入控件，限制层数可以避免异常配置造成大量 DOM 和计算对象。
export const MARTINGALE_MAX_CUSTOM_LAYERS = 99;
// 马丁行情输入与所有价格类结果统一支持最多 6 位小数。
export const MARTINGALE_PRICE_DECIMAL_PLACES = 6;

/**
 * 将表单、本地存储或外部调用传入的数据转换为统一结构。
 *
 * 这里仅负责类型归一化，不负责业务合法性判断：例如字符串 "1.5" 会转成数字 1.5，
 * 但负数、NaN、错误的平台组合会交给 validateMartingaleInput 统一报错。
 * customLayers 必须深度创建新对象，避免计算或保存过程意外共享 Vue 表单中的数组引用。
 */
export function normalizeMartingaleInput(rawInput) {
  return {
    name: String(rawInput.name || '').trim(),
    mode: rawInput.mode,
    side: rawInput.side,
    entryPrice: Number(rawInput.entryPrice),
    currentPrice: Number(rawInput.currentPrice),
    executionPlatform: rawInput.executionPlatform,
    useFreeParameters: rawInput.useFreeParameters === true,
    customLayers: Array.isArray(rawInput.customLayers)
      ? rawInput.customLayers.map((layer) => ({
          gapPercent: Number(layer?.gapPercent),
          amountShares: Number(layer?.amountShares),
        }))
      : [],
    firstOrderAmount: Number(rawInput.firstOrderAmount),
    multiplier: Number(rawInput.multiplier),
    priceGapMultiplier: Number(rawInput.priceGapMultiplier),
    maxLayers: Number(rawInput.maxLayers),
    triggerPercent: Number(rawInput.triggerPercent),
    takeProfitPercent: Number(rawInput.takeProfitPercent),
    feeRate: Number(rawInput.feeRate),
    leverage: Number(rawInput.leverage),
    additionalMargin: Number(rawInput.additionalMargin),
  };
}

/**
 * 计算完整的马丁策略结果。
 *
 * 计算分为三个阶段：
 * 1. 根据平台及参数模式生成所有计划层；
 * 2. 使用当前价判断已经执行到第几层，并汇总当前真实持仓；
 * 3. 计算当前浮盈亏、止盈指标以及合约风险数据。
 *
 * 注意：当前价不会参与计划层价格的生成，因此修改当前价只会改变执行层数和实时盈亏，
 * 不会让历史或未来的计划触发价发生漂移。
 */
export function calculateMartingale(rawInput) {
  const input = normalizeMartingaleInput(rawInput);
  validateMartingaleInput(input);

  const layers = [];
  let cumulativeInvestment = 0;
  let cumulativeMargin = 0;
  let cumulativeNotional = 0;
  let cumulativeQuantity = 0;
  let cumulativeCost = 0;

  // 自由参数只允许 Gate 使用。这里再次组合平台条件，使后续分支使用明确的最终状态。
  const useFreeParameters = input.executionPlatform === MARTINGALE_PLATFORM_GATE && input.useFreeParameters;
  const layerCount = useFreeParameters ? input.customLayers.length : input.maxLayers;
  // Bitget 需要累计“相对入场价”的总幅度；Gate 则需要记录上一层触发价。
  let cumulativeTriggerRate = 0;
  let previousTriggerPrice = input.entryPrice;
  for (let index = 0; index < layerCount; index += 1) {
    // 第 1 层就是已经成交的首单，固定使用入场价，不应用任何加仓价差。
    let triggerPrice = input.entryPrice;
    if (index > 0) {
      // 普通模式按几何级数扩大层间价差；自由模式直接读取用户为本层填写的价差。
      const triggerStep = useFreeParameters
        ? input.customLayers[index].gapPercent / 100
        : (input.triggerPercent / 100) * Math.pow(input.priceGapMultiplier, index - 1);
      assertCalculableMartingaleValues(true, triggerStep);
      if (input.executionPlatform === MARTINGALE_PLATFORM_GATE) {
        // Gate 的百分比作用于上一层价格，例如 100 -> 90 -> 81。
        triggerPrice = adjacentLayerTriggerPrice(input.side, previousTriggerPrice, triggerStep);
      } else {
        // Bitget 的每段价差作用于入场价，例如两段 10% 为 100 -> 90 -> 80。
        cumulativeTriggerRate += triggerStep;
        triggerPrice = entryBasedLayerTriggerPrice(input, cumulativeTriggerRate);
      }
    }
    // 自由模式的“份数”以首单金额/保证金为单位；普通模式按加仓金额倍数逐层放大。
    const orderAmount = useFreeParameters
      ? input.firstOrderAmount * input.customLayers[index].amountShares
      : input.firstOrderAmount * Math.pow(input.multiplier, index);
    const marginAmount = input.mode === MARTINGALE_MODE_FUTURES ? orderAmount : 0;
    const notional = input.mode === MARTINGALE_MODE_FUTURES ? orderAmount * input.leverage : orderAmount;
    const quantity = notional / triggerPrice;

    assertCalculableMartingaleValues(
      triggerPrice > 0 && quantity > 0,
      triggerPrice,
      orderAmount,
      marginAmount,
      notional,
      quantity,
    );

    // 现货记录实际投入；合约记录保证金和杠杆放大后的名义仓位。
    cumulativeInvestment += input.mode === MARTINGALE_MODE_SPOT ? orderAmount : 0;
    cumulativeMargin += marginAmount;
    cumulativeNotional += notional;
    cumulativeQuantity += quantity;
    cumulativeCost += quantity * triggerPrice;

    // 持仓均价采用成交数量加权：累计成交成本 / 累计数量。
    const averageEntryPrice = cumulativeCost / cumulativeQuantity;
    const takeProfitPrice = takeProfitTarget(input.side, averageEntryPrice, input.takeProfitPercent);
    // 层级浮盈亏是“价格刚触发该层并完成加仓”时的情景值，不使用真实当前价。
    const triggerFloatingProfitLoss = calculateFloatingProfitLoss(
      input.side,
      triggerPrice,
      averageEntryPrice,
      cumulativeQuantity,
    );
    const triggerFloatingProfitRate = (triggerFloatingProfitLoss / cumulativeNotional) * 100;
    const takeProfit = calculateTakeProfitMetrics(
      input.side,
      averageEntryPrice,
      takeProfitPrice,
      cumulativeQuantity,
      cumulativeNotional,
      input.feeRate,
    );
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
      triggerFloatingProfitLoss,
      triggerFloatingProfitRate,
      ...Object.values(takeProfit),
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
      triggerFloatingProfitLoss,
      triggerFloatingProfitRate,
      ...takeProfit,
      capitalUsed,
    });
    previousTriggerPrice = triggerPrice;
  }

  // 当前仓位仅汇总已经穿越触发价的连续层级；满层汇总用于展示完整计划结果。
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
    executionPlatform: input.executionPlatform,
    useFreeParameters,
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
    maxAverageEntryPrice: maxPosition.averageEntryPrice,
    maxTakeProfitPrice: maxPosition.takeProfitPrice,
    ...(input.mode === MARTINGALE_MODE_SPOT
      ? {
          currentTakeProfitGrossProfitAmount: currentPosition.takeProfitGrossProfitAmount,
          currentTakeProfitGrossProfitRate: currentPosition.takeProfitGrossProfitRate,
          currentTakeProfitNetProfitAmount: currentPosition.takeProfitNetProfitAmount,
          currentTakeProfitNetProfitRate: currentPosition.takeProfitNetProfitRate,
          maxTakeProfitGrossProfitAmount: maxPosition.takeProfitGrossProfitAmount,
          maxTakeProfitGrossProfitRate: maxPosition.takeProfitGrossProfitRate,
          maxTakeProfitNetProfitAmount: maxPosition.takeProfitNetProfitAmount,
          maxTakeProfitNetProfitRate: maxPosition.takeProfitNetProfitRate,
        }
      : {}),
    liquidationPrice,
    liquidationDistance,
  };
}

/**
 * 集中校验规范化后的输入，确保进入主循环的数据均可以安全计算。
 * 自由模式隐藏的四个普通生成参数不会参与计算，因此只在普通模式中校验它们。
 */
function validateMartingaleInput(input) {
  if (!input.name) throw new Error('策略名称不能为空');
  if (input.mode !== MARTINGALE_MODE_SPOT && input.mode !== MARTINGALE_MODE_FUTURES)
    throw new Error('交易模式必须是现货或合约');
  if (input.side !== MARTINGALE_SIDE_LONG && input.side !== MARTINGALE_SIDE_SHORT)
    throw new Error('方向必须是做多或做空');
  if (input.executionPlatform !== MARTINGALE_PLATFORM_GATE && input.executionPlatform !== MARTINGALE_PLATFORM_BITGET)
    throw new Error('执行平台必须是 Gate 或 Bitget');
  if (input.executionPlatform === MARTINGALE_PLATFORM_BITGET && input.useFreeParameters)
    throw new Error('Bitget 平台不支持自由参数');
  if (input.entryPrice <= 0) throw new Error('入场价必须大于 0');
  if (input.currentPrice <= 0) throw new Error('当前价必须大于 0');
  if (input.firstOrderAmount <= 0) throw new Error('首单金额必须大于 0');
  if (!input.useFreeParameters) {
    if (input.multiplier < 1) throw new Error('加仓金额倍数必须大于或等于 1');
    if (!Number.isFinite(input.priceGapMultiplier) || input.priceGapMultiplier < 1)
      throw new Error('加仓价差倍数必须是有限数字且大于或等于 1');
    if (!Number.isInteger(input.maxLayers) || input.maxLayers <= 0) throw new Error('最大层数必须是正整数');
    if (input.triggerPercent <= 0) throw new Error('触发幅度必须大于 0');
    if (input.triggerPercent >= 100 && input.side === MARTINGALE_SIDE_LONG)
      throw new Error('做多触发幅度必须小于 100%');
  }
  if (input.takeProfitPercent <= 0) throw new Error('止盈比例必须大于 0');
  if (!Number.isFinite(input.feeRate) || input.feeRate < 0 || input.feeRate >= 100)
    throw new Error('手续费率必须大于等于 0 且小于 100');
  if (input.mode === MARTINGALE_MODE_FUTURES && input.leverage <= 0) throw new Error('合约杠杆必须大于 0');
  if (!Number.isFinite(input.additionalMargin)) throw new Error('马丁参数组合超出可计算范围');
  if (input.additionalMargin < 0) throw new Error('追加保证金不能小于 0');
  validateCustomLayers(input.customLayers, input.useFreeParameters);
}

/**
 * 校验自由参数数组。
 * 首层语义是首单，必须固定为 0% 和 1 份；后续层才是用户可编辑的加仓计划。
 */
function validateCustomLayers(customLayers, required) {
  if (!Array.isArray(customLayers)) throw new Error('自由参数层级必须是数组');
  if (required && (customLayers.length < 1 || customLayers.length > MARTINGALE_MAX_CUSTOM_LAYERS))
    throw new Error(`自由参数层数必须在 1-${MARTINGALE_MAX_CUSTOM_LAYERS} 之间`);
  if (customLayers.length === 0) return;
  const firstLayer = customLayers[0];
  if (firstLayer.gapPercent !== 0 || firstLayer.amountShares !== 1)
    throw new Error('自由参数首层必须固定为 0% 和 1 份');
  customLayers.slice(1).forEach((layer) => {
    if (!Number.isFinite(layer.gapPercent) || layer.gapPercent <= 0 || layer.gapPercent >= 100)
      throw new Error('自由参数价差必须大于 0 且小于 100%');
    if (!Number.isFinite(layer.amountShares) || layer.amountShares <= 0)
      throw new Error('自由参数下单份数必须是大于 0 的有限数字');
  });
}

function assertCalculableMartingaleValues(condition, ...values) {
  if (!condition || values.some((value) => !Number.isFinite(value))) {
    throw new Error('马丁参数组合超出可计算范围');
  }
}

// 按“相对入场价的累计涨跌幅”计算 Bitget 触发价。
function entryBasedLayerTriggerPrice(input, cumulativeTriggerRate) {
  if (!Number.isFinite(cumulativeTriggerRate) || (input.side === MARTINGALE_SIDE_LONG && cumulativeTriggerRate >= 1)) {
    throw new Error('马丁参数组合超出可计算范围');
  }
  if (input.side === MARTINGALE_SIDE_LONG) return input.entryPrice * (1 - cumulativeTriggerRate);
  return input.entryPrice * (1 + cumulativeTriggerRate);
}

// 按“相对上一层价格的涨跌幅”计算 Gate 触发价。
function adjacentLayerTriggerPrice(side, previousTriggerPrice, triggerStep) {
  if (!Number.isFinite(triggerStep) || triggerStep <= 0 || (side === MARTINGALE_SIDE_LONG && triggerStep >= 1))
    throw new Error('马丁参数组合超出可计算范围');
  if (side === MARTINGALE_SIDE_LONG) return previousTriggerPrice * (1 - triggerStep);
  return previousTriggerPrice * (1 + triggerStep);
}

/**
 * 创建自由参数的初始首单层。
 *
 * 自由参数与普通比例模式相互独立，首次开启时不能读取触发幅度、金额倍数、
 * 价差倍数或最大层数。用户需要从固定首单层开始，自行添加后续加仓计划。
 */
export function createInitialCustomLayers() {
  return [{ gapPercent: 0, amountShares: 1 }];
}

// 止盈比例以累计持仓均价为基准；杠杆不直接改变止盈价格。
function takeProfitTarget(side, averageEntryPrice, takeProfitPercent) {
  const rate = takeProfitPercent / 100;
  if (side === MARTINGALE_SIDE_LONG) return averageEntryPrice * (1 + rate);
  return averageEntryPrice * (1 - rate);
}

// 第一层代表已成交的入场单，因此执行层数始终至少为一层。
// 后续层使用极小容差处理浮点边界，避免当前价恰好等于触发价时漏算一层。
function countExecutedLayers(input, layers) {
  const subsequentLayers = layers.slice(1).filter((layer) => {
    const tolerance = Number.EPSILON * Math.max(input.currentPrice, layer.triggerPrice) * 8;
    if (input.side === MARTINGALE_SIDE_LONG) return input.currentPrice <= layer.triggerPrice + tolerance;
    return input.currentPrice + tolerance >= layer.triggerPrice;
  }).length;
  return Math.min(1 + subsequentLayers, layers.length);
}

// 汇总指定层级范围，用于当前已执行仓位和计划满层仓位两种口径。
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
  const takeProfit =
    input.mode === MARTINGALE_MODE_SPOT
      ? calculateTakeProfitMetrics(
          input.side,
          averageEntryPrice,
          takeProfitPrice,
          summary.quantity,
          summary.notional,
          input.feeRate,
        )
      : {};

  return {
    ...summary,
    averageEntryPrice,
    floatingProfitLoss,
    takeProfitPrice,
    ...takeProfit,
  };
}

/**
 * 计算止盈毛利润与净利润。
 * 毛利润只考虑价格变化；净利润再扣除开仓成交额和平仓成交额两侧手续费。
 * 收益率统一以开仓名义金额为分母，避免现货和合约展示出现不同口径。
 */
function calculateTakeProfitMetrics(side, openPrice, takeProfitPrice, quantity, openNotional, feeRate) {
  if (quantity <= 0 || openPrice <= 0 || takeProfitPrice <= 0 || openNotional <= 0) {
    return {
      takeProfitGrossProfitAmount: 0,
      takeProfitGrossProfitRate: 0,
      takeProfitNetProfitAmount: 0,
      takeProfitNetProfitRate: 0,
    };
  }

  const takeProfitGrossProfitAmount = calculateFloatingProfitLoss(side, takeProfitPrice, openPrice, quantity);
  const closeNotional = quantity * takeProfitPrice;
  const totalFee = ((openNotional + closeNotional) * feeRate) / 100;
  const takeProfitNetProfitAmount = takeProfitGrossProfitAmount - totalFee;

  return {
    takeProfitGrossProfitAmount,
    takeProfitGrossProfitRate: (takeProfitGrossProfitAmount / openNotional) * 100,
    takeProfitNetProfitAmount,
    takeProfitNetProfitRate: (takeProfitNetProfitAmount / openNotional) * 100,
  };
}

// 统一多空方向的价格盈亏符号：盈利为正，亏损为负。
function calculateFloatingProfitLoss(side, currentPrice, averageEntryPrice, quantity) {
  if (quantity <= 0 || averageEntryPrice <= 0) return 0;
  if (side === MARTINGALE_SIDE_LONG) return (currentPrice - averageEntryPrice) * quantity;
  return (averageEntryPrice - currentPrice) * quantity;
}

// 简化强平模型以已执行保证金与追加保证金之和作为最大亏损预算。
// 该值是策略风险估算而非交易所正式强平价，不包含维持保证金阶梯、资金费率等交易所规则。
function estimateLiquidationPrice(side, averageEntryPrice, notional, margin, additionalMargin) {
  if (averageEntryPrice <= 0 || notional <= 0) return 0;
  const moveRatio = (margin + additionalMargin) / notional;
  if (side === MARTINGALE_SIDE_LONG) return Math.max(averageEntryPrice * (1 - moveRatio), 0);
  return averageEntryPrice * (1 + moveRatio);
}

// 强平距离统一返回百分比，正数表示当前价与估算强平价之间仍有缓冲。
function distanceToLiquidation(side, currentPrice, liquidationPrice) {
  if (currentPrice <= 0 || liquidationPrice <= 0) return 0;
  if (side === MARTINGALE_SIDE_LONG) return ((currentPrice - liquidationPrice) / currentPrice) * 100;
  return ((liquidationPrice - currentPrice) / currentPrice) * 100;
}
