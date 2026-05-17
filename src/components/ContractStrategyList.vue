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
    <van-nav-bar title="合约网格" fixed placeholder>
      <template #right>
        <van-button icon="plus" size="small" type="primary" round @click="$emit('add-strategy')">新增</van-button>
      </template>
    </van-nav-bar>

    <div class="strategy-card-list">
      <van-empty
        v-if="strategySummaries.length === 0"
        description="暂无合约网格策略"
        image="search"
      >
        <van-button round type="primary" @click="$emit('add-strategy')">创建第一个策略</van-button>
      </van-empty>

      <van-swipe-cell v-for="item in strategySummaries" :key="item.strategy.id">
        <article class="strategy-card">
          <button class="strategy-card-main" type="button" @click="$emit('view-strategy', item.strategy.id)">
            <span class="strategy-title">
              <TrendingUp v-if="item.strategy.side === CONTRACT_SIDE_LONG" :size="18" />
              <TrendingDown v-else :size="18" />
              {{ item.strategy.name || '未命名策略' }}
            </span>
            <span class="strategy-meta">
              <van-tag plain type="primary">{{ item.strategy.gridMode === GRID_MODE_GEOMETRIC ? '等比' : '等差' }}</van-tag>
              <van-tag plain>{{ item.strategy.gridCount }} 格</van-tag>
              <van-tag plain type="success">{{ item.strategy.leverage }}x</van-tag>
            </span>
            <span class="list-metrics">
              <span>
                <small>预估强平</small>
                <b>{{ item.calculation.error ? '-' : formatNumber(item.calculation.result.estimatedGridLiquidationPrice, 2) }}</b>
              </span>
              <span>
                <small>单格收益</small>
                <b>{{ item.calculation.error ? '参数异常' : formatPercent(item.calculation.result.gridProfitRate, 3) }}</b>
              </span>
              <span>
                <small>当前收益</small>
                <b :class="{ negative: (item.calculation.result?.floatingProfitLoss ?? 0) < 0 }">
                  {{
                    item.calculation.error
                      ? '-'
                      : `${formatNumber(item.calculation.result.floatingProfitLoss, 2)} / ${formatPercent(currentYieldRate(item.calculation.result), 2)}`
                  }}
                </b>
              </span>
            </span>
          </button>

          <div class="strategy-card-actions">
            <button type="button" @click="$emit('edit-strategy', item.strategy.id)">
              <Edit3 :size="16" /> 编辑
            </button>
            <button class="danger-text" type="button" @click="$emit('delete-strategy', item.strategy.id)">
              <Trash2 :size="16" /> 删除
            </button>
          </div>
        </article>
        <template #right>
          <van-button square type="primary" text="编辑" @click="$emit('edit-strategy', item.strategy.id)" />
          <van-button square type="danger" text="删除" @click="$emit('delete-strategy', item.strategy.id)" />
        </template>
      </van-swipe-cell>
    </div>
  </section>
</template>
