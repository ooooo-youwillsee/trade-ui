<script setup>
import { computed } from 'vue';
import { BarChart3, Boxes, ShieldCheck, SlidersHorizontal, TrendingDown, TrendingUp, Wallet } from '@lucide/vue';
import { CONTRACT_SIDE_LONG, GRID_MODE_GEOMETRIC } from '../strategies/common/grid';
import { getHealth } from '../composables/useContractGridStrategies';
import { formatNumber, formatPercent } from '../utils/formatters';

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

const gridPreview = computed(() => {
  if (!props.result) return [];
  if (props.result.gridPrices.length <= 16) return props.result.gridPrices;
  return [
    ...props.result.gridPrices.slice(0, 8),
    null,
    ...props.result.gridPrices.slice(props.result.gridPrices.length - 7),
  ];
});

const health = computed(() => getHealth(props.result, props.activeInput));
const healthType = computed(() => {
  if (health.value.tone === 'danger') return 'danger';
  if (health.value.tone === 'warning') return 'warning';
  return 'success';
});
const sideLabel = computed(() => (props.activeInput?.side === CONTRACT_SIDE_LONG ? '做多' : '做空'));
const sideIcon = computed(() => (props.activeInput?.side === CONTRACT_SIDE_LONG ? TrendingUp : TrendingDown));

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
    label: '区间收益率',
    value: formatPercent(props.result?.totalYieldRate ?? 0, 4),
  },
]);

const positionRows = computed(() => [
  ['已成交网格数', String(props.result?.filledGridCount ?? 0)],
  ['当前名义持仓', formatNumber(props.result?.currentNotional ?? 0, 4)],
  ['持仓数量', formatNumber(props.result?.positionQuantity ?? 0, 8)],
  ['平均入场价', formatNumber(props.result?.averageEntryPrice ?? 0, 4)],
]);
const inputRows = computed(() => [
  ['策略名称', props.activeInput?.name || '-'],
  ['方向', props.activeInput?.side === CONTRACT_SIDE_LONG ? '做多' : '做空'],
  ['网格模式', props.activeInput?.gridMode === GRID_MODE_GEOMETRIC ? '等比' : '等差'],
  ['创建时建仓', props.activeInput?.openOnCreate ? '是' : '否'],
  ['下限价格', formatNumber(props.activeInput?.lowerPrice ?? 0, 4)],
  ['上限价格', formatNumber(props.activeInput?.upperPrice ?? 0, 4)],
  ['入场价格', formatNumber(props.activeInput?.entryPrice ?? 0, 4)],
  ['当前价格', formatNumber(props.activeInput?.currentPrice ?? 0, 4)],
  ['网格数量', String(props.activeInput?.gridCount ?? '-')],
  ['杠杆倍数', `${formatNumber(props.activeInput?.leverage ?? 0, 2)}x`],
  ['初始保证金', formatNumber(props.activeInput?.investment ?? 0, 2)],
  ['追加保证金', formatNumber(props.activeInput?.additionalInvestment ?? 0, 2)],
]);
</script>

<template>
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
          <span>浮动盈亏</span>
          <strong :class="{ negative: (result?.floatingProfitLoss ?? 0) < 0 }">
            {{ formatNumber(result?.floatingProfitLoss ?? 0, 4) }}
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

    <section class="detail-card">
      <div class="section-title">
        <Boxes :size="18" />
        <span>网格价格</span>
        <small>{{ result?.gridPrices.length ?? 0 }} 个价格点</small>
      </div>
      <div class="tag-cloud">
        <van-tag
          v-for="(price, index) in gridPreview"
          :key="`${price}-${index}`"
          :plain="price !== null"
          :type="result?.filledGridPrices.includes(price) ? 'warning' : 'primary'"
        >
          {{ price === null ? '...' : formatNumber(price, 4) }}
        </van-tag>
      </div>
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

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:global(:root[data-theme='dark']) .detail-hero {
  background: linear-gradient(135deg, rgba(22, 199, 132, 0.18), rgba(21, 31, 27, 0.94)), var(--trade-surface);
}
</style>
