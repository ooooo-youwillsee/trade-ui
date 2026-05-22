import { createRouter, createWebHashHistory } from 'vue-router';
import ContractGridDetailPage from '../views/ContractGridDetailPage.vue';
import ContractGridEditPage from '../views/ContractGridEditPage.vue';
import ContractMartingaleDetailPage from '../views/ContractMartingaleDetailPage.vue';
import ContractMartingaleEditPage from '../views/ContractMartingaleEditPage.vue';
import MarketStrategiesPage from '../views/MarketStrategiesPage.vue';
import MinePage from '../views/MinePage.vue';
import SpotGridDetailPage from '../views/SpotGridDetailPage.vue';
import SpotGridEditPage from '../views/SpotGridEditPage.vue';
import SpotMartingaleDetailPage from '../views/SpotMartingaleDetailPage.vue';
import SpotMartingaleEditPage from '../views/SpotMartingaleEditPage.vue';
import StockPage from '../views/StockPage.vue';

// 路由表集中维护所有页面入口，meta.tab 用于底部导航高亮。
const router = createRouter({
  // Hash history 适合 PWA 和静态托管，刷新时不依赖后端路由回源。
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    // 默认进入合约策略市场，这是当前应用的主要工作台。
    { path: '/', redirect: '/contract' },
    // 合约策略列表：通过 meta.market 告诉页面读取合约策略 store。
    {
      path: '/contract',
      name: 'contract-strategies',
      component: MarketStrategiesPage,
      meta: { tab: 'contract', market: 'contract' },
    },
    // 合约网格的新建、详情、编辑三段式路由。
    {
      path: '/contract/grid/new',
      name: 'contract-grid-new',
      component: ContractGridEditPage,
      meta: { tab: 'contract' },
    },
    {
      path: '/contract/grid/:id',
      name: 'contract-grid-detail',
      component: ContractGridDetailPage,
      meta: { tab: 'contract' },
    },
    {
      path: '/contract/grid/:id/edit',
      name: 'contract-grid-edit',
      component: ContractGridEditPage,
      meta: { tab: 'contract' },
    },
    // 合约马丁的新建、详情、编辑三段式路由。
    {
      path: '/contract/martingale/new',
      name: 'contract-martingale-new',
      component: ContractMartingaleEditPage,
      meta: { tab: 'contract' },
    },
    {
      path: '/contract/martingale/:id',
      name: 'contract-martingale-detail',
      component: ContractMartingaleDetailPage,
      meta: { tab: 'contract' },
    },
    {
      path: '/contract/martingale/:id/edit',
      name: 'contract-martingale-edit',
      component: ContractMartingaleEditPage,
      meta: { tab: 'contract' },
    },
    // 现货策略列表：复用列表页面，通过 meta.market 切换数据源。
    {
      path: '/spot',
      name: 'spot-strategies',
      component: MarketStrategiesPage,
      meta: { tab: 'spot', market: 'spot' },
    },
    // 现货网格的新建、详情、编辑三段式路由。
    {
      path: '/spot/grid/new',
      name: 'spot-grid-new',
      component: SpotGridEditPage,
      meta: { tab: 'spot' },
    },
    {
      path: '/spot/grid/:id',
      name: 'spot-grid-detail',
      component: SpotGridDetailPage,
      meta: { tab: 'spot' },
    },
    {
      path: '/spot/grid/:id/edit',
      name: 'spot-grid-edit',
      component: SpotGridEditPage,
      meta: { tab: 'spot' },
    },
    // 现货马丁的新建、详情、编辑三段式路由。
    {
      path: '/spot/martingale/new',
      name: 'spot-martingale-new',
      component: SpotMartingaleEditPage,
      meta: { tab: 'spot' },
    },
    {
      path: '/spot/martingale/:id',
      name: 'spot-martingale-detail',
      component: SpotMartingaleDetailPage,
      meta: { tab: 'spot' },
    },
    {
      path: '/spot/martingale/:id/edit',
      name: 'spot-martingale-edit',
      component: SpotMartingaleEditPage,
      meta: { tab: 'spot' },
    },
    // 股票和我的页面是底部导航的独立入口。
    { path: '/stock', name: 'stock', component: StockPage, meta: { tab: 'stock' } },
    { path: '/mine', name: 'mine', component: MinePage, meta: { tab: 'mine' } },
  ],
});

export default router;
