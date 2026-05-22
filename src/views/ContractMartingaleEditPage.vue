<script setup>
// 合约马丁编辑页：处理新建、保存、复制、删除和路由跳转。
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

// 新建页创建草稿；编辑页根据路由 id 回填已有策略。
watchEffect(() => {
  if (route.name === 'contract-martingale-new') {
    addStrategy();
    return;
  }
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || form.name || '合约马丁编辑');

// 返回列表前恢复 store 表单，避免残留未保存修改。
function leaveEdit() {
  resetForm();
  router.push('/contract');
}

// 保存后进入详情页，校验失败则通过全局提示反馈。
function persistStrategy() {
  const response = saveStrategy();
  if (!response?.ok) {
    showNotice(response?.message || '保存失败', '保存失败');
    return;
  }
  showNotice('保存成功');
  router.push(`/contract/martingale/${response.strategy.id}`);
}

// 已保存策略删除前弹确认，未保存草稿直接返回列表。
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

// 复制策略会立即创建新策略并进入编辑状态。
function copyStrategy() {
  const strategy = duplicateStrategy();
  showNotice('已复制为新策略');
  router.push(`/contract/martingale/${strategy.id}/edit`);
}
</script>

<template>
  <!-- 合约马丁编辑页主体：导航和表单组件分离。 -->
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
