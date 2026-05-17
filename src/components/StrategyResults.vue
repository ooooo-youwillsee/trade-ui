<script setup>
import { computed } from 'vue';
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
const healthType = computed(() => {
  if (health.value.tone === 'danger') return 'danger';
  if (health.value.tone === 'warning') return 'warning';
  return 'success';
});
const sideLabel = computed(() => (props.activeInput?.side === CONTRACT_SIDE_LONG ? '做多' : '做空'));
</script>

<template>
  <div class="results-panel">
    <van-cell-group inset>
      <van-cell :title="result?.name || '合约网格'" :label="sideLabel">
        <template #value>
          <van-tag :type="healthType">{{ health.label }}</van-tag>
        </template>
      </van-cell>
      <van-cell title="强平缓冲" :value="formatPercent(health.distance, 2)" />
    </van-cell-group>

    <van-grid :column-num="2" clickable gutter="8">
      <van-grid-item text="预估网格强平价">
        <template #icon>
          <strong class="grid-metric primary">{{ formatNumber(result?.estimatedGridLiquidationPrice ?? 0, 4) }}</strong>
        </template>
      </van-grid-item>
      <van-grid-item text="当前强平价">
        <template #icon>
          <strong class="grid-metric">{{ formatNumber(result?.liquidationPrice ?? 0, 4) }}</strong>
        </template>
      </van-grid-item>
      <van-grid-item text="计划名义仓位">
        <template #icon>
          <strong class="grid-metric">{{ formatNumber(result?.notional ?? 0, 2) }}</strong>
        </template>
      </van-grid-item>
      <van-grid-item text="总保证金">
        <template #icon>
          <strong class="grid-metric">{{ formatNumber(result?.margin ?? 0, 2) }}</strong>
        </template>
      </van-grid-item>
      <van-grid-item text="单格收益率">
        <template #icon>
          <strong class="grid-metric">{{ formatPercent(result?.gridProfitRate ?? 0, 4) }}</strong>
        </template>
      </van-grid-item>
      <van-grid-item text="区间收益率">
        <template #icon>
          <strong class="grid-metric">{{ formatPercent(result?.totalYieldRate ?? 0, 4) }}</strong>
        </template>
      </van-grid-item>
    </van-grid>

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

    <van-cell-group inset :title="`网格价格（${result?.gridPrices.length ?? 0} 个价格点）`">
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
    </van-cell-group>
  </div>
</template>
