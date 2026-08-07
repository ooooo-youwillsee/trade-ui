<script setup>
import { computed, ref } from 'vue';
import { BarChart3, Layers3, ShieldCheck, SlidersHorizontal, TrendingDown, TrendingUp, Wallet } from '@lucide/vue';
import { MARTINGALE_SIDE_LONG } from '../strategies/common/martingale';
import { formatNumber, formatPercent, formatPriceWithReferenceChange, formatProfitWithRate } from '../utils/formatters';

const props = defineProps({
  activeInput: { type: Object, default: null },
  result: { type: Object, default: null },
});

const activeLayerSections = ref([]);

const sideLabel = computed(() => (props.activeInput?.side === MARTINGALE_SIDE_LONG ? '做多' : '做空'));
const sideIcon = computed(() => (props.activeInput?.side === MARTINGALE_SIDE_LONG ? TrendingUp : TrendingDown));
const currentPriceWithChange = computed(() => {
  const currentPrice = props.result?.currentPrice;
  const entryPrice = props.result?.entryPrice;
  if (!Number.isFinite(currentPrice) || !Number.isFinite(entryPrice) || entryPrice <= 0) return '-';
  return formatPriceWithReferenceChange(currentPrice, entryPrice, 4, 2);
});
const currentExecutedLayer = computed(() => {
  const currentLayerIndex = (props.result?.currentExecutedLayers ?? 0) - 1;
  return currentLayerIndex >= 0 ? props.result?.layers?.[currentLayerIndex] : null;
});
const currentLayerTakeProfitMetrics = computed(() => {
  const layer = currentExecutedLayer.value;
  if (!layer) return { grossValue: '-', grossDanger: false, netValue: '-', netDanger: false };
  return {
    grossValue: formatProfitWithRate(layer.takeProfitGrossProfitAmount ?? 0, layer.takeProfitGrossProfitRate ?? 0),
    grossDanger: (layer.takeProfitGrossProfitAmount ?? 0) < 0,
    netValue: formatProfitWithRate(layer.takeProfitNetProfitAmount ?? 0, layer.takeProfitNetProfitRate ?? 0),
    netDanger: (layer.takeProfitNetProfitAmount ?? 0) < 0,
  };
});
const health = computed(() => {
  if (!props.result) return { label: '参数异常', type: 'danger' };
  if (props.result.liquidationPrice > 0 && props.result.liquidationDistance <= 0)
    return { label: '已达强平区', type: 'danger' };
  if (props.result.liquidationDistance > 0 && props.result.liquidationDistance < 10)
    return { label: '强平较近', type: 'warning' };
  return { label: '风险可控', type: 'success' };
});
const inputRows = computed(() => [
  ['策略名称', props.activeInput?.name || '-'],
  ['方向', sideLabel.value],
  ['入场价', formatNumber(props.activeInput?.entryPrice ?? 0, 4)],
  ['当前价', formatNumber(props.activeInput?.currentPrice ?? 0, 4)],
  ['首单保证金', formatNumber(props.activeInput?.firstOrderAmount ?? 0, 2)],
  ['加仓倍数', formatNumber(props.activeInput?.multiplier ?? 0, 4)],
  ['最大层数', String(props.activeInput?.maxLayers ?? '-')],
  ['触发幅度', formatPercent(props.activeInput?.triggerPercent ?? 0, 4)],
  ['止盈比例', formatPercent(props.activeInput?.takeProfitPercent ?? 0, 4)],
  ['单边手续费率', formatPercent(props.activeInput?.feeRate ?? 0, 4)],
  ['杠杆倍数', `${formatNumber(props.activeInput?.leverage ?? 0, 2)}x`],
  ['追加保证金', formatNumber(props.activeInput?.additionalMargin ?? 0, 2)],
]);
const summaryMetrics = computed(() => [
  ['入场价', formatNumber(props.result?.entryPrice ?? 0, 4), false],
  ['当前价', currentPriceWithChange.value, false],
  ['当前执行层', `${props.result?.currentExecutedLayers ?? 0}/${props.result?.layers.length ?? 0}`, false],
  [
    '浮动盈亏',
    formatNumber(props.result?.currentFloatingProfitLoss ?? 0, 4),
    (props.result?.currentFloatingProfitLoss ?? 0) < 0,
  ],
  [
    '当前层级止盈毛利润',
    currentLayerTakeProfitMetrics.value.grossValue,
    currentLayerTakeProfitMetrics.value.grossDanger,
  ],
  ['当前层级止盈净利润', currentLayerTakeProfitMetrics.value.netValue, currentLayerTakeProfitMetrics.value.netDanger],
]);
</script>

