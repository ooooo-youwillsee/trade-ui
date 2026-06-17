<script setup>
// 合约网格结果组件：把计算结果拆成关键指标、风险提示和网格明细展示。
import { computed, ref } from 'vue';
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
} from '@lucide/vue';
import {
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_NEUTRAL,
  GRID_MODE_GEOMETRIC,
  POSITION_INCREMENT_DIFFERENCE,
} from '../strategies/common/grid';
import { getHealth } from '../composables/useContractGridStrategies';
import { formatNumber, formatPercent, formatPriceWithReferenceChange } from '../utils/formatters';

// activeInput 用于展示输入摘要，result 用于展示计算结果。
const props = defineProps({
  activeInput: {
    type: Object,
    default: null,
  },
  result: {
    type: Object,
    default: null,
  },
});

const activeGridSections = ref([]);
// 健康度由强平距离决定，页面只展示 label/tone/distance。
const health = computed(() => getHealth(props.result, props.activeInput));
const healthType = computed(() => {
  if (health.value.tone === 'danger') return 'danger';
  if (health.value.tone === 'warning') return 'warning';
  return 'success';
});
const isNeutral = computed(() => props.activeInput?.side === CONTRACT_SIDE_NEUTRAL);
const sideLabel = computed(() => sideText(props.activeInput?.side));
const sideIcon = computed(() => {
  if (isNeutral.value) return ArrowLeftRight;
  return props.activeInput?.side === CONTRACT_SIDE_LONG ? TrendingUp : TrendingDown;
});
const incrementLabel = computed(() => {
  if (props.activeInput?.positionIncrementMode === POSITION_INCREMENT_DIFFERENCE) {
    return `差额递增 ${formatNumber(props.activeInput?.positionIncrementValue ?? 0, 2)}`;
  }
  return `比例递增 ${formatPercent(props.activeInput?.positionIncrementValue ?? 0, 2)}`;
});

const summaryMetrics = computed(() => [
  {
    label: '预估网格强平价',
    value: formatNumber(props.result?.estimatedGridLiquidationPrice ?? 0, 4),
    primary: true,
  },
  {
    label: '当前强平价',
    value: formatNumber(props.result?.liquidationPrice ?? 0, 4),
  },
  {
    label: '计划名义仓位',
    value: formatNumber(props.result?.notional ?? 0, 2),
  },
  {
    label: '总保证金',
    value: formatNumber(props.result?.margin ?? 0, 2),
  },
  {
    label: '单格收益率',
    value: formatPercent(props.result?.gridProfitRate ?? 0, 4),
  },
  {
    label: '区间振幅',
    value: formatPercent(props.result?.totalYieldRate ?? 0, 4),
  },
]);

const positionRows = computed(() => [
  ['已成交网格数', String(props.result?.filledGridCount ?? 0)],
  ['未平仓网格数', String(props.result?.openGridCount ?? 0)],
  ['已止盈网格数', String(props.result?.closedGridCount ?? 0)],
  ['当前名义持仓', formatNumber(props.result?.currentNotional ?? 0, 4)],
  ['持仓数量', formatNumber(props.result?.positionQuantity ?? 0, 8)],
  ['平均入场价', formatNumber(props.result?.averageEntryPrice ?? 0, 4)],
]);
const neutralLegRows = computed(() => [
  ['多腿强平价', formatNumber(props.result?.longLeg?.liquidationPrice ?? 0, 4)],
  ['空腿强平价', formatNumber(props.result?.shortLeg?.liquidationPrice ?? 0, 4)],
  ['多腿名义仓位', formatNumber(props.result?.longLeg?.currentNotional ?? 0, 4)],
  ['空腿名义仓位', formatNumber(props.result?.shortLeg?.currentNotional ?? 0, 4)],
  ['多腿总收益', formatNumber(props.result?.longLeg?.totalProfitLoss ?? 0, 4)],
  ['空腿总收益', formatNumber(props.result?.shortLeg?.totalProfitLoss ?? 0, 4)],
]);
const inputRows = computed(() => [
  ['策略名称', props.activeInput?.name || '-'],
  ['方向', sideText(props.activeInput?.side)],
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
  ['杠杆倍数', `${formatNumber(props.activeInput?.leverage ?? 0, 2)}x`],
  ['初始保证金', formatNumber(props.activeInput?.investment ?? 0, 2)],
  ['追加保证金', formatNumber(props.activeInput?.additionalInvestment ?? 0, 2)],
  ['仓位递增', incrementLabel.value],
]);

