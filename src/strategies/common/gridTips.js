// 网格提示文案与计算模块使用相同业务口径，供现货、合约和双腿对冲页面共享。
const modeName = (mode) => (mode === 'spot' ? '现货' : '合约');
const capitalName = (mode) => (mode === 'spot' ? '投入金额' : '保证金');
const sideName = (side) => {
  if (side === 'short') return '做空';
  if (side === 'neutral') return '中性';
  return '做多';
};
const gridModeName = (gridMode) => (gridMode === 'geometric' ? '等比' : '等差');

const TIP_DEFINITIONS = {
  strategyName: () => '用于识别和保存这组网格配置，不参与价格、仓位或收益计算。',
  contractName: () => '该对冲腿使用的合约或交易标的名称，也用于缺失时推导最小成交数量默认值。',
  direction: ({ side }) => `${sideName(side)}方向决定网格的开仓和止盈方向；中性模式会同时计算一条做多腿和一条做空腿。`,
  gridMode: ({ gridMode }) =>
    `${gridModeName(gridMode)}网格：等差模式相邻价格保持固定价差；等比模式相邻价格保持固定比例。`,
  openOnCreate: ({ side }) =>
    `开启后会在创建策略时按入场价建立${sideName(side)}初始仓位，并把盈利方向的对应网格价作为止盈目标。`,
  lowerPrice: () => '网格运行区间的最低价格，必须小于上限价格；括号涨跌幅以入场价为参照。',
  upperPrice: () => '网格运行区间的最高价格，必须大于下限价格；括号涨跌幅以入场价为参照。',
  entryPrice: () => '策略开始运行时的参考成交价，用于创建初始仓位、判断已穿越网格及展示价格涨跌幅。',
  currentPrice: () => '市场当前价格，用于判断已成交/未平仓网格、浮动盈亏、当前权益和强平风险。',
  gridCount: () => '上下限价格之间划分的网格段数；生成的价格边界通常为网格数量加 1。',
  leverage: () => '合约名义仓位 = 保证金 × 杠杆倍数。杠杆越高，同等保证金对应的价格风险越大。',
  investment: ({ mode }) => `${modeName(mode)}策略分配给网格的初始${capitalName(mode)}。`,
  additionalInvestment: () => '额外加入当前合约仓位的保证金缓冲，不增加计划网格数量。',
  feeRate: () => '单边成交手续费率，单位为 %；净利润会扣除开仓和平仓两侧成交手续费。',
  minTradeQuantity: () => '交易所允许的最小成交数量。程序按最高网格价计算每格可成交量并向下取整到该单位。',
  longScenarioChange: () => '多头腿场景价相对当前价的预设涨跌幅，单位为 %；正数上涨，负数下跌。',
  shortScenarioChange: () => '空头腿场景价相对当前价的预设涨跌幅，单位为 %；正数上涨，负数下跌。',
  strategyStatus: ({ mode }) =>
    mode === 'hedge'
      ? '比较两条腿场景所需补充保证金与可转出盈利，显示是否存在外部资金缺口。'
      : mode === 'spot'
        ? '存在有效网格计算结果时显示现货网格状态；参数无效时结果不可用。'
        : '根据简化强平距离显示风险状态，仅供策略估算，不代表交易所实际风控结论。',
  liquidationBuffer: ({ side }) =>
    `${sideName(side)}当前价到简化强平价的百分比距离；不包含维持保证金阶梯、资金费率等交易所规则。`,
  estimatedGridLiquidationPrice: () => '假设计划网格仓位按策略口径形成后的估算强平价格，用于评估完整计划风险。',
  currentLiquidationPrice: () => '仅按当前未平仓仓位和已投入保证金估算的强平价格。',
  plannedNotional: () => '计划分配保证金经杠杆放大后的名义仓位总额。',
  tradablePerGridQuantity: () => '每个网格实际采用的统一成交数量，已按最小成交数量向下取整。',
  unallocatedCapital: ({ mode }) => `因最小成交数量取整后无法分配到网格的剩余${capitalName(mode)}，不会参与当前挂单。`,
  totalCapital: ({ mode }) => `${modeName(mode)}网格当前计入计算的总${capitalName(mode)}。`,
  gridProfitRate: ({ side, gridMode }) =>
    `${sideName(side)}${gridModeName(gridMode)}网格完成一格开平仓的毛收益率估算，未扣手续费。`,
  totalYieldRate: () => '网格上下限的总价格振幅 =（上限价格－下限价格）÷ 下限价格。',
  filledGridCount: () => '当前价已经到达并触发开仓条件的网格数量。',
  filledInvestment: () => '当前已成交网格实际投入的金额合计，不包含尚未成交和未分配金额。',
  openGridCount: () => '已经开仓但尚未到达相邻止盈目标价的网格数量。',
  closedGridCount: () => '已经完成开仓并到达目标价平仓止盈的网格数量。',
  currentNotional: () => '当前全部未平仓网格的名义仓位总额。',
  positionQuantity: ({ mode }) => `当前${modeName(mode)}全部未平仓网格累计持有的成交数量。`,
  averageEntryPrice: () => '当前未平仓网格按成交数量加权后的平均入场价格。',
  realizedProfitLoss: () => '已经到达止盈目标并完成平仓的累计收益。',
  unrealizedProfitLoss: () => '当前未平仓网格按真实当前价计算的浮动收益，单格盈利不会超过其目标价利润。',
  totalProfitLoss: () => '总收益 = 已实现收益 + 未实现收益。',
  currentEquity: ({ mode }) =>
    mode === 'spot' ? '现货当前权益为剩余资金与当前持仓价值的合计。' : '合约当前权益为已投入保证金加总收益。',
  longLegLiquidationPrice: () => '中性策略做多腿当前未平仓仓位的简化强平价格。',
  shortLegLiquidationPrice: () => '中性策略做空腿当前未平仓仓位的简化强平价格。',
  longLegNotional: () => '中性策略做多腿当前未平仓名义仓位。',
  shortLegNotional: () => '中性策略做空腿当前未平仓名义仓位。',
  longLegProfit: () => '中性策略做多腿的已实现与未实现收益合计。',
  shortLegProfit: () => '中性策略做空腿的已实现与未实现收益合计。',
  gridOrderPrice: () => '本条网格挂单的计划成交价格。',
  gridOrderCapital: ({ mode }) => `本条挂单占用的${capitalName(mode)}。`,
  gridOrderGrossProfit: () => '本格从开仓价到相邻目标价的毛利润和收益率，未扣手续费。',
  gridOrderNetProfit: () => '本格毛利润扣除开仓和平仓两侧手续费后的净利润和收益率。',
  gridOrderSide: ({ side }) => `本条挂单对应的${sideName(side)}方向。`,
  gridOrderStatus: () => '已成交表示当前价已经触发该挂单；未成交表示仍处于计划状态。',
  hedgeRequiredMargin: () => '两条腿在各自场景价下，为覆盖简化强平风险需要额外补充的保证金总和。',
  hedgeMarginShortfall: () => '资金缺口 = max（需补保证金－可转出盈利，0）。',
  hedgeTransferableProfit: () => '两条腿场景总收益中的正收益之和，可用于覆盖另一腿的保证金需求。',
  hedgeScenarioTotalProfit: () => '多头腿与空头腿在各自场景价下的总收益之和。',
  longScenarioPrice: () => '多头场景价 = 多头当前价 ×（1 + 多头涨跌幅），括号涨跌幅以当前价为参照。',
  shortScenarioPrice: () => '空头场景价 = 空头当前价 ×（1 + 空头涨跌幅），括号涨跌幅以当前价为参照。',
  legCurrentNotional: ({ side }) => `${sideName(side)}腿按真实当前价形成的未平仓名义仓位。`,
  legScenarioNotional: ({ side }) => `${sideName(side)}腿推演到场景价后的未平仓名义仓位。`,
  legCurrentAveragePrice: ({ side }) => `${sideName(side)}腿当前未平仓网格的数量加权入场均价。`,
  legScenarioAveragePrice: ({ side }) => `${sideName(side)}腿推演到场景价后的数量加权入场均价。`,
  legCurrentLiquidationPrice: ({ side }) => `${sideName(side)}腿当前仓位的简化强平价格。`,
  legScenarioLiquidationPrice: ({ side }) => `${sideName(side)}腿推演到场景价后的简化强平价格。`,
  legScenarioProfit: ({ side }) => `${sideName(side)}腿场景总收益 = 场景下已实现止盈收益 + 剩余未平仓浮动收益。`,
  legRequiredMargin: ({ side }) => `${sideName(side)}腿在场景价下覆盖简化强平风险所需补充的保证金。`,
};

export const GRID_TIP_KEYS = Object.freeze(Object.keys(TIP_DEFINITIONS));

export function getGridTip(key, context = {}) {
  const definition = TIP_DEFINITIONS[key];
  return definition ? definition(context) : '';
}
