<script setup>
import { Download } from '@lucide/vue';
import { useTheme } from '../composables/useTheme';

defineProps({
  strategyCount: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['export-json', 'import-json']);
const { isDark } = useTheme();

function handleImport(fileItem) {
  if (fileItem?.file) {
    emit('import-json', fileItem.file);
  }
  return false;
}
</script>

<template>
  <section class="mobile-page">
    <van-nav-bar title="我的" fixed placeholder />

    <van-cell-group inset title="偏好设置">
      <van-cell center title="暗黑主题" label="默认使用白色主题">
        <template #right-icon>
          <van-switch v-model="isDark" size="22px" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset title="数据管理">
      <van-cell title="本地策略" :value="String(strategyCount)" />

      <van-button round block type="primary" @click="$emit('export-json')">
        <Download :size="18" />
        数据导出
      </van-button>

      <van-uploader accept="application/json,.json" :after-read="handleImport" :max-count="1">
        <van-button round block plain type="primary" icon="upgrade">数据导入</van-button>
      </van-uploader>
    </van-cell-group>
  </section>
</template>
