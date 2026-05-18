<script setup>
import { Edit3, Trash2, TrendingDown, TrendingUp } from '@lucide/vue';
import { CONTRACT_SIDE_LONG, GRID_MODE_GEOMETRIC } from '../contractGrid';
import { currentYieldRate } from '../composables/useContractGridStrategies';
import { formatNumber, formatPercent } from '../utils/formatters';

defineProps({
  strategySummaries: {
    type: Array,
    required: true,
  },
});

defineEmits(['add-strategy', 'delete-strategy', 'edit-strategy', 'view-strategy']);
</script>

<template>
  <section class="mobile-page">
    <van-nav-bar class="app-nav-bar" title="合约网格" fixed placeholder>
      <template #right>
        <van-button class="nav-add-button" icon="plus" size="small" type="primary" round @click="$emit('add-strategy')">
          新增
        </van-button>
      </template>
    </van-nav-bar>

    <div class="scroll-list">
      <van-empty v-if="strategySummaries.length === 0" description="暂无合约网格策略" image="search">
        <van-button round type="primary" @click="$emit('add-strategy')">创建第一个策略</van-button>
      </van-empty>

      <van-swipe-cell v-for="item in strategySummaries" :key="item.strategy.id">
        <van-cell-group
          class="strategy-card"
          inset
          role="button"
          tabindex="0"
          @click="$emit('view-strategy', item.strategy.id)"
          @keydown.enter="$emit('view-strategy', item.strategy.id)"
        >
          <van-cell clickable :label="item.strategy.name || '未命名策略'">
            <template #title>
              <span class="strategy-title">
                <TrendingUp v-if="item.strategy.side === CONTRACT_SIDE_LONG" :size="18" />
                <TrendingDown v-else :size="18" />
                {{ item.strategy.name || '未命名策略' }}
              </span>
            </template>
            <template #value>
              <van-tag plain type="primary">{{ item.strategy.gridMode === GRID_MODE_GEOMETRIC ? '等比' : '等差' }}</van-tag>
            </template>
          </van-cell>

          <van-cell>
            <template #title>
              <van-space wrap>
                <van-tag plain>{{ item.strategy.gridCount }} 格</van-tag>
                <van-tag plain type="success">{{ item.strategy.leverage }}x</van-tag>
              </van-space>
            </template>
          </van-cell>

          <van-grid :border="false" :column-num="3">
            <van-grid-item text="预估强平">
              <template #icon>
                <strong class="list-metric">{{ item.calculation.error ? '-' : formatNumber(item.calculation.result.estimatedGridLiquidationPrice, 2) }}</strong>
              </template>
            </van-grid-item>
            <van-grid-item text="单格收益">
              <template #icon>
                <strong class="list-metric">{{ item.calculation.error ? '参数异常' : formatPercent(item.calculation.result.gridProfitRate, 3) }}</strong>
              </template>
            </van-grid-item>
          <van-grid-item text="当前收益">
            <template #icon>
              <span
                v-if="!item.calculation.error"
                class="yield-metric"
                :class="{ negative: item.calculation.result.floatingProfitLoss < 0 }"
              >
                <strong>{{ formatNumber(item.calculation.result.floatingProfitLoss, 2) }}</strong>
                <small>{{ formatPercent(currentYieldRate(item.calculation.result), 2) }}</small>
              </span>
              <strong v-else class="list-metric">-</strong>
            </template>
          </van-grid-item>
          </van-grid>

          <van-cell>
            <template #value>
              <van-space>
                <van-button plain size="small" type="primary" @click.stop="$emit('edit-strategy', item.strategy.id)">
                  <Edit3 :size="15" /> 编辑
                </van-button>
                <van-button plain size="small" type="danger" @click.stop="$emit('delete-strategy', item.strategy.id)">
                  <Trash2 :size="15" /> 删除
                </van-button>
              </van-space>
            </template>
          </van-cell>
        </van-cell-group>

        <template #right>
          <div class="swipe-actions">
            <van-button square type="primary" text="编辑" @click.stop="$emit('edit-strategy', item.strategy.id)" />
            <van-button square type="danger" text="删除" @click.stop="$emit('delete-strategy', item.strategy.id)" />
          </div>
        </template>
      </van-swipe-cell>
    </div>
  </section>
</template>

<style scoped lang="scss">
.app-nav-bar {
  --van-nav-bar-background: var(--trade-nav-bg);

  &::after {
    border-bottom: 0;
  }

  :deep(.van-nav-bar__content) {
    box-shadow: var(--trade-nav-shadow);
    backdrop-filter: blur(12px);
  }

  :deep(.van-nav-bar__title) {
    color: var(--trade-text);
    font-size: 1.08rem;
    font-weight: 900;
  }
}

.nav-add-button {
  min-width: 72px;
  box-shadow: 0 7px 18px rgba(22, 199, 132, 0.24);

  :deep(.van-button__content) {
    justify-content: center;
    gap: 3px;
    width: 100%;
  }
}

.scroll-list {
  min-height: 0;
  padding: 0 0 92px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.strategy-card {
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid rgba(22, 199, 132, 0.5);
    outline-offset: 2px;
  }
}

.swipe-actions {
  display: grid;
  grid-template-columns: repeat(2, 72px);
  height: 100%;

  :deep(.van-button) {
    width: 72px;
    height: 100%;
    min-height: 100%;
    border-radius: 0;
  }

  :deep(.van-button__content) {
    min-height: 100%;
  }
}

.strategy-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  color: var(--trade-text);
  font-weight: 900;
  overflow-wrap: anywhere;
}

.list-metric {
  display: block;
  color: var(--trade-text);
  font-family: "DIN Alternate", "Roboto Mono", Consolas, monospace;
  font-size: 0.98rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.yield-metric {
  display: grid;
  justify-items: center;
  gap: 2px;
  color: var(--trade-up);
  font-family: "DIN Alternate", "Roboto Mono", Consolas, monospace;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;

  strong {
    font-size: 0.98rem;
  }

  small {
    border-radius: 999px;
    padding: 2px 7px;
    color: var(--trade-up);
    background: rgba(22, 199, 132, 0.13);
    font-size: 0.72rem;
    font-weight: 900;
  }

  &.negative,
  &.negative small {
    color: var(--trade-down);
  }

  &.negative small {
    background: rgba(234, 57, 67, 0.14);
  }
}
</style>
