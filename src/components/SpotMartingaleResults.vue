<script setup>
import { computed, ref } from 'vue';
import { BarChart3, Layers3, SlidersHorizontal, TrendingDown, TrendingUp, Wallet } from '@lucide/vue';
import { MARTINGALE_PRICE_DECIMAL_PLACES, MARTINGALE_SIDE_LONG } from '../strategies/common/martingale';
import { formatNumber, formatPercent, formatPriceWithReferenceChange, formatProfitWithRate } from '../utils/formatters';
import MartingaleTipLabel from './MartingaleTipLabel.vue';

const props = defineProps({
  activeInput: { type: Object, default: null },
  result: { type: Object, default: null },
});

const activeLayerSections = ref([]);

// 方向相关文案与图标由输入决定，计算结果仍完全来自公共马丁计算器。
const sideLabel = computed(() => (props.activeInput?.side === MARTINGALE_SIDE_LONG ? '做多' : '做空'));
const sideIcon = computed(() => (props.activeInput?.side === MARTINGALE_SIDE_LONG ? TrendingUp : TrendingDown));
const currentExecutedLayer = computed(() => {
  // 将从 1 开始的当前执行层号映射为数组下标，取最后一层实际执行数据。
  const currentLayerIndex = (props.result?.currentExecutedLayers ?? 0) - 1;
  return currentLayerIndex >= 0 ? props.result?.layers?.[currentLayerIndex] : null;
});
const currentLayerTakeProfitMetrics = computed(() => {
  // 没有有效层时显示“-”，避免把缺失结果伪装成真实的 0 利润。
  const layer = currentExecutedLayer.value;
  if (!layer) return { grossValue: '-', grossDanger: false, netValue: '-', netDanger: false };
  return {
    grossValue: formatProfitWithRate(layer.takeProfitGrossProfitAmount ?? 0, layer.takeProfitGrossProfitRate ?? 0),
    grossDanger: (layer.takeProfitGrossProfitAmount ?? 0) < 0,
    netValue: formatProfitWithRate(layer.takeProfitNetProfitAmount ?? 0, layer.takeProfitNetProfitRate ?? 0),
    netDanger: (layer.takeProfitNetProfitAmount ?? 0) < 0,
  };
});
const health = computed(() =>
  props.result ? { label: '运行中', type: 'success' } : { label: '参数异常', type: 'danger' },
);
const inputRows = computed(() => {
  // 参数信息根据普通/自由模式动态组织；自由模式只展示真实生效的层数。
  const freeParameters = props.activeInput?.executionPlatform === 'gate' && props.activeInput?.useFreeParameters;
  const rows = [
    { key: 'strategyName', label: '策略名称', value: props.activeInput?.name || '-' },
    { key: 'direction', label: '方向', value: sideLabel.value },
    {
      key: 'executionPlatform',
      label: '执行平台',
      value: props.activeInput?.executionPlatform === 'bitget' ? 'Bitget' : 'Gate',
    },
    { key: 'parameterMode', label: '参数模式', value: freeParameters ? '自由参数' : '普通参数' },
    {
      key: 'entryPrice',
      label: '入场价',
      value: formatNumber(props.activeInput?.entryPrice ?? 0, MARTINGALE_PRICE_DECIMAL_PLACES),
    },
    {
      key: 'currentPrice',
      label: '当前价',
      value: formatNumber(props.activeInput?.currentPrice ?? 0, MARTINGALE_PRICE_DECIMAL_PLACES),
    },
    {
      key: 'firstOrderAmount',
      label: '首单金额',
      value: formatNumber(props.activeInput?.firstOrderAmount ?? 0, 4),
    },
  ];
  if (freeParameters)
    rows.push({
      key: 'freeLayerCount',
      label: '自由参数层数',
      value: String(props.activeInput?.customLayers?.length ?? 0),
    });
  else
    rows.push(
      {
        key: 'amountMultiplier',
        label: '加仓金额倍数',
        value: formatNumber(props.activeInput?.multiplier ?? 0, 4),
      },
      {
        key: 'priceGapMultiplier',
        label: '加仓价差倍数',
        value: formatNumber(props.activeInput?.priceGapMultiplier ?? 0, 4),
      },
      { key: 'maxLayers', label: '最大层数', value: String(props.activeInput?.maxLayers ?? '-') },
      {
        key: 'triggerPercent',
        label: '触发幅度',
        value: formatPercent(props.activeInput?.triggerPercent ?? 0, 4),
      },
    );
  rows.push(
    {
      key: 'takeProfitPercent',
      label: '止盈比例',
      value: formatPercent(props.activeInput?.takeProfitPercent ?? 0, 4),
    },
    { key: 'feeRate', label: '单边手续费率', value: formatPercent(props.activeInput?.feeRate ?? 0, 4) },
  );
  return rows;
});
const summaryMetrics = computed(() => [
  {
    key: 'entryPrice',
    label: '入场价',
    value: formatNumber(props.result?.entryPrice ?? 0, MARTINGALE_PRICE_DECIMAL_PLACES),
    danger: false,
  },
  {
    key: 'currentPrice',
    label: '当前价',
    value: formatNumber(props.result?.currentPrice ?? 0, MARTINGALE_PRICE_DECIMAL_PLACES),
    danger: false,
  },
  {
    key: 'executedLayers',
    label: '当前执行层',
    value: `${props.result?.currentExecutedLayers ?? 0}/${props.result?.layers.length ?? 0}`,
    danger: false,
  },
  {
    key: 'floatingProfitLoss',
    label: '浮动盈亏',
    value: formatNumber(props.result?.currentFloatingProfitLoss ?? 0, 4),
    danger: (props.result?.currentFloatingProfitLoss ?? 0) < 0,
  },
  {
    key: 'currentLayerGrossProfit',
    label: '当前层级止盈毛利润',
    value: currentLayerTakeProfitMetrics.value.grossValue,
    danger: currentLayerTakeProfitMetrics.value.grossDanger,
  },
  {
    key: 'currentLayerNetProfit',
    label: '当前层级止盈净利润',
    value: currentLayerTakeProfitMetrics.value.netValue,
    danger: currentLayerTakeProfitMetrics.value.netDanger,
  },
  {
    key: 'currentTakeProfitPrice',
    label: '当前止盈价',
    value: formatNumber(props.result?.currentTakeProfitPrice ?? 0, MARTINGALE_PRICE_DECIMAL_PLACES),
    danger: false,
  },
]);
</script>

