import { createRouter, createWebHashHistory } from 'vue-router';
import ContractDetailView from '../views/ContractDetailView.vue';
import ContractEditView from '../views/ContractEditView.vue';
import ContractListView from '../views/ContractListView.vue';
import MineView from '../views/MineView.vue';
import StockGridView from '../views/StockGridView.vue';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/contract' },
    { path: '/contract', name: 'contract-list', component: ContractListView, meta: { tab: 'contract' } },
    { path: '/contract/new', name: 'contract-new', component: ContractEditView, meta: { tab: 'contract' } },
    { path: '/contract/:id', name: 'contract-detail', component: ContractDetailView, meta: { tab: 'contract' } },
    { path: '/contract/:id/edit', name: 'contract-edit', component: ContractEditView, meta: { tab: 'contract' } },
    { path: '/stock', name: 'stock-grid', component: StockGridView, meta: { tab: 'stock' } },
    { path: '/mine', name: 'mine', component: MineView, meta: { tab: 'mine' } },
  ],
});

export default router;