// 将合约网格方向值转换成详情页可读文案，中性模式单独展示。
function sideText(side) {
  if (side === CONTRACT_SIDE_NEUTRAL) return '中性';
  return side === CONTRACT_SIDE_LONG ? '做多' : '做空';
}

// 按方向选择 Vant 标签颜色，避免中性模式被误标为做多或做空。
function sideTagType(side) {
  if (side === CONTRACT_SIDE_NEUTRAL) return 'primary';
  return side === CONTRACT_SIDE_LONG ? 'success' : 'danger';
}
</script>

<template>
  <!-- 合约网格结果：先展示风险概览，再展示参数、指标、仓位和网格价格。 -->
  <div class="results-panel">
    <section class="detail-hero">
      <div class="detail-hero__top">
        <div class="side-badge">
          <component :is="sideIcon" :size="18" />
          {{ sideLabel }}
        </div>
        <van-tag :type="healthType" round>{{ health.label }}</van-tag>
      </div>

      <h2>{{ result?.name || '合约网格' }}</h2>

      <div class="health-line">
        <ShieldCheck :size="18" />
        <span>强平缓冲</span>
        <strong>{{ formatPercent(health.distance, 2) }}</strong>
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
        <article v-for="metric in summaryMetrics" :key="metric.label" class="metric-card">
          <span>{{ metric.label }}</span>
          <strong :class="{ primary: metric.primary }">{{ metric.value }}</strong>
        </article>
      </div>
    </section>

    <section v-if="isNeutral" class="detail-card">
      <div class="section-title">
        <ArrowLeftRight :size="18" />
        <span>双腿风险</span>
      </div>
      <div class="input-grid">
        <div v-for="[label, value] in neutralLegRows" :key="label" class="input-item">
          <span>{{ label }}</span>
          <strong>{{ value }}</strong>
        </div>
      </div>
    </section>

    <section class="detail-card">
      <div class="section-title">
        <Wallet :size="18" />
        <span>当前持仓</span>
      </div>
      <div class="position-list">
        <div v-for="[label, value] in positionRows" :key="label" class="position-row">
          <span>{{ label }}</span>
          <strong>{{ value }}</strong>
        </div>
        <div class="position-row">
          <span>已实现收益</span>
          <strong :class="{ negative: (result?.realizedProfitLoss ?? 0) < 0 }">
            {{ formatNumber(result?.realizedProfitLoss ?? 0, 4) }}
          </strong>
        </div>
        <div class="position-row">
          <span>未实现收益</span>
          <strong :class="{ negative: (result?.unrealizedProfitLoss ?? 0) < 0 }">
            {{ formatNumber(result?.unrealizedProfitLoss ?? 0, 4) }}
          </strong>
        </div>
        <div class="position-row">
          <span>总收益</span>
          <strong :class="{ negative: (result?.totalProfitLoss ?? 0) < 0 }">
            {{ formatNumber(result?.totalProfitLoss ?? 0, 4) }}
          </strong>
        </div>
        <div class="position-row">
          <span>当前权益</span>
          <strong :class="{ negative: (result?.currentEquity ?? 0) < 0 }">
            {{ formatNumber(result?.currentEquity ?? 0, 4) }}
          </strong>
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
          <div class="grid-order-list">
            <div v-for="order in result?.gridOrders ?? []" :key="order.price" class="grid-order-row">
              <div>
                <span>挂单价格</span>
                <strong>{{ formatNumber(order.price, 4) }}</strong>
              </div>
              <div>
                <span>保证金</span>
                <strong>{{ formatNumber(order.margin, 4) }}</strong>
              </div>
              <div>
                <span>利润率</span>
                <strong>{{ formatPercent(order.profitRate, 4) }}</strong>
              </div>
              <div>
                <span>收益额</span>
                <strong>{{ formatNumber(order.profitAmount ?? 0, 4) }}</strong>
              </div>
              <van-tag :type="sideTagType(order.side)" round>{{ sideText(order.side) }}</van-tag>
              <van-tag :type="order.filled ? 'warning' : 'primary'" round>
                {{ order.filled ? '已成交' : '未成交' }}
              </van-tag>
            </div>
          </div>
        </van-collapse-item>
      </van-collapse>
    </section>
  </div>
