<script setup>
// 现货马丁编辑页：管理新建、保存、复制和删除动作。
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog } from 'vant';
import SpotMartingaleForm from '../components/SpotMartingaleForm.vue';
import { useNotice } from '../composables/useNotice';
import { useSpotMartingaleStrategies } from '../composables/useSpotMartingaleStrategies';

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
} = useSpotMartingaleStrategies();
const { showNotice } = useNotice();

// 新建时创建草稿，编辑时根据路由 id 选中策略。
watchEffect(() => {
  if (route.name === 'spot-martingale-new') {
    addStrategy();
    return;
  }
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || form.name || '现货马丁编辑');

// 离开编辑页时恢复表单，避免草稿污染当前 store。
function leaveEdit() {
  resetForm();
  router.push('/spot');
}

// 保存成功跳转详情页，保存失败展示校验信息。
function persistStrategy() {
  const response = saveStrategy();
  if (!response?.ok) {
    showNotice(response?.message || '保存失败', '保存失败');
    return;
  }
  showNotice('保存成功');
  router.push(`/spot/martingale/${response.strategy.id}`);
}

// 已保存策略删除前二次确认，未保存策略直接返回。
function removeStrategy(id) {
  if (!id) {
    router.push('/spot');
    return;
  }
  showConfirmDialog({
    title: '删除现货马丁',
    message: `确定删除「${selectedStrategy.value?.name || form.name || '未命名策略'}」吗？`,
    confirmButtonText: '删除',
    confirmButtonColor: '#c94f3f',
  })
    .then(() => {
      const response = deleteStrategy(id);
      router.push('/spot');
      showNotice(response?.message || '现货马丁已删除');
    })
    .catch(() => {});
}

// 复制策略后进入新副本编辑页。
function copyStrategy() {
  const strategy = duplicateStrategy();
  showNotice('已复制为新策略');
  router.push(`/spot/martingale/${strategy.id}/edit`);
}
</script>

<template>
  <!-- 现货马丁编辑页主体：顶部导航和表单组件。 -->
  <section class="mobile-page">
    <van-nav-bar :title="currentTitle" left-arrow fixed placeholder @click-left="leaveEdit" />
    <SpotMartingaleForm
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
