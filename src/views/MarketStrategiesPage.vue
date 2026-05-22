<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog } from 'vant';
import { Boxes, Flame, Trash2, TrendingDown, TrendingUp } from '@lucide/vue';
import { CONTRACT_SIDE_LONG } from '../strategies/common/grid';
import { MARTINGALE_SIDE_LONG } from '../strategies/common/martingale';
import { useContractMartingaleStrategies } from '../composables/useContractMartingaleStrategies';
import { useContractGridStrategies } from '../composables/useContractGridStrategies';
import { useNotice } from '../composables/useNotice';
import { useSpotGridStrategies } from '../composables/useSpotGridStrategies';
import { useSpotMartingaleStrategies } from '../composables/useSpotMartingaleStrategies';
import { formatNumber, formatPercent } from '../utils/formatters';

const route = useRoute();
const router = useRouter();
const { showNotice } = useNotice();
const showAddSheet = ref(false);

const market = computed(() => route.meta.market || 'contract');
const isContract = computed(() => market.value === 'contract');
const title = computed(() => (isContract.value ? '合约' : '现货'));
const contractGridStore = useContractGridStrategies();
const contractMartingaleStore = useContractMartingaleStrategies();
const spotGridStore = useSpotGridStrategies();
const spotMartingaleStore = useSpotMartingaleStrategies();

const addActions = computed(() => [
  { name: `${title.value}网格`, type: 'grid' },
  { name: `${title.value}马丁`, type: 'martingale' },
]);

const cards = computed(() => {
  const gridItems = isContract.value
    ? contractGridStore.strategySummaries.value.map((item) => contractGridCard(item))
    : spotGridStore.strategySummaries.value.map((item) => spotGridCard(item));
  const martingaleItems = (
    isContract.value ? contractMartingaleStore : spotMartingaleStore
  ).strategySummaries.value.map((item) => martingaleCard(item));
  return [...gridItems, ...martingaleItems].sort((a, b) => b.updatedAt - a.updatedAt);
});

function openAdd(action) {
  showAddSheet.value = false;
  if (action.type === 'grid') {
    if (isContract.value) {
      contractGridStore.addStrategy();
      router.push('/contract/grid/new');
      return;
    }
    spotGridStore.addStrategy();
    router.push('/spot/grid/new');
    return;
  }
  const martingaleStore = isContract.value ? contractMartingaleStore : spotMartingaleStore;
  martingaleStore.addStrategy();
  router.push(`/${market.value}/martingale/new`);
}

function openCard(card) {
  router.push(card.detailPath);
}

function editCard(card) {
  router.push(card.editPath);
}

function removeCard(card) {
  showConfirmDialog({
    title: '删除策略',
    message: `确定删除「${card.name || '未命名策略'}」吗？`,
    confirmButtonText: '删除',
    confirmButtonColor: '#c94f3f',
  })
    .then(() => {
      const response = card.remove();
      showNotice(response?.message || '策略已删除');
    })
    .catch(() => {});
}

function contractGridCard(item) {
  const { strategy, calculation } = item;
  return {
    id: strategy.id,
    updatedAt: strategy.updatedAt || 0,
    name: strategy.name,
    typeLabel: '合约网格',
    icon: Boxes,
    sideLong: strategy.side === CONTRACT_SIDE_LONG,
    detailPath: `/contract/grid/${strategy.id}`,
    editPath: `/contract/grid/${strategy.id}/edit`,
    remove: () => contractGridStore.deleteStrategy(strategy.id),
    metrics: calculation.error
      ? [
          ['参数异常', '-'],
          ['强平价', '-'],
          ['收益', '-'],
        ]
      : [
          ['强平价', formatNumber(calculation.result.estimatedGridLiquidationPrice, 2)],
          ['单格收益', formatPercent(calculation.result.gridProfitRate, 3)],
          ['浮盈亏', formatNumber(calculation.result.floatingProfitLoss, 2)],
        ],
  };
}

function spotGridCard(item) {
  const { strategy, calculation } = item;
  return {
    id: strategy.id,
    updatedAt: strategy.updatedAt || 0,
    name: strategy.name,
    typeLabel: '现货网格',
    icon: Boxes,
    sideLong: strategy.side === CONTRACT_SIDE_LONG,
    detailPath: `/spot/grid/${strategy.id}`,
    editPath: `/spot/grid/${strategy.id}/edit`,
    remove: () => spotGridStore.deleteStrategy(strategy.id),
    metrics: calculation.error
      ? [
          ['参数异常', '-'],
          ['均价', '-'],
          ['收益', '-'],
        ]
      : [
          ['持仓均价', formatNumber(calculation.result.averageEntryPrice, 2)],
          ['单格收益', formatPercent(calculation.result.gridProfitRate, 3)],
          ['浮盈亏', formatNumber(calculation.result.floatingProfitLoss, 2)],
        ],
  };
}

