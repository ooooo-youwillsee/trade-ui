<script setup>
import { Download, Upload } from '@lucide/vue';

defineProps({
  strategyCount: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['export-json', 'import-json']);

function handleImport(event) {
  const file = event.target.files?.[0];
  if (file) {
    event.target.value = '';
    emit('import-json', file);
  }
}
</script>

<template>
  <section class="mobile-page">
    <van-nav-bar title="我的" fixed placeholder />

    <div class="panel profile-panel">
      <div class="profile-stat">
        <span>本地策略</span>
        <strong>{{ strategyCount }}</strong>
      </div>

      <van-button round block type="primary" @click="$emit('export-json')">
        <Download :size="18" />
        数据导出
      </van-button>

      <label class="profile-action">
        <Upload :size="18" />
        数据导入
        <input type="file" accept="application/json,.json" @change="handleImport" />
      </label>
    </div>
  </section>
</template>
