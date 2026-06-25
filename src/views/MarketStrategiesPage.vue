<script setup>
// 市场策略列表页：根据当前 market 汇总网格/马丁策略卡片，并提供新增、编辑、删除入口。
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog } from 'vant';
import { ArrowLeftRight, Boxes, Flame, Trash2, TrendingDown, TrendingUp } from '@lucide/vue';
import { CONTRACT_SIDE_LONG, CONTRACT_SIDE_NEUTRAL } from '../strategies/common/grid';
import { MARTINGALE_SIDE_LONG } from '../strategies/common/martingale';
import { useContractMartingaleStrategies } from '../composables/useContractMartingaleStrategies';
import { useContractGridStrategies } from '../composables/useContractGridStrategies';
import { useContractHedgeGridStrategies } from '../composables/useContractHedgeGridStrategies';
import { useNotice } from '../composables/useNotice';
import { useSpotGridStrategies } from '../composables/useSpotGridStrategies';
import { useSpotMartingaleStrategies } from '../composables/useSpotMartingaleStrategies';
import { formatNumber, formatPercent } from '../utils/formatters';

const route = useRoute();
const router = useRouter();
const { showNotice } = useNotice();
const showAddSheet = ref(false);
const searchKeyword = ref('');

// 当前市场来自路由 meta，合约和现货复用同一个列表页。
const market = computed(() => route.meta.market || 'contract');
const isContract = computed(() => market.value === 'contract');
const title = computed(() => (isContract.value ? '合约' : '现货'));
const contractGridStore = useContractGridStrategies();
const contractHedgeGridStore = useContractHedgeGridStrategies();
const contractMartingaleStore = useContractMartingaleStrategies();
const spotGridStore = useSpotGridStrategies();
const spotMartingaleStore = useSpotMartingaleStrategies();

// 新增面板根据当前市场动态生成网格和马丁两个动作。
const addActions = computed(() => {
  const actions = [
    { name: `${title.value}网格`, type: 'grid' },
    { name: `${title.value}马丁`, type: 'martingale' },
  ];
  if (isContract.value) actions.splice(1, 0, { name: '合约对冲网格', type: 'hedge-grid' });
  return actions;
});

// 列表卡片统一成同一结构，方便模板用一套布局渲染不同策略类型。
const cards = computed(() => {
  const gridItems = isContract.value
    ? contractGridStore.strategySummaries.value.map((item) => contractGridCard(item))
    : spotGridStore.strategySummaries.value.map((item) => spotGridCard(item));
  const hedgeGridItems = isContract.value
    ? contractHedgeGridStore.strategySummaries.value.map((item) => contractHedgeGridCard(item))
    : [];
  const martingaleItems = (
    isContract.value ? contractMartingaleStore : spotMartingaleStore
  ).strategySummaries.value.map((item) => martingaleCard(item));
  return [...gridItems, ...hedgeGridItems, ...martingaleItems].sort((a, b) => b.updatedAt - a.updatedAt);
});
const normalizedSearchKeyword = computed(() => searchKeyword.value.trim().toLocaleLowerCase());
const filteredCards = computed(() => {
  if (!normalizedSearchKeyword.value) return cards.value;
  return cards.value.filter((card) =>
    (card.name || '未命名策略').toLocaleLowerCase().includes(normalizedSearchKeyword.value),
  );
});

