<script setup>
// 现货网格结果组件：展示持仓均价、浮盈浮亏、网格价格和收益率。
import { computed, ref } from 'vue';
import { BarChart3, Boxes, SlidersHorizontal, TrendingDown, TrendingUp, Wallet } from '@lucide/vue';
import { CONTRACT_SIDE_LONG, GRID_MODE_GEOMETRIC, POSITION_INCREMENT_DIFFERENCE } from '../strategies/common/grid';
import { formatNumber, formatPercent, formatPriceWithReferenceChange, formatProfitWithRate } from '../utils/formatters';

// activeInput 和 result 分离，便于结果缺失时仍可展示输入相关状态。
const props = defineProps({
  activeInput: { type: Object, default: null },
  result: { type: Object, default: null },
});

const activeGridSections = ref([]);
const sideLabel = computed(() => (props.activeInput?.side === CONTRACT_SIDE_LONG ? '做多' : '做空'));
const sideIcon = computed(() => (props.activeInput?.side === CONTRACT_SIDE_LONG ? TrendingUp : TrendingDown));
const incrementLabel = computed(() => {
  if (props.activeInput?.positionIncrementMode === POSITION_INCREMENT_DIFFERENCE) {
    return `差额递增 ${formatNumber(props.activeInput?.positionIncrementValue ?? 0, 2)}`;
  }
  return `比例递增 ${formatPercent(props.activeInput?.positionIncrementValue ?? 0, 2)}`;
});
const inputRows = computed(() => [
  ['策略名称', props.activeInput?.name || '-'],
  ['方向', sideLabel.value],
  ['网格模式', props.activeInput?.gridMode === GRID_MODE_GEOMETRIC ? '等比' : '等差'],
  ['创建时建仓', props.activeInput?.openOnCreate ? '是' : '否'],
  [
    '下限价格',
    formatPriceWithReferenceChange(props.activeInput?.lowerPrice ?? 0, props.activeInput?.entryPrice ?? 0, 4, 2),
  ],
  [
    '上限价格',
    formatPriceWithReferenceChange(props.activeInput?.upperPrice ?? 0, props.activeInput?.entryPrice ?? 0, 4, 2),
  ],
  ['入场价格', formatNumber(props.activeInput?.entryPrice ?? 0, 4)],
  [
    '当前价格',
    formatPriceWithReferenceChange(props.activeInput?.currentPrice ?? 0, props.activeInput?.entryPrice ?? 0, 4, 2),
  ],
  ['网格数量', String(props.activeInput?.gridCount ?? '-')],
  ['投入金额', formatNumber(props.activeInput?.investment ?? 0, 2)],
  ['单边手续费率', formatPercent(props.activeInput?.feeRate ?? 0, 4)],
  ['仓位递增', incrementLabel.value],
]);
const summaryMetrics = computed(() => [
  ['持仓均价', formatNumber(props.result?.averageEntryPrice ?? 0, 4)],
  ['当前权益', formatNumber(props.result?.currentEquity ?? 0, 4)],
  ['浮动盈亏', formatNumber(props.result?.floatingProfitLoss ?? 0, 4)],
  ['持仓数量', formatNumber(props.result?.positionQuantity ?? 0, 8)],
  ['单格收益率', formatPercent(props.result?.gridProfitRate ?? 0, 4)],
  ['区间振幅', formatPercent(props.result?.totalYieldRate ?? 0, 4)],
]);
</script>

<template>
  <!-- 现货网格结果：没有强平风险，重点展示持仓价值和网格收益。 -->
  <div class="results-panel">
    <section class="detail-hero">
      <div class="detail-hero__top">
        <div class="side-badge">
          <component :is="sideIcon" :size="18" />
          {{ sideLabel }}
        </div>
        <van-tag round type="primary">现货网格</van-tag>
      </div>
      <h2>{{ result?.name || '现货网格' }}</h2>
    </section>

    <section class="detail-card">
      <div class="section-title">
        <SlidersHorizontal :size="18" />
        <span>参数信息</span>
      </div>
      <div class="input-grid">
        <div v-for="[label, value] in inputRows" :key="label" class="input-item">
          <span>{{ label }}</span>
          <strong>{{ value }}</strong>
        </div>
      </div>
    </section>

    <section class="metric-section">
      <div class="section-title">
        <BarChart3 :size="18" />
        <span>核心指标</span>
      </div>
      <div class="metric-grid">
        <article v-for="[label, value] in summaryMetrics" :key="label" class="metric-card">
          <span>{{ label }}</span>
          <strong :class="{ negative: label === '浮动盈亏' && (result?.floatingProfitLoss ?? 0) < 0 }">{{
            value
          }}</strong>
        </article>
      </div>
    </section>

    <section class="detail-card">
      <div class="section-title">
        <Wallet :size="18" />
        <span>当前持仓</span>
      </div>
      <div class="position-list">
        <div class="position-row">
          <span>已成交网格数</span><strong>{{ result?.filledGridCount ?? 0 }}</strong>
        </div>
        <div class="position-row">
          <span>已投入金额</span><strong>{{ formatNumber(result?.filledInvestment ?? 0, 4) }}</strong>
        </div>
      </div>
    </section>

    <section class="detail-card grid-orders-card">
      <van-collapse v-model="activeGridSections">
        <van-collapse-item name="grid-orders">
          <template #title>
            <div class="section-title collapse-title">
              <Boxes :size="18" />
              <span>网格价格</span>
              <small>{{ result?.gridOrders?.length ?? 0 }} 个挂单</small>
            </div>
          </template>
          <!-- 单格利润合并展示金额和比率，状态标签固定在右上角避免挤压四列数据。 -->
          <div class="grid-order-list">
            <div v-for="order in result?.gridOrders ?? []" :key="order.price" class="grid-order-row">
              <div>
                <span>挂单价格</span>
                <strong>{{ formatNumber(order.price, 4) }}</strong>
              </div>
              <div>
                <span>投入金额</span>
                <strong>{{ formatNumber(order.investment, 4) }}</strong>
              </div>
              <div class="profit-cell">
                <span>毛利润</span>
                <strong>{{ formatProfitWithRate(order.grossProfitAmount ?? 0, order.grossProfitRate ?? 0) }}</strong>
              </div>
              <div class="profit-cell">
                <span>净利润</span>
                <strong>{{ formatProfitWithRate(order.netProfitAmount ?? 0, order.netProfitRate ?? 0) }}</strong>
              </div>
              <div class="grid-order-tags">
                <van-tag :type="order.filled ? 'warning' : 'primary'" round>
                  {{ order.filled ? '已成交' : '未成交' }}
                </van-tag>
              </div>
            </div>
          </div>
        </van-collapse-item>
      </van-collapse>
    </section>
  </div>
