<script setup>
import { computed, ref } from 'vue';
import { ArrowLeftRight, BarChart3, Boxes, ShieldAlert, TrendingDown, TrendingUp, Wallet } from '@lucide/vue';
import { formatNumber, formatPercent, formatPriceWithReferenceChange, formatProfitWithRate } from '../utils/formatters';
import GridTipLabel from './GridTipLabel.vue';

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

const openSections = ref([]);

// 顶部总览只展示跨两条腿汇总后的资金压力和可转出收益。
const summaryMetrics = computed(() => [
  {
    key: 'hedgeRequiredMargin',
    label: '需补保证金',
    value: formatNumber(props.result?.requiredMarginAmount ?? 0, 2),
  },
  {
    key: 'hedgeMarginShortfall',
    label: '资金缺口',
    value: formatNumber(props.result?.marginShortfall ?? 0, 2),
    danger: (props.result?.marginShortfall ?? 0) > 0,
  },
  {
    key: 'hedgeTransferableProfit',
    label: '可转出盈利',
    value: formatNumber(props.result?.availableTransferAmount ?? 0, 2),
  },
  {
    key: 'hedgeScenarioTotalProfit',
    label: '场景总收益',
    value: formatNumber(props.result?.scenarioTotalProfitLoss ?? 0, 2),
  },
]);

const scenarioRows = computed(() => [
  {
    key: 'longScenarioPrice',
    label: '多头场景价',
    value: formatPriceWithReferenceChange(
      props.result?.longScenarioPrice ?? 0,
      props.activeInput?.longLeg?.currentPrice ?? 0,
      4,
      2,
    ),
  },
  {
    key: 'shortScenarioPrice',
    label: '空头场景价',
    value: formatPriceWithReferenceChange(
      props.result?.shortScenarioPrice ?? 0,
      props.activeInput?.shortLeg?.currentPrice ?? 0,
      4,
      2,
    ),
  },
  {
    key: 'longScenarioChange',
    label: '多头涨跌幅',
    value: formatPercent(props.activeInput?.longScenarioChangePercent ?? 0, 2),
  },
  {
    key: 'shortScenarioChange',
    label: '空头涨跌幅',
    value: formatPercent(props.activeInput?.shortScenarioChangePercent ?? 0, 2),
  },
]);

// 腿部明细固定按多头、空头两组展示，方向由策略计算层保证。
const legRows = computed(() => [
  {
    key: 'long',
    title: '多头合约',
    icon: TrendingUp,
    input: props.activeInput?.longLeg,
    result: props.result?.longLegResult,
    scenario: props.result?.longScenarioResult,
    requiredMargin: props.result?.longRequiredMarginAmount ?? 0,
  },
  {
    key: 'short',
    title: '空头合约',
    icon: TrendingDown,
    input: props.activeInput?.shortLeg,
    result: props.result?.shortLegResult,
    scenario: props.result?.shortScenarioResult,
    requiredMargin: props.result?.shortRequiredMarginAmount ?? 0,
  },
]);

function legMetrics(leg) {
  // 当前值来自当前网格结果，场景值来自场景推演结果，便于对比仓位变化。
  return [
    { key: 'contractName', label: '合约名称', value: leg.input?.name || '-' },
    {
      key: 'minTradeQuantity',
      label: '最小成交数量',
      value: formatNumber(leg.input?.minTradeQuantity ?? 0, 8),
    },
    {
      key: 'tradablePerGridQuantity',
      label: '实际单格数量',
      value: formatNumber(leg.result?.tradablePerGridQuantity ?? 0, 8),
    },
    {
      key: 'unallocatedCapital',
      label: '未分配保证金',
      value: formatNumber(leg.result?.unallocatedMargin ?? 0, 4),
    },
    { key: 'legCurrentNotional', label: '当前持仓', value: formatNumber(leg.result?.currentNotional ?? 0, 4) },
    {
      key: 'legScenarioNotional',
      label: '场景持仓',
      value: formatNumber(leg.scenario?.currentNotional ?? 0, 4),
    },
    {
      key: 'legCurrentAveragePrice',
      label: '当前持仓均价',
      value: formatNumber(leg.result?.averageEntryPrice ?? 0, 4),
    },
    {
      key: 'legScenarioAveragePrice',
      label: '场景持仓均价',
      value: formatNumber(leg.scenario?.averageEntryPrice ?? 0, 4),
    },
    {
      key: 'legCurrentLiquidationPrice',
      label: '当前强平价',
      value: formatNumber(leg.result?.liquidationPrice ?? 0, 4),
    },
    {
      key: 'legScenarioLiquidationPrice',
      label: '场景强平价',
      value: formatNumber(leg.scenario?.liquidationPrice ?? 0, 4),
    },
    {
      key: 'legScenarioProfit',
      label: '场景总收益',
      value: formatNumber(leg.scenario?.totalProfitLoss ?? 0, 4),
    },
    { key: 'legRequiredMargin', label: '需补保证金', value: formatNumber(leg.requiredMargin, 4) },
  ];
}
</script>

