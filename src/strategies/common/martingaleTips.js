// 马丁提示文案集中维护，避免合约、现货和层级明细对同一指标产生不同解释。
const amountName = (mode) => (mode === 'futures' ? '保证金' : '金额');
const positionName = (mode) => (mode === 'futures' ? '名义仓位' : '成交数量');
const directionName = (side) => (side === 'short' ? '做空' : '做多');
const platformName = (platform) => (platform === 'bitget' ? 'Bitget' : 'Gate');

const TIP_DEFINITIONS = {
  strategyName: () => '用于识别和保存这组马丁配置，不参与任何价格、仓位或盈亏计算。',
  direction: ({ side }) =>
    `当前为${directionName(side)}方向。做多在价格下跌时加仓、上涨时盈利；做空在价格上涨时加仓、下跌时盈利。`,
  entryPrice: () => '首单的计划成交价，也是第一层触发价；第一层始终按该价格视为已执行。',
  currentPrice: () => '市场当前价格，仅用于判断已执行层数、实时浮动盈亏、当前权益和风险距离，不改变计划触发价。',
  executionPlatform: ({ platform }) =>
    `当前选择 ${platformName(platform)}。Gate 普通模式按上一层触发价逐层计算价差；Bitget 按入场价计算每段价差并累计。`,
  parameterMode: () =>
    '普通参数根据触发幅度、金额倍数、价差倍数和最大层数自动生成计划；Gate 自由参数由用户逐层填写价差与份数。',
  freeParameters: () => '仅 Gate 支持。开启后使用逐层自由配置，并暂停使用普通模式的触发幅度、两个加仓倍数和最大层数。',
  freeLayerCount: () => '自由参数数组中的实际层数，包含固定的首单层，允许 1–99 层。',
  triggerPercent: () => '普通模式第一笔加仓相对价格基准的间隔，单位为 %；后续层间价差还会乘以加仓价差倍数。',
  takeProfitPercent: ({ side }) =>
    `止盈目标相对累计持仓均价的变化比例，单位为 %。${directionName(side)}止盈价按持仓均价向盈利方向移动该比例。`,
  leverage: () => '合约名义仓位 = 本层保证金 × 杠杆倍数。杠杆越高，同等保证金对应的价格风险越大。',
  firstOrderAmount: ({ mode }) =>
    `第一层投入的${amountName(mode)}。普通模式后续层以它为基数按金额倍数递增；自由模式按它乘以本层份数。`,
  amountMultiplier: () => '普通模式第 i 层金额 = 首单金额 × 加仓金额倍数^(i-1)，第一层指数为 0。',
  priceGapMultiplier: () => '普通模式第 i 笔加仓价差 = 触发幅度 × 加仓价差倍数^(i-2)，第一笔加仓指数为 0。',
  maxLayers: () => '普通模式生成的计划总层数，包含已成交的第一层首单。',
  additionalMargin: () => '额外加入当前合约仓位的风险缓冲，不增加名义仓位；仅参与当前权益和简化强平估算。',
  feeRate: () => '单边成交手续费率，单位为 %。止盈净利润会同时扣除开仓成交额和平仓成交额对应的手续费。',
  customLayerNumber: () => '自由参数的层级序号。第 1 层是固定首单，只能从末尾添加或删除后续加仓层。',
  customGapPercent: ({ side }) =>
    `${directionName(side)}方向本层相对上一层触发价的${side === 'short' ? '上涨' : '下跌'}幅度，单位为 %；首层固定为 0%。`,
  customAmountShares: ({ mode, side }) =>
    `本层${side === 'short' ? '卖出' : '买入'}份数；本层${amountName(mode)} = 首单${amountName(mode)} × 份数，首层固定为 1 份。`,
  strategyStatus: ({ mode }) =>
    mode === 'futures'
      ? '根据当前参数和简化强平距离显示风险状态，仅用于策略估算，不代表交易所实际风控结论。'
      : '存在有效计算结果时显示运行中；参数无法计算时显示参数异常。',
  liquidationBuffer: ({ side }) =>
    `${directionName(side)}当前价到估算强平价的百分比距离。该简化模型不包含交易所维持保证金阶梯、资金费率等规则。`,
  executedLayers: () => '按当前价已经穿越的连续触发层数，第一层首单始终计入，最大不超过计划总层数。',
  floatingProfitLoss: ({ side }) =>
    `${directionName(side)}当前已执行累计仓位按真实当前价计算的未实现盈亏，不包含平仓手续费。`,
  currentLayerGrossProfit: () =>
    '当前最后一层已执行后，累计仓位到达对应止盈价时的毛利润及其相对累计名义仓位的收益率，未扣手续费。',
  currentLayerNetProfit: () =>
    '当前最后一层已执行后，累计仓位到达对应止盈价时的净利润，已扣除累计开仓和平仓两侧手续费。',
  currentTakeProfitPrice: ({ side }) =>
    `当前已执行累计仓位的目标止盈价，以持仓均价为基准向${directionName(side)}盈利方向移动止盈比例。`,
  currentNotional: () => '当前所有已执行合约层的名义仓位总额，即各层保证金乘杠杆后的仓位之和。',
  currentMargin: () => '当前所有已执行合约层使用的保证金之和，不包含追加保证金。',
  currentEquity: () => '当前权益 = 已执行保证金 + 追加保证金 + 实时浮动盈亏，为简化策略估算值。',
  currentQuantity: () => '当前所有已执行层累计持有的资产数量。',
  currentAverageEntryPrice: () => '当前已执行仓位的数量加权成交均价 = 累计成交成本 ÷ 累计成交数量。',
  currentGrossProfit: () => '当前已执行累计仓位到止盈价时的毛利润及收益率，未扣除手续费。',
  currentNetProfit: () => '当前已执行累计仓位到止盈价时的净利润及收益率，已扣除开仓和平仓两侧手续费。',
  maxGrossProfit: () => '假设全部计划层均成交后，满层累计仓位到止盈价时的毛利润及收益率，未扣手续费。',
  maxNetProfit: () => '假设全部计划层均成交后，满层累计仓位到止盈价时的净利润及收益率，已扣两侧手续费。',
  layerNumber: () => '计划层级序号。第 1 层为首单，后续层按平台规则或自由参数生成。',
  layerStatus: () => '已执行表示当前价已经到达该层触发条件；计划中表示该层尚未按当前价计入真实持仓。',
  triggerPrice: ({ platform }) =>
    `${platformName(platform)} 模式下本层计划成交价；括号内涨跌幅相对首单入场价。第一层触发价等于入场价。`,
  triggerFloatingProfitLoss: ({ side }) =>
    `${directionName(side)}价格刚触发并完成本层加仓时，累计仓位按本层触发价计算的场景浮动盈亏及收益率。`,
  layerOrderAmount: ({ mode }) => `本层新增订单使用的${amountName(mode)}，不包含此前层级。`,
  layerPosition: ({ mode }) =>
    mode === 'futures'
      ? '本层新增订单的名义仓位 = 本层保证金 × 杠杆倍数。'
      : '本层金额按触发价可买入或卖出的资产数量。',
  cumulativeCapital: ({ mode }) => `从第一层到本层累计投入的${amountName(mode)}。`,
  cumulativePosition: ({ mode }) => `从第一层到本层累计形成的${positionName(mode)}。`,
  layerAverageEntryPrice: () => '从第一层到本层的数量加权持仓均价；括号内涨跌幅以本层触发价为参照。',
  layerTakeProfitPrice: ({ side }) =>
    `本层成交后累计仓位的目标止盈价；括号内涨跌幅以本层触发价为参照，方向为${directionName(side)}的盈利方向。`,
  layerGrossProfit: () => '从第一层累计到本层的总投资到达本层止盈价时的毛利润及收益率，未扣手续费。',
  layerNetProfit: () => '从第一层累计到本层的总投资到达本层止盈价时的净利润及收益率，已扣开平两侧手续费。',
};

export const MARTINGALE_TIP_KEYS = Object.freeze(Object.keys(TIP_DEFINITIONS));

export function getMartingaleTip(key, context = {}) {
  const definition = TIP_DEFINITIONS[key];
  return definition ? definition(context) : '';
}