</template>

<style scoped lang="scss">
/* 结果卡片布局：用紧凑网格承载移动端可扫描的核心指标。 */
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

  h2 {
    margin: 0;
    color: var(--trade-text);
    font-size: var(--trade-font-display);
    font-weight: var(--trade-weight-title);
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
}

.detail-hero__top,
.health-line,
.section-title {
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
  display: inline-flex;
  align-items: center;
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

  span {
    color: var(--trade-muted);
    font-weight: var(--trade-weight-medium);
  }

  strong {
    margin-left: auto;
    color: var(--trade-text);
    font-family: var(--trade-number-font);
    font-variant-numeric: tabular-nums;
  }
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

  svg {
    color: var(--trade-up);
  }

  small {
    margin-left: auto;
    color: var(--trade-muted);
    font-size: var(--trade-font-xs);
    font-weight: var(--trade-weight-medium);
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.metric-card {
  display: grid;
  align-content: center;
  gap: 8px;
  min-height: 78px;
  border: 1px solid var(--trade-border);
  border-radius: 8px;
  padding: 12px;
  background: var(--trade-surface-soft);

  span {
    color: var(--trade-muted);
    font-size: var(--trade-font-xs);
    font-weight: var(--trade-weight-medium);
    line-height: 1.25;
  }

  strong {
    color: var(--trade-text);
    font-family: var(--trade-number-font);
    font-size: var(--trade-font-lg);
    font-weight: var(--trade-weight-strong);
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
    overflow-wrap: anywhere;

    &.primary {
      color: var(--trade-up);
    }
  }
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.input-item {
  display: grid;
  gap: 6px;
  min-width: 0;
  border: 1px solid var(--trade-border);
  border-radius: 8px;
  padding: 10px;
  background: var(--trade-surface-soft);

  span {
    color: var(--trade-muted);
    font-size: var(--trade-font-xs);
    font-weight: var(--trade-weight-medium);
    line-height: 1.25;
  }

  strong {
    color: var(--trade-text);
    font-family: var(--trade-number-font);
    font-size: var(--trade-font-md);
    font-weight: var(--trade-weight-strong);
    font-variant-numeric: tabular-nums;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }
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

  &:first-child {
    border-top: 0;
  }

  span {
    color: var(--trade-muted);
    font-weight: var(--trade-weight-medium);
  }

  strong {
    color: var(--trade-text);
    font-family: var(--trade-number-font);
    font-weight: var(--trade-weight-strong);
    font-variant-numeric: tabular-nums;
    text-align: right;
    overflow-wrap: anywhere;
  }
}

.negative {
  color: var(--trade-down) !important;
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
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 0.8fr) auto auto;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  border-bottom: 1px solid var(--trade-border);
  padding: 10px 0;
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

:global(:root[data-theme='dark']) .detail-hero {
  background: linear-gradient(135deg, rgba(22, 199, 132, 0.18), rgba(21, 31, 27, 0.94)), var(--trade-surface);
}
</style>
