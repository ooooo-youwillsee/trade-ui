<script setup>
import { computed } from 'vue';
import { AlertTriangle, BarChart3, Layers3, SlidersHorizontal, TrendingDown, TrendingUp, Wallet } from '@lucide/vue';
import { MARTINGALE_SIDE_LONG } from '../strategies/common/martingale';
import { formatNumber, formatPercent } from '../utils/formatters';

const props = defineProps({
  activeInput: { type: Object, default: null },
  result: { type: Object, default: null },
});

const sideLabel = computed(() => (props.activeInput?.side === MARTINGALE_SIDE_LONG ? '做多' : '做空'));
const sideIcon = computed(() => (props.activeInput?.side === MARTINGALE_SIDE_LONG ? TrendingUp : TrendingDown));
const health = computed(() => {
  if (!props.result) return { label: '参数异常', type: 'danger' };
  if (props.result.hasCapitalShortfall) return { label: '资金不足', type: 'danger' };
  return { label: '资金可覆盖', type: 'success' };
});
const inputRows = computed(() => [
  ['策略名称', props.activeInput?.name || '-'],
  ['方向', sideLabel.value],
  ['当前价', formatNumber(props.activeInput?.currentPrice ?? 0, 4)],
  ['首单金额', formatNumber(props.activeInput?.firstOrderAmount ?? 0, 2)],
  ['加仓倍数', formatNumber(props.activeInput?.multiplier ?? 0, 4)],
  ['最大层数', String(props.activeInput?.maxLayers ?? '-')],
  ['触发幅度', formatPercent(props.activeInput?.triggerPercent ?? 0, 4)],
  ['止盈比例', formatPercent(props.activeInput?.takeProfitPercent ?? 0, 4)],
  ['总资金上限', formatNumber(props.activeInput?.totalCapital ?? 0, 2)],
]);
const summaryMetrics = computed(() => [
  ['最大资金需求', formatNumber(props.result?.maxCapitalRequired ?? 0, 2), props.result?.hasCapitalShortfall],
  ['可执行层数', `${props.result?.executableLayers ?? 0}/${props.result?.layers.length ?? 0}`, props.result?.hasCapitalShortfall],
  ['当前触发层数', String(props.result?.currentTriggeredLayers ?? 0), false],
  ['当前浮盈亏', formatNumber(props.result?.currentFloatingProfitLoss ?? 0, 4), (props.result?.currentFloatingProfitLoss ?? 0) < 0],
  ['当前止盈价', formatNumber(props.result?.currentTakeProfitPrice ?? 0, 4), false],
  ['满层止盈收益', formatNumber(props.result?.maxTakeProfitProfit ?? 0, 4), false],
]);
</script>

