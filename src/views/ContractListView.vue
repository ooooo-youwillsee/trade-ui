<script setup>
import { useRouter } from 'vue-router';
import { showConfirmDialog } from 'vant';
import ContractStrategyList from '../components/ContractStrategyList.vue';
import { useContractGridStrategies } from '../composables/useContractGridStrategies';
import { useNotice } from '../composables/useNotice';

const router = useRouter();
const { addStrategy, deleteStrategy, strategies, strategySummaries } = useContractGridStrategies();
const { showNotice } = useNotice();

function createStrategy() {
  addStrategy();
  router.push('/contract/new');
}

function removeStrategy(id) {
  const strategy = strategies.value.find((item) => item.id === id);
  showConfirmDialog({
    title: '删除策略',
    message: `确定删除「${strategy?.name || '未命名策略'}」吗？`,
    confirmButtonText: '删除',
    confirmButtonColor: '#c94f3f',
  })
    .then(() => {
      const response = deleteStrategy(id);
      showNotice(response?.message || '策略已删除');
    })
    .catch(() => {});
}
</script>

<template>
  <ContractStrategyList
    :strategy-summaries="strategySummaries"
    @add-strategy="createStrategy"
    @delete-strategy="removeStrategy"
    @edit-strategy="(id) => router.push(`/contract/${id}/edit`)"
    @view-strategy="(id) => router.push(`/contract/${id}`)"
  />
</template>