<template>
  <div class="results-panel">
    <section class="detail-hero">
      <div class="detail-hero__top">
        <div class="side-badge">
          <component :is="sideIcon" :size="18" />
          合约 · {{ sideLabel }}
        </div>
        <van-tag :type="health.type" round>{{ health.label }}</van-tag>
      </div>
      <h2>{{ result?.name || '合约马丁' }}</h2>
      <div class="health-line">
        <ShieldCheck :size="18" />
        <span>强平缓冲</span>
        <strong>{{ formatPercent(result?.liquidationDistance ?? 0, 2) }}</strong>
      </div>
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
        <article v-for="[label, value, danger] in summaryMetrics" :key="label" class="metric-card">
          <span>{{ label }}</span>
          <strong :class="{ negative: danger }">{{ value }}</strong>
        </article>
      </div>
    </section>

    <section class="detail-card">
      <div class="section-title">
        <Wallet :size="18" />
        <span>合约风险</span>
      </div>
      <div class="position-list">
        <div class="position-row">
          <span>当前名义仓位</span><strong>{{ formatNumber(result?.currentNotional ?? 0, 4) }}</strong>
        </div>
        <div class="position-row">
          <span>当前保证金</span><strong>{{ formatNumber(result?.currentMargin ?? 0, 4) }}</strong>
        </div>
        <div class="position-row">
          <span>当前权益</span>
          <strong :class="{ negative: (result?.currentEquity ?? 0) < 0 }">{{
            formatNumber(result?.currentEquity ?? 0, 4)
          }}</strong>
        </div>
      </div>
    </section>

    <section class="detail-card layer-detail-card">
      <van-collapse v-model="activeLayerSections">
        <van-collapse-item name="layers">
          <template #title>
            <div class="section-title collapse-title">
              <Layers3 :size="18" />
              <span>层级明细</span>
              <small>{{ result?.layers.length ?? 0 }} 层</small>
            </div>
          </template>
          <div class="layer-list">
            <article
              v-for="layer in result?.layers ?? []"
              :key="layer.layer"
              :class="['layer-card', { planned: layer.layer > (result?.currentExecutedLayers ?? 0) }]"
            >
              <div class="layer-card__head">
                <strong>第 {{ layer.layer }} 层</strong>
                <van-tag :type="layer.layer <= (result?.currentExecutedLayers ?? 0) ? 'primary' : 'default'" plain>
                  {{ layer.layer <= (result?.currentExecutedLayers ?? 0) ? '已执行' : '计划中' }}
                </van-tag>
              </div>
              <div class="layer-grid">
                <div class="layer-metric">
                  <span>触发价</span>
                  <b>{{ formatPriceWithReferenceChange(layer.triggerPrice, result.entryPrice, 4, 2) }}</b>
                </div>
                <div class="layer-metric">
                  <span>触发时浮动盈亏</span>
                  <b :class="{ negative: layer.triggerFloatingProfitLoss < 0 }">{{
                    formatProfitWithRate(layer.triggerFloatingProfitLoss ?? 0, layer.triggerFloatingProfitRate ?? 0)
                  }}</b>
                </div>
                <div class="layer-metric">
                  <span>本层保证金</span>
                  <b>{{ formatNumber(layer.orderAmount, 4) }}</b>
                </div>
                <div class="layer-metric">
                  <span>本层名义仓位</span>
                  <b>{{ formatNumber(layer.notional, 4) }}</b>
                </div>
                <div class="layer-metric">
                  <span>累计保证金</span>
                  <b>{{ formatNumber(layer.capitalUsed, 4) }}</b>
                </div>
                <div class="layer-metric">
                  <span>累计名义仓位</span>
                  <b>{{ formatNumber(layer.cumulativeNotional, 4) }}</b>
                </div>
                <div class="layer-metric">
                  <span>持仓均价</span>
                  <b>{{ formatNumber(layer.averageEntryPrice, 4) }}</b>
                </div>
                <div class="layer-metric">
                  <span>止盈价</span>
                  <b>{{ formatNumber(layer.takeProfitPrice, 4) }}</b>
                </div>
                <div class="layer-metric layer-metric--profit">
                  <span>止盈毛利润</span>
                  <b>{{
                    formatProfitWithRate(layer.takeProfitGrossProfitAmount ?? 0, layer.takeProfitGrossProfitRate ?? 0)
                  }}</b>
                </div>
                <div class="layer-metric layer-metric--profit">
                  <span>止盈净利润</span>
                  <b :class="{ negative: layer.takeProfitNetProfitAmount < 0 }">{{
                    formatProfitWithRate(layer.takeProfitNetProfitAmount ?? 0, layer.takeProfitNetProfitRate ?? 0)
                  }}</b>
                </div>
              </div>
            </article>
          </div>
        </van-collapse-item>
      </van-collapse>
    </section>
  </div>