<template>
  <div class="results-panel">
    <section class="detail-hero">
      <div class="detail-hero__top">
        <div class="side-badge">
          <component :is="sideIcon" :size="18" />
          <MartingaleTipLabel :label="`现货 · ${sideLabel}`" tip-key="direction" :side="activeInput?.side" />
        </div>
        <van-tag :type="health.type" round>
          <MartingaleTipLabel :label="health.label" tip-key="strategyStatus" mode="spot" />
        </van-tag>
      </div>
      <h2>{{ result?.name || '现货马丁' }}</h2>
    </section>

    <section class="detail-card">
      <div class="section-title">
        <SlidersHorizontal :size="18" />
        <span>参数信息</span>
      </div>
      <div class="input-grid">
        <div v-for="item in inputRows" :key="item.key" class="input-item">
          <MartingaleTipLabel
            :label="item.label"
            :tip-key="item.key"
            mode="spot"
            :side="activeInput?.side"
            :platform="activeInput?.executionPlatform"
          />
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </section>

    <section class="metric-section">
      <div class="section-title">
        <BarChart3 :size="18" />
        <span>核心指标</span>
      </div>
      <div class="metric-grid">
        <article v-for="item in summaryMetrics" :key="item.key" class="metric-card">
          <MartingaleTipLabel :label="item.label" :tip-key="item.key" mode="spot" :side="activeInput?.side" />
          <strong :class="{ negative: item.danger }">{{ item.value }}</strong>
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
          <MartingaleTipLabel label="当前持仓数量" tip-key="currentQuantity" mode="spot" />
          <strong>{{ formatNumber(result?.currentQuantity ?? 0, 8) }}</strong>
        </div>
        <div class="position-row">
          <MartingaleTipLabel label="当前持仓均价" tip-key="currentAverageEntryPrice" mode="spot" />
          <strong>{{ formatNumber(result?.currentAverageEntryPrice ?? 0, MARTINGALE_PRICE_DECIMAL_PLACES) }}</strong>
        </div>
        <div class="position-row">
          <MartingaleTipLabel label="当前止盈毛利润" tip-key="currentGrossProfit" mode="spot" />
          <strong>{{
            formatProfitWithRate(
              result?.currentTakeProfitGrossProfitAmount ?? 0,
              result?.currentTakeProfitGrossProfitRate ?? 0,
            )
          }}</strong>
        </div>
        <div class="position-row">
          <MartingaleTipLabel label="当前止盈净利润" tip-key="currentNetProfit" mode="spot" />
          <strong :class="{ negative: (result?.currentTakeProfitNetProfitAmount ?? 0) < 0 }">{{
            formatProfitWithRate(
              result?.currentTakeProfitNetProfitAmount ?? 0,
              result?.currentTakeProfitNetProfitRate ?? 0,
            )
          }}</strong>
        </div>
        <div class="position-row">
          <MartingaleTipLabel label="满层止盈毛利润" tip-key="maxGrossProfit" mode="spot" />
          <strong>{{
            formatProfitWithRate(result?.maxTakeProfitGrossProfitAmount ?? 0, result?.maxTakeProfitGrossProfitRate ?? 0)
          }}</strong>
        </div>
        <div class="position-row">
          <MartingaleTipLabel label="满层止盈净利润" tip-key="maxNetProfit" mode="spot" />
          <strong :class="{ negative: (result?.maxTakeProfitNetProfitAmount ?? 0) < 0 }">{{
            formatProfitWithRate(result?.maxTakeProfitNetProfitAmount ?? 0, result?.maxTakeProfitNetProfitRate ?? 0)
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
                <strong><MartingaleTipLabel :label="`第 ${layer.layer} 层`" tip-key="layerNumber" /></strong>
                <van-tag :type="layer.layer <= (result?.currentExecutedLayers ?? 0) ? 'primary' : 'default'" plain>
                  <MartingaleTipLabel
                    :label="layer.layer <= (result?.currentExecutedLayers ?? 0) ? '已执行' : '计划中'"
                    tip-key="layerStatus"
                  />
                </van-tag>
              </div>
              <div class="layer-grid">
                <div class="layer-metric">
                  <MartingaleTipLabel
                    label="触发价"
                    tip-key="triggerPrice"
                    :platform="activeInput?.executionPlatform"
                  />
                  <b>{{
                    formatPriceWithReferenceChange(
                      layer.triggerPrice,
                      result.entryPrice,
                      MARTINGALE_PRICE_DECIMAL_PLACES,
                      2,
                    )
                  }}</b>
                </div>
                <div class="layer-metric">
                  <MartingaleTipLabel
                    label="触发时浮动盈亏"
                    tip-key="triggerFloatingProfitLoss"
                    :side="activeInput?.side"
                  />
                  <b :class="{ negative: layer.triggerFloatingProfitLoss < 0 }">{{
                    formatProfitWithRate(layer.triggerFloatingProfitLoss ?? 0, layer.triggerFloatingProfitRate ?? 0)
                  }}</b>
                </div>
                <div class="layer-metric">
                  <MartingaleTipLabel label="本层金额" tip-key="layerOrderAmount" mode="spot" />
                  <b>{{ formatNumber(layer.orderAmount, 4) }}</b>
                </div>
                <div class="layer-metric">
                  <MartingaleTipLabel label="本层成交数量" tip-key="layerPosition" mode="spot" />
                  <b>{{ formatNumber(layer.quantity, 8) }}</b>
                </div>
                <div class="layer-metric">
                  <MartingaleTipLabel label="累计投入" tip-key="cumulativeCapital" mode="spot" />
                  <b>{{ formatNumber(layer.capitalUsed, 4) }}</b>
                </div>
                <div class="layer-metric">
                  <MartingaleTipLabel label="累计成交数量" tip-key="cumulativePosition" mode="spot" />
                  <b>{{ formatNumber(layer.cumulativeQuantity, 8) }}</b>
                </div>
                <div class="layer-metric">
                  <MartingaleTipLabel label="持仓均价" tip-key="layerAverageEntryPrice" />
                  <b>{{
                    formatPriceWithReferenceChange(
                      layer.averageEntryPrice,
                      layer.triggerPrice,
                      MARTINGALE_PRICE_DECIMAL_PLACES,
                      2,
                    )
                  }}</b>
                </div>
                <div class="layer-metric">
                  <MartingaleTipLabel label="止盈价" tip-key="layerTakeProfitPrice" :side="activeInput?.side" />
                  <b>{{
                    formatPriceWithReferenceChange(
                      layer.takeProfitPrice,
                      layer.triggerPrice,
                      MARTINGALE_PRICE_DECIMAL_PLACES,
                      2,
                    )
                  }}</b>
                </div>
                <div class="layer-metric layer-metric--profit">
                  <MartingaleTipLabel label="止盈毛利润" tip-key="layerGrossProfit" />
                  <b>{{
                    formatProfitWithRate(layer.takeProfitGrossProfitAmount ?? 0, layer.takeProfitGrossProfitRate ?? 0)
                  }}</b>
                </div>
                <div class="layer-metric layer-metric--profit">
                  <MartingaleTipLabel label="止盈净利润" tip-key="layerNetProfit" />
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