<template>
  <div class="results-panel">
    <section class="detail-hero">
      <div class="detail-hero__top">
        <div class="side-badge">
          <ArrowLeftRight :size="18" />
          <GridTipLabel label="对冲合约网格" tip-key="direction" side="neutral" />
        </div>
        <van-tag :type="(result?.marginShortfall ?? 0) > 0 ? 'warning' : 'success'" round>
          <GridTipLabel
            :label="(result?.marginShortfall ?? 0) > 0 ? '需要外部补充' : '浮盈可覆盖'"
            tip-key="strategyStatus"
            mode="hedge"
          />
        </van-tag>
      </div>
      <h2>{{ result?.name || '对冲合约网格' }}</h2>
      <div class="health-line">
        <ShieldAlert :size="18" />
        <GridTipLabel label="资金缺口" tip-key="hedgeMarginShortfall" />
        <strong>{{ formatNumber(result?.marginShortfall ?? 0, 2) }}</strong>
      </div>
    </section>

    <section class="metric-section">
      <div class="section-title">
        <BarChart3 :size="18" />
        <span>对冲概览</span>
      </div>
      <div class="metric-grid">
        <article v-for="item in summaryMetrics" :key="item.key" class="metric-card">
          <GridTipLabel :label="item.label" :tip-key="item.key" mode="hedge" />
          <strong :class="{ negative: item.danger }">{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <section class="detail-card">
      <div class="section-title">
        <ArrowLeftRight :size="18" />
        <span>场景价格</span>
      </div>
      <div class="input-grid">
        <div v-for="item in scenarioRows" :key="item.key" class="input-item">
          <GridTipLabel :label="item.label" :tip-key="item.key" mode="hedge" />
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </section>

    <section v-for="leg in legRows" :key="leg.key" class="detail-card">
      <div class="section-title">
        <component :is="leg.icon" :size="18" />
        <span>{{ leg.title }}</span>
      </div>
      <div class="input-grid">
        <div v-for="item in legMetrics(leg)" :key="item.key" class="input-item">
          <GridTipLabel :label="item.label" :tip-key="item.key" mode="futures" :side="leg.key" />
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </section>

    <section class="detail-card grid-orders-card">
      <van-collapse v-model="openSections">
        <van-collapse-item v-for="leg in legRows" :key="leg.key" :name="leg.key">
          <template #title>
            <div class="section-title collapse-title">
              <Boxes :size="18" />
              <span>{{ leg.title }}网格</span>
              <small>{{ leg.result?.gridOrders?.length ?? 0 }} 个挂单</small>
            </div>
          </template>
          <!-- 对冲两条腿复用普通合约网格的毛净利润口径与紧凑布局。 -->
          <div class="grid-order-list">
            <div
              v-for="order in leg.result?.gridOrders ?? []"
              :key="`${leg.key}-${order.price}`"
              class="grid-order-row"
            >
              <div>
                <GridTipLabel label="挂单价格" tip-key="gridOrderPrice" />
                <strong>{{ formatNumber(order.price, 4) }}</strong>
              </div>
              <div>
                <GridTipLabel label="保证金" tip-key="gridOrderCapital" mode="futures" />
                <strong>{{ formatNumber(order.margin, 4) }}</strong>
              </div>
              <div>
                <GridTipLabel label="毛利润" tip-key="gridOrderGrossProfit" />
                <strong>{{ formatProfitWithRate(order.grossProfitAmount ?? 0, order.grossProfitRate ?? 0) }}</strong>
              </div>
              <div>
                <GridTipLabel label="净利润" tip-key="gridOrderNetProfit" />
                <strong>{{ formatProfitWithRate(order.netProfitAmount ?? 0, order.netProfitRate ?? 0) }}</strong>
              </div>
              <div class="grid-order-tags">
                <van-tag :type="order.filled ? 'warning' : 'primary'" round>
                  <GridTipLabel :label="order.filled ? '已成交' : '未成交'" tip-key="gridOrderStatus" />
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

:global(:root[data-theme='dark']) .detail-hero {
  background: linear-gradient(135deg, rgba(22, 199, 132, 0.18), rgba(21, 31, 27, 0.94)), var(--trade-surface);
}
</style>
