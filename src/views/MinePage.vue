<script setup>
// “我的”页面：连接导入导出逻辑和展示面板，当前导入导出针对合约网格策略。
import { useRouter } from 'vue-router';
import MineProfilePanel from '../components/MineProfilePanel.vue';
import { useContractGridStrategies } from '../composables/useContractGridStrategies';
import { useNotice } from '../composables/useNotice';

const router = useRouter();
const { exportStrategies, importStrategies, strategies } = useContractGridStrategies();
const { showNotice } = useNotice();

// 将策略 JSON 写成浏览器下载文件，文件名包含当天日期方便归档。
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

// 导入 JSON 后复用 store 校验结果，成功时返回合约策略列表。
async function importJson(file) {
  const response = importStrategies(await file.text());
  showNotice(response.message, response.ok ? '导入成功' : '导入失败');
  if (response.ok) {
    router.push('/contract');
  }
}
</script>

<template>
  <!-- 页面只承载数据流，具体 UI 交给 MineProfilePanel。 -->
  <MineProfilePanel :strategy-count="strategies.length" @export-json="exportJson" @import-json="importJson" />
</template>
