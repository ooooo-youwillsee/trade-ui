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
        <van-cell-group inset>
          <van-cell clickable :label="item.strategy.name || '未命名策略'" @click="$emit('view-strategy', item.strategy.id)">
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
                <van-button plain size="small" type="primary" @click="$emit('edit-strategy', item.strategy.id)">
                  <Edit3 :size="15" /> 编辑
                </van-button>
                <van-button plain size="small" type="danger" @click="$emit('delete-strategy', item.strategy.id)">
                  <Trash2 :size="15" /> 删除
                </van-button>
              </van-space>
            </template>
          </van-cell>
        </van-cell-group>

        <template #right>
          <van-button square type="primary" text="编辑" @click="$emit('edit-strategy', item.strategy.id)" />
          <van-button square type="danger" text="删除" @click="$emit('delete-strategy', item.strategy.id)" />
        </template>
      </van-swipe-cell>
    </div>
  </section>
</template>