</template>

<style scoped lang="scss">
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
.health-line,
.section-title,
.side-badge {
  display: flex;
  align-items: center;
}
.detail-hero__top {
  justify-content: space-between;
  gap: 12px;
}
.side-badge,
.health-line {
  color: var(--trade-up);
  font-weight: var(--trade-weight-strong);
}
.side-badge {
  gap: 6px;
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--trade-up-soft);
  font-size: var(--trade-font-sm);
}
.health-line {
  gap: 8px;
  border-top: 1px solid var(--trade-border);
  padding-top: 12px;
}
.health-line span {
  color: var(--trade-muted);
}
.health-line strong {
  margin-left: auto;
  color: var(--trade-text);
  font-family: var(--trade-number-font);
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
.input-grid,
.layer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.metric-card,
.input-item,
.layer-card {
  border: 1px solid var(--trade-border);
  border-radius: 8px;
  padding: 12px;
  background: var(--trade-surface-soft);
}
.metric-card,
.input-item {
  display: grid;
  gap: 8px;
}
.metric-card span,
.input-item span,
.layer-grid span {
  color: var(--trade-muted);
  font-size: var(--trade-font-xs);
  font-weight: var(--trade-weight-medium);
}
.metric-card strong,
.input-item strong,
.position-row strong,
.layer-grid b {
  color: var(--trade-text);
  font-family: var(--trade-number-font);
  overflow-wrap: anywhere;
}
.metric-card strong {
  font-size: var(--trade-font-lg);
}
.position-list,
.layer-list {
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
.layer-list {
  gap: 8px;
}
.layer-card.planned {
  opacity: 0.72;
}
.layer-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.layer-metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid var(--trade-border);
  border-radius: 6px;
  background: var(--trade-surface);
}
.layer-metric > span {
  flex: 0 0 auto;
  line-height: 1.2;
}
.layer-metric > b {
  display: block;
  flex: 0 1 auto;
  width: max-content;
  max-width: 100%;
  min-width: 0;
  margin-left: auto;
  overflow-x: auto;
  overflow-y: hidden;
  text-align: left;
  font-size: var(--trade-font-sm);
  line-height: 1.25;
  scrollbar-width: none;
  white-space: nowrap;
}
.layer-metric > b::-webkit-scrollbar {
  display: none;
}
.layer-metric--profit {
  background: var(--trade-up-soft);
}
.negative {
  color: var(--trade-down) !important;
}
.layer-detail-card {
  display: block;
  overflow: hidden;
  padding: 0;
}
.layer-detail-card :deep(.van-cell) {
  padding: 14px;
  background: transparent;
}
.layer-detail-card :deep(.van-collapse-item__content) {
  padding: 0 14px 14px;
  background: transparent;
}
.collapse-title {
  width: 100%;
}
@media (max-width: 560px) {
  .layer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
