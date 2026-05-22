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

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/contract' },
    {
      path: '/contract',
      name: 'contract-strategies',
      component: MarketStrategiesPage,
      meta: { tab: 'contract', market: 'contract' },
    },
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
    {
      path: '/spot',
      name: 'spot-strategies',
      component: MarketStrategiesPage,
      meta: { tab: 'spot', market: 'spot' },
    },
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
    { path: '/stock', name: 'stock', component: StockPage, meta: { tab: 'stock' } },
    { path: '/mine', name: 'mine', component: MinePage, meta: { tab: 'mine' } },
  ],
});

export default router;
