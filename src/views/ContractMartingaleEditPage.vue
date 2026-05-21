<script setup>
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog } from 'vant';
import ContractMartingaleForm from '../components/ContractMartingaleForm.vue';
import { useContractMartingaleStrategies } from '../composables/useContractMartingaleStrategies';
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
} = useContractMartingaleStrategies();
const { showNotice } = useNotice();

watchEffect(() => {
  if (route.name === 'contract-martingale-new') {
    addStrategy();
    return;
  }
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || form.name || '合约马丁编辑');

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
  router.push(`/contract/martingale/${response.strategy.id}`);
}

function removeStrategy(id) {
  if (!id) {
    router.push('/contract');
    return;
  }
  showConfirmDialog({
    title: '删除合约马丁',
    message: `确定删除「${selectedStrategy.value?.name || form.name || '未命名策略'}」吗？`,
    confirmButtonText: '删除',
    confirmButtonColor: '#c94f3f',
  })
    .then(() => {
      const response = deleteStrategy(id);
      router.push('/contract');
      showNotice(response?.message || '合约马丁已删除');
    })
    .catch(() => {});
}

function copyStrategy() {
  const strategy = duplicateStrategy();
  showNotice('已复制为新策略');
  router.push(`/contract/martingale/${strategy.id}/edit`);
}
</script>

<template>
  <section class="mobile-page">
    <van-nav-bar :title="currentTitle" left-arrow fixed placeholder @click-left="leaveEdit" />
    <ContractMartingaleForm
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
