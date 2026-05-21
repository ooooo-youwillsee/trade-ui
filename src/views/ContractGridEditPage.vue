<script setup>
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog } from 'vant';
import ContractGridForm from '../components/ContractGridForm.vue';
import { useContractGridStrategies } from '../composables/useContractGridStrategies';
import { useNotice } from '../composables/useNotice';

const route = useRoute();
const router = useRouter();
const {
  addStrategy,
  calculation,
  deleteStrategy,
  duplicateStrategy,
  form,
  formIsSaved,
  presets,
  resetForm,
  saveStrategy,
  selectedId,
  selectedStrategy,
  selectStrategy,
  setPreset,
} = useContractGridStrategies();
const { showNotice } = useNotice();

watchEffect(() => {
  if (route.name === 'contract-grid-new') {
    addStrategy();
    return;
  }
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || form.name || '策略编辑');

function leaveEdit() {
  resetForm();
  router.push('/contract');
}

function persistStrategy() {
  const response = saveStrategy();
  if (!response?.ok) {
    showNotice(response?.message || '保存失败', '保存失败');
    return;
  }
  showNotice('保存成功');
  router.push(`/contract/grid/${response.strategy.id}`);
}

function removeStrategy(id) {
  if (!id) {
    showConfirmDialog({
      title: '放弃草稿',
      message: '确定放弃这个未保存策略吗？',
      confirmButtonText: '放弃',
      confirmButtonColor: '#c94f3f',
    })
      .then(() => {
        router.push('/contract');
        showNotice('已放弃未保存策略');
      })
      .catch(() => {});
    return;
  }
  showConfirmDialog({
    title: '删除策略',
    message: `确定删除「${selectedStrategy.value?.name || form.name || '未命名策略'}」吗？`,
    confirmButtonText: '删除',
    confirmButtonColor: '#c94f3f',
  })
    .then(() => {
      const response = deleteStrategy(id);
      router.push('/contract');
      showNotice(response?.message || '策略已删除');
    })
    .catch(() => {});
}

function copyStrategy() {
  const strategy = duplicateStrategy();
  showNotice('已复制为新策略');
  router.push(`/contract/grid/${strategy.id}/edit`);
}
</script>

<template>
  <section class="mobile-page">
    <van-nav-bar :title="currentTitle" left-arrow fixed placeholder @click-left="leaveEdit" />

    <ContractGridForm
      :calculation="calculation"
      :form="form"
      :form-is-saved="formIsSaved"
      :presets="presets"
      :selected-id="selectedId"
      @delete-strategy="removeStrategy"
      @duplicate-strategy="copyStrategy"
      @reset-form="resetForm"
      @save-strategy="persistStrategy"
      @set-preset="setPreset"
    />
  </section>
</template>