<template>
  <div class="results-panel">
    <section class="detail-hero">
      <div class="detail-hero__top">
        <div class="side-badge">
          <component :is="sideIcon" :size="18" />
          现货 · {{ sideLabel }}
        </div>
        <van-tag :type="health.type" round>{{ health.label }}</van-tag>
      </div>
      <h2>{{ result?.name || '现货马丁' }}</h2>
    </section>

    <section v-if="result?.hasCapitalShortfall" class="risk-note">
      <AlertTriangle :size="18" />
      <span>资金缺口 {{ formatNumber(result.capitalShortfall, 2) }}，后续层级会标记为不可执行。</span>
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
        <span>当前持仓</span>
      </div>
      <div class="position-list">
        <div class="position-row"><span>当前持仓数量</span><strong>{{ formatNumber(result?.currentQuantity ?? 0, 8) }}</strong></div>
        <div class="position-row"><span>当前持仓均价</span><strong>{{ formatNumber(result?.currentAverageEntryPrice ?? 0, 4) }}</strong></div>
        <div class="position-row"><span>当前止盈收益</span><strong>{{ formatNumber(result?.currentTakeProfitProfit ?? 0, 4) }}</strong></div>
      </div>
    </section>

    <section class="detail-card">
      <div class="section-title">
        <Layers3 :size="18" />
        <span>层级明细</span>
        <small>{{ result?.layers.length ?? 0 }} 层</small>
      </div>
      <div class="layer-list">
        <article v-for="layer in result?.layers ?? []" :key="layer.layer" :class="['layer-card', { disabled: !layer.executable }]">
          <div class="layer-card__head">
            <strong>第 {{ layer.layer }} 层</strong>
            <van-tag :type="layer.executable ? 'primary' : 'danger'" plain>{{ layer.executable ? '可执行' : '资金不足' }}</van-tag>
          </div>
          <div class="layer-grid">
            <span>触发价 <b>{{ formatNumber(layer.triggerPrice, 4) }}</b></span>
            <span>本层金额 <b>{{ formatNumber(layer.orderAmount, 2) }}</b></span>
            <span>累计资金 <b>{{ formatNumber(layer.capitalUsed, 2) }}</b></span>
            <span>成交数量 <b>{{ formatNumber(layer.quantity, 8) }}</b></span>
            <span>持仓均价 <b>{{ formatNumber(layer.averageEntryPrice, 4) }}</b></span>
            <span>止盈价 <b>{{ formatNumber(layer.takeProfitPrice, 4) }}</b></span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.results-panel { display: grid; gap: 12px; padding-top: 12px; padding-bottom: 88px; }
.detail-hero, .detail-card, .metric-section, .risk-note { border: 1px solid var(--trade-border); border-radius: 8px; background: var(--trade-surface); box-shadow: var(--trade-card-shadow); }
.detail-hero { display: grid; gap: 14px; padding: 18px; background: linear-gradient(135deg, rgba(22, 199, 132, 0.14), rgba(255,255,255,0.92)), var(--trade-surface); }
.detail-hero h2 { margin: 0; color: var(--trade-text); font-size: var(--trade-font-display); font-weight: var(--trade-weight-title); line-height: 1.2; overflow-wrap: anywhere; }
.detail-hero__top, .section-title, .side-badge, .risk-note { display: flex; align-items: center; }
.detail-hero__top { justify-content: space-between; gap: 12px; }
.side-badge { gap: 6px; border-radius: 999px; padding: 6px 10px; color: var(--trade-up); background: var(--trade-up-soft); font-size: var(--trade-font-sm); font-weight: var(--trade-weight-strong); }
.metric-section, .detail-card { display: grid; gap: 12px; padding: 14px; }
.section-title { gap: 8px; color: var(--trade-text); font-size: var(--trade-font-md); font-weight: var(--trade-weight-title); }
.section-title svg { color: var(--trade-up); }
.section-title small { margin-left: auto; color: var(--trade-muted); font-size: var(--trade-font-xs); }
.metric-grid, .input-grid, .layer-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.metric-card, .input-item, .layer-card { border: 1px solid var(--trade-border); border-radius: 8px; padding: 12px; background: var(--trade-surface-soft); }
.metric-card, .input-item { display: grid; gap: 8px; }
.metric-card span, .input-item span, .layer-grid span { color: var(--trade-muted); font-size: var(--trade-font-xs); font-weight: var(--trade-weight-medium); }
.metric-card strong, .input-item strong, .position-row strong, .layer-grid b { color: var(--trade-text); font-family: var(--trade-number-font); overflow-wrap: anywhere; }
.metric-card strong { font-size: var(--trade-font-lg); }
.position-list, .layer-list { display: grid; }
.position-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 42px; border-top: 1px solid var(--trade-border); }
.position-row:first-child { border-top: 0; }
.position-row span { color: var(--trade-muted); font-weight: var(--trade-weight-medium); }
.layer-list { gap: 8px; }
.layer-card.disabled { opacity: 0.68; }
.layer-card__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.risk-note { gap: 8px; padding: 12px; color: var(--trade-warn); background: var(--trade-warn-soft); font-size: var(--trade-font-sm); font-weight: var(--trade-weight-medium); }
.negative { color: var(--trade-down) !important; }
</style>