// 根据用户选择创建对应草稿，并跳转到对应新建页。
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
  if (action.type === 'hedge-grid') {
    contractHedgeGridStore.addStrategy();
    router.push('/contract/hedge-grid/new');
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

// 删除列表卡片前弹出确认，具体删除函数由卡片构造器注入。
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

// 合约网格卡片在同一行展示入场价、当前价、单格收益和总收益。
function contractGridMetrics(strategy, calculation) {
  return [
    ['入场价', formatNumber(Number(strategy.entryPrice ?? 0), 2)],
    ['当前价', formatNumber(Number(strategy.currentPrice ?? 0), 2)],
    ['单格收益', calculation.error ? '-' : formatPercent(calculation.result?.gridProfitRate ?? 0, 3)],
    ['总收益', calculation.error ? '-' : formatNumber(calculation.result?.totalProfitLoss ?? 0, 2)],
  ];
}

function contractGridCard(item) {
  const { strategy, calculation } = item;
  return {
    id: strategy.id,
    updatedAt: strategy.updatedAt || 0,
    name: strategy.name,
    typeLabel: '合约网格',
    icon: Boxes,
    sideIcon: contractGridSideIcon(strategy.side),
    sideLabel: contractGridSideLabel(strategy.side),
    sideType: contractGridSideType(strategy.side),
    detailPath: `/contract/grid/${strategy.id}`,
    editPath: `/contract/grid/${strategy.id}/edit`,
    remove: () => contractGridStore.deleteStrategy(strategy.id),
    metricColumns: 4,
    metrics: contractGridMetrics(strategy, calculation),
  };
}

function contractHedgeGridCard(item) {
  const { strategy, calculation } = item;
  return {
    id: strategy.id,
    updatedAt: strategy.updatedAt || 0,
    name: strategy.name,
    typeLabel: '合约对冲网格',
    icon: ArrowLeftRight,
    sideIcon: null,
    sideLabel: `${strategy.longLeg?.name || '多头'} / ${strategy.shortLeg?.name || '空头'}`,
    sideType: 'primary',
    detailPath: `/contract/hedge-grid/${strategy.id}`,
    editPath: `/contract/hedge-grid/${strategy.id}/edit`,
    remove: () => contractHedgeGridStore.deleteStrategy(strategy.id),
    metrics: calculation.error
      ? [
          ['参数异常', '-'],
          ['需补', '-'],
          ['缺口', '-'],
        ]
      : [
          ['需补保证金', formatNumber(calculation.result.requiredMarginAmount, 2)],
          ['资金缺口', formatNumber(calculation.result.marginShortfall, 2)],
          ['场景收益', formatNumber(calculation.result.scenarioTotalProfitLoss, 2)],
        ],
  };
}

// 现货网格卡片展示均价、单格收益和浮动盈亏，避免出现合约风险字段。
// 合约网格列表卡片方向图标：中性模式不使用涨跌图标，避免暗示单边方向。
function contractGridSideIcon(side) {
  if (side === CONTRACT_SIDE_NEUTRAL) return null;
  return side === CONTRACT_SIDE_LONG ? TrendingUp : TrendingDown;
}

// 合约网格列表卡片方向文案，兼容做多、做空和中性三种方向。
function contractGridSideLabel(side) {
  if (side === CONTRACT_SIDE_NEUTRAL) return '中性';
  return side === CONTRACT_SIDE_LONG ? '做多' : '做空';
}

// 合约网格列表卡片方向标签颜色，中性使用主色标签。
function contractGridSideType(side) {
  if (side === CONTRACT_SIDE_NEUTRAL) return 'primary';
  return side === CONTRACT_SIDE_LONG ? 'success' : 'danger';
}

function spotGridCard(item) {
  const { strategy, calculation } = item;
  return {
    id: strategy.id,
    updatedAt: strategy.updatedAt || 0,
    name: strategy.name,
    typeLabel: '现货网格',
    icon: Boxes,
    sideIcon: strategy.side === CONTRACT_SIDE_LONG ? TrendingUp : TrendingDown,
    sideLabel: strategy.side === CONTRACT_SIDE_LONG ? '做多' : '做空',
    sideType: strategy.side === CONTRACT_SIDE_LONG ? 'success' : 'danger',
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

// 马丁卡片根据当前市场切换强平价或止盈价展示口径。
function martingaleCard(item) {
  const { strategy, calculation } = item;
  const mode = isContract.value ? '合约' : '现货';
  return {
    id: strategy.id,
    updatedAt: strategy.updatedAt || 0,
    name: strategy.name,
    typeLabel: `${mode}马丁`,
    icon: Flame,
    sideIcon: strategy.side === MARTINGALE_SIDE_LONG ? TrendingUp : TrendingDown,
    sideLabel: strategy.side === MARTINGALE_SIDE_LONG ? '做多' : '做空',
    sideType: strategy.side === MARTINGALE_SIDE_LONG ? 'success' : 'danger',
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
  <!-- 策略列表页：顶部新增按钮、空状态、策略卡片列表和新增动作面板。 -->
  <section class="mobile-page market-home">
    <van-nav-bar class="app-nav-bar" :title="title" fixed placeholder>
      <template #right>
        <van-button class="nav-add-button" icon="plus" size="small" type="primary" round @click="showAddSheet = true">
          新增
        </van-button>
      </template>
    </van-nav-bar>

    <van-search v-model="searchKeyword" class="strategy-search" clearable placeholder="搜索策略名称" shape="round" />

    <van-empty v-if="cards.length === 0" :description="`暂无${title}策略`" image="search">
      <van-button round type="primary" @click="showAddSheet = true">创建第一个策略</van-button>
    </van-empty>

    <van-empty v-else-if="filteredCards.length === 0" description="未找到匹配策略" image="search">
      <van-button round type="primary" @click="searchKeyword = ''">清空搜索</van-button>
    </van-empty>

    <div v-else class="strategy-list">
      <van-cell-group
        v-for="card in filteredCards"
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
            <van-tag plain :type="card.sideType">
              <component :is="card.sideIcon" v-if="card.sideIcon" :size="14" />
              {{ card.sideLabel }}
            </van-tag>
          </template>
        </van-cell>
        <van-grid
          :class="{ 'contract-grid-metrics': card.metricColumns === 4 }"
          :border="false"
          :column-num="card.metricColumns || 3"
        >
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
/* 市场首页布局：卡片列表按更新时间排序，适合移动端快速浏览。 */
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

.strategy-search {
  padding: 0;
  background: transparent;
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

.contract-grid-metrics .list-metric {
  font-size: var(--trade-font-xs);
}
</style>