function martingaleCard(item) {
  const { strategy, calculation } = item;
  const mode = isContract.value ? '合约' : '现货';
  return {
    id: strategy.id,
    updatedAt: strategy.updatedAt || 0,
    name: strategy.name,
    typeLabel: `${mode}马丁`,
    icon: Flame,
    sideLong: strategy.side === MARTINGALE_SIDE_LONG,
    detailPath: `/${market.value}/martingale/${strategy.id}`,
    editPath: `/${market.value}/martingale/${strategy.id}/edit`,
    remove: () => (isContract.value ? contractMartingaleStore : spotMartingaleStore).deleteStrategy(strategy.id),
    metrics: calculation.error
      ? [
          ['参数异常', '-'],
          ['层数', '-'],
          ['止盈', '-'],
        ]
      : [
          ['可执行层数', `${calculation.result.executableLayers}/${calculation.result.layers.length}`],
          ['资金需求', formatNumber(calculation.result.maxCapitalRequired, 2)],
          [
            isContract.value ? '强平价' : '止盈价',
            formatNumber(
              isContract.value ? calculation.result.liquidationPrice : calculation.result.maxTakeProfitPrice,
              2,
            ),
          ],
        ],
  };
}
</script>

<template>
  <section class="mobile-page market-home">
    <van-nav-bar class="app-nav-bar" :title="title" fixed placeholder>
      <template #right>
        <van-button class="nav-add-button" icon="plus" size="small" type="primary" round @click="showAddSheet = true">
          新增
        </van-button>
      </template>
    </van-nav-bar>

    <van-empty v-if="cards.length === 0" :description="`暂无${title}策略`" image="search">
      <van-button round type="primary" @click="showAddSheet = true">创建第一个策略</van-button>
    </van-empty>

    <div v-else class="strategy-list">
      <van-cell-group
        v-for="card in cards"
        :key="`${card.typeLabel}-${card.id}`"
        class="strategy-card"
        inset
        role="button"
        tabindex="0"
        @click="openCard(card)"
        @keydown.enter="openCard(card)"
      >
        <van-cell clickable :label="card.name || '未命名策略'">
          <template #title>
            <span class="strategy-title">
              <component :is="card.icon" :size="18" />
              {{ card.name || '未命名策略' }}
            </span>
          </template>
          <template #value>
            <van-tag plain type="primary">{{ card.typeLabel }}</van-tag>
          </template>
        </van-cell>
        <van-cell>
          <template #title>
            <van-tag plain :type="card.sideLong ? 'success' : 'danger'">
              <TrendingUp v-if="card.sideLong" :size="14" />
              <TrendingDown v-else :size="14" />
              {{ card.sideLong ? '做多' : '做空' }}
            </van-tag>
          </template>
        </van-cell>
        <van-grid :border="false" :column-num="3">
          <van-grid-item v-for="[label, value] in card.metrics" :key="label" :text="label">
            <template #icon>
              <strong class="list-metric">{{ value }}</strong>
            </template>
          </van-grid-item>
        </van-grid>
        <van-cell>
          <template #value>
            <van-space>
              <van-button plain size="small" type="primary" @click.stop="editCard(card)">编辑</van-button>
              <van-button plain size="small" type="danger" @click.stop="removeCard(card)">删除</van-button>
            </van-space>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <van-action-sheet
      v-model:show="showAddSheet"
      :actions="addActions"
      cancel-text="取消"
      close-on-click-action
      @select="openAdd"
    />
  </section>
</template>

<style scoped lang="scss">
.market-home {
  gap: 12px;
}

.app-nav-bar {
  --van-nav-bar-background: var(--trade-nav-bg);

  &::after {
    border-bottom: 0;
  }

  :deep(.van-nav-bar__content) {
    box-shadow: var(--trade-nav-shadow);
    backdrop-filter: blur(12px);
  }
}

.nav-add-button {
  min-width: 72px;
  box-shadow: 0 7px 18px rgba(18, 185, 129, 0.24);
}

.strategy-list {
  display: grid;
  gap: 12px;
  padding-bottom: 12px;
}

.strategy-card {
  cursor: pointer;
}

.strategy-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  color: var(--trade-text);
  font-weight: var(--trade-weight-title);
  overflow-wrap: anywhere;
}

.list-metric {
  display: block;
  color: var(--trade-text);
  font-family: var(--trade-number-font);
  font-size: var(--trade-font-md);
  font-weight: var(--trade-weight-strong);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
</style>