</template>

<style scoped lang="scss">
/* 现货结果布局：复用指标卡片和网格明细样式。 */
.results-panel {
  display: grid;
  gap: 12px;
  padding-top: 12px;
  padding-bottom: 88px;
}
.detail-hero,
.detail-card,
.metric-section {
  border: 1px solid var(--trade-border);
  border-radius: 8px;
  background: var(--trade-surface);
  box-shadow: var(--trade-card-shadow);
}
.detail-hero {
  display: grid;
  gap: 14px;
  padding: 18px;
  background: linear-gradient(135deg, rgba(22, 199, 132, 0.14), rgba(255, 255, 255, 0.92)), var(--trade-surface);
}
.detail-hero h2 {
  margin: 0;
  color: var(--trade-text);
  font-size: var(--trade-font-display);
  font-weight: var(--trade-weight-title);
  line-height: 1.2;
  overflow-wrap: anywhere;
}
.detail-hero__top,
.section-title,
.side-badge {
  display: flex;
  align-items: center;
}
.detail-hero__top {
  justify-content: space-between;
  gap: 12px;
}
.side-badge {
  gap: 6px;
  border-radius: 999px;
  padding: 6px 10px;
  color: var(--trade-up);
  background: var(--trade-up-soft);
  font-size: var(--trade-font-sm);
  font-weight: var(--trade-weight-strong);
}
.metric-section,
.detail-card {
  display: grid;
  gap: 12px;
  padding: 14px;
}
.section-title {
  gap: 8px;
  color: var(--trade-text);
  font-size: var(--trade-font-md);
  font-weight: var(--trade-weight-title);
}
.section-title svg {
  color: var(--trade-up);
}
.section-title small {
  margin-left: auto;
  color: var(--trade-muted);
  font-size: var(--trade-font-xs);
}
.metric-grid,
.input-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.metric-card,
.input-item {
  display: grid;
  gap: 8px;
  border: 1px solid var(--trade-border);
  border-radius: 8px;
  padding: 12px;
  background: var(--trade-surface-soft);
}
.metric-card span,
.input-item span {
  color: var(--trade-muted);
  font-size: var(--trade-font-xs);
  font-weight: var(--trade-weight-medium);
}
.metric-card strong,
.input-item strong,
.position-row strong {
  color: var(--trade-text);
  font-family: var(--trade-number-font);
  overflow-wrap: anywhere;
}
.metric-card strong {
  font-size: var(--trade-font-lg);
}
.position-list {
  display: grid;
}
.position-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  border-top: 1px solid var(--trade-border);
}
.position-row:first-child {
  border-top: 0;
}
.position-row span {
  color: var(--trade-muted);
  font-weight: var(--trade-weight-medium);
}
.grid-orders-card {
  padding: 0;
  overflow: hidden;
}
.grid-orders-card :deep(.van-cell) {
  padding: 14px;
  background: transparent;
}
.grid-orders-card :deep(.van-collapse-item__content) {
  padding: 0 14px 14px;
  background: transparent;
}
.collapse-title {
  width: 100%;
}
.grid-order-list {
  display: grid;
  border-top: 1px solid var(--trade-border);
}
.grid-order-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 0.7fr) minmax(0, 1.35fr) minmax(0, 1.35fr);
  align-items: center;
  gap: 8px;
  min-height: 56px;
  border-bottom: 1px solid var(--trade-border);
  padding: 36px 0 10px;
}
.grid-order-row:last-child {
  border-bottom: 0;
}
.grid-order-row div {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.grid-order-row span {
  color: var(--trade-muted);
  font-size: var(--trade-font-xs);
  font-weight: var(--trade-weight-medium);
}
.grid-order-row strong {
  color: var(--trade-text);
  font-family: var(--trade-number-font);
  font-weight: var(--trade-weight-strong);
  overflow-wrap: anywhere;
}
.grid-order-row > div:not(.grid-order-tags) strong {
  // 四列数值在移动端保持单行，避免金额和括号内收益率被拆开。
  font-size: var(--trade-font-xs);
  white-space: nowrap;
}
.grid-order-row .grid-order-tags {
  // 成交状态脱离网格列布局，固定在挂单行右上角。
  position: absolute;
  top: 8px;
  right: 0;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 100%;
}
.negative {
  color: var(--trade-down) !important;
}
</style>
