<script setup>
import { computed } from 'vue';
import { TrendingDown, TrendingUp } from '@lucide/vue';
import { CONTRACT_SIDE_LONG } from '../contractGrid';
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
const sideIcon = computed(() => (props.activeInput?.side === CONTRACT_SIDE_LONG ? TrendingUp : TrendingDown));
</script>

<template>
  <div class="panel results-panel">
    <div class="summary-strip" :class="health.tone">
      <component :is="sideIcon" :size="22" />
      <div>
        <span>{{ result?.name || '合约网格' }}</span>
        <strong>{{ health.label }}</strong>
      </div>
      <b>{{ formatPercent(health.distance, 2) }}</b>
    </div>

    <div class="metric-grid">
      <div class="metric primary">
        <span>预估网格强平价</span>
        <strong>{{ formatNumber(result?.estimatedGridLiquidationPrice ?? 0, 4) }}</strong>
      </div>
      <div class="metric">
        <span>当前强平价</span>
        <strong>{{ formatNumber(result?.liquidationPrice ?? 0, 4) }}</strong>
      </div>
      <div class="metric">
        <span>计划名义仓位</span>
        <strong>{{ formatNumber(result?.notional ?? 0, 2) }}</strong>
      </div>
      <div class="metric">
        <span>总保证金</span>
        <strong>{{ formatNumber(result?.margin ?? 0, 2) }}</strong>
      </div>
      <div class="metric">
        <span>单格收益率</span>
        <strong>{{ formatPercent(result?.gridProfitRate ?? 0, 4) }}</strong>
      </div>
      <div class="metric">
        <span>区间收益率</span>
        <strong>{{ formatPercent(result?.totalYieldRate ?? 0, 4) }}</strong>
      </div>
    </div>

    <van-cell-group inset title="当前仓位">
      <van-cell title="已成交网格数" :value="result?.filledGridCount ?? 0" />
      <van-cell title="当前名义持仓" :value="formatNumber(result?.currentNotional ?? 0, 4)" />
      <van-cell title="持仓数量" :value="formatNumber(result?.positionQuantity ?? 0, 8)" />
      <van-cell title="平均入场价" :value="formatNumber(result?.averageEntryPrice ?? 0, 4)" />
      <van-cell title="浮动盈亏">
        <template #value>
          <span :class="{ negative: (result?.floatingProfitLoss ?? 0) < 0 }">
            {{ formatNumber(result?.floatingProfitLoss ?? 0, 4) }}
          </span>
        </template>
      </van-cell>
      <van-cell title="当前权益">
        <template #value>
          <span :class="{ negative: (result?.currentEquity ?? 0) < 0 }">
            {{ formatNumber(result?.currentEquity ?? 0, 4) }}
          </span>
        </template>
      </van-cell>
    </van-cell-group>

    <div class="section-title">
      <h2>网格价格</h2>
      <span>{{ result?.gridPrices.length ?? 0 }} 个价格点</span>
    </div>

    <div class="grid-list">
      <span
        v-for="(price, index) in gridPreview"
        :key="`${price}-${index}`"
        :class="{ ellipsis: price === null, filled: result?.filledGridPrices.includes(price) }"
      >
        {{ price === null ? '...' : formatNumber(price, 4) }}
      </span>
    </div>
  </div>
</template>
