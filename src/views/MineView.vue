<script setup>
import { useRouter } from 'vue-router';
import MinePage from '../components/MinePage.vue';
import { useContractGridStrategies } from '../composables/useContractGridStrategies';
import { useNotice } from '../composables/useNotice';

const router = useRouter();
const { exportStrategies, importStrategies, strategies } = useContractGridStrategies();
const { showNotice } = useNotice();

function exportJson() {
  const blob = new Blob([exportStrategies()], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `contract-grid-strategies-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showNotice('JSON 数据已导出');
}

async function importJson(file) {
  const response = importStrategies(await file.text());
  showNotice(response.message, response.ok ? '导入成功' : '导入失败');
  if (response.ok) {
    router.push('/contract');
  }
}
</script>

<template>
  <MinePage :strategy-count="strategies.length" @export-json="exportJson" @import-json="importJson" />
</template>
