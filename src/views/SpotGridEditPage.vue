<script setup>
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog } from 'vant';
import SpotGridForm from '../components/SpotGridForm.vue';
import { useNotice } from '../composables/useNotice';
import { useSpotGridStrategies } from '../composables/useSpotGridStrategies';

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
} = useSpotGridStrategies();
const { showNotice } = useNotice();

watchEffect(() => {
  if (route.name === 'spot-grid-new') {
    addStrategy();
    return;
  }
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || form.name || '现货网格编辑');

function leaveEdit() {
  resetForm();
  router.push('/spot');
}

function persistStrategy() {
  const response = saveStrategy();
  if (!response?.ok) {
    showNotice(response?.message || '保存失败', '保存失败');
    return;
  }
  showNotice('保存成功');
  router.push(`/spot/grid/${response.strategy.id}`);
}

function removeStrategy(id) {
  if (!id) {
    router.push('/spot');
    return;
  }
  showConfirmDialog({
    title: '删除现货网格',
    message: `确定删除「${selectedStrategy.value?.name || form.name || '未命名策略'}」吗？`,
    confirmButtonText: '删除',
    confirmButtonColor: '#c94f3f',
  })
    .then(() => {
      const response = deleteStrategy(id);
      router.push('/spot');
      showNotice(response?.message || '现货网格已删除');
    })
    .catch(() => {});
}

function copyStrategy() {
  const strategy = duplicateStrategy();
  showNotice('已复制为新策略');
  router.push(`/spot/grid/${strategy.id}/edit`);
}
</script>

<template>
  <section class="mobile-page">
    <van-nav-bar :title="currentTitle" left-arrow fixed placeholder @click-left="leaveEdit" />
    <SpotGridForm
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
