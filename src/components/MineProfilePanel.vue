<script setup>
// “我的”页面面板：展示本地策略数量、主题开关和数据导入导出入口。
import { Database, Download, Moon, Upload } from '@lucide/vue';
import { useTheme } from '../composables/useTheme';

// 策略数量由页面传入，组件不直接读取具体 store。
defineProps({
  strategyCount: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['export-json', 'import-json']);
const { isDark } = useTheme();

// Vant uploader 读取文件后立即上抛文件对象，并阻止组件默认上传行为。
function handleImport(fileItem) {
  if (fileItem?.file) {
    emit('import-json', fileItem.file);
  }
  return false;
}
</script>

<template>
  <!-- 个人页主体：本地数据概览、偏好设置和 JSON 数据管理。 -->
  <section class="mobile-page mine-page">
    <van-nav-bar title="我的" fixed placeholder />

    <section class="mine-summary">
      <div class="summary-icon">
        <Database :size="22" />
      </div>
      <div>
        <p class="summary-label">本地策略</p>
        <strong>{{ strategyCount }}</strong>
      </div>
    </section>

    <van-cell-group class="mine-group" inset title="偏好设置">
      <van-cell center title="暗黑主题" label="默认使用白色主题">
        <template #icon>
          <Moon class="cell-icon" :size="18" />
        </template>
        <template #right-icon>
          <van-switch v-model="isDark" size="22px" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group class="mine-group" inset title="数据管理">
      <div class="data-actions">
        <van-button round block type="primary" @click="$emit('export-json')">
          <template #icon>
            <Download :size="18" />
          </template>
          数据导出
        </van-button>

        <van-uploader class="import-uploader" accept="application/json,.json" :after-read="handleImport" :max-count="1">
          <van-button round block plain type="primary">
            <template #icon>
              <Upload :size="18" />
            </template>
            数据导入
          </van-button>
        </van-uploader>
      </div>
    </van-cell-group>
  </section>
</template>

<style scoped lang="scss">
/* 我的页面布局：用摘要卡突出本地策略数量。 */
.mine-page {
  gap: 14px;
  padding-top: 12px;
}

.mine-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid rgba(22, 199, 132, 0.22);
  border-radius: 8px;
  padding: 18px;
  background: linear-gradient(135deg, rgba(22, 199, 132, 0.13), rgba(255, 255, 255, 0.9)), var(--trade-surface);
  box-shadow: var(--trade-card-shadow);

  strong {
    display: block;
    color: var(--trade-text);
    font-family: var(--trade-number-font);
    font-size: 2rem;
    font-weight: var(--trade-weight-title);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
}

.summary-icon {
  display: grid;
  flex: 0 0 46px;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 8px;
  color: var(--trade-up);
  background: var(--trade-up-soft);
}

.summary-label {
  margin: 0 0 7px;
  color: var(--trade-muted);
  font-size: var(--trade-font-sm);
  font-weight: var(--trade-weight-medium);
}

.mine-group {
  :deep(.van-cell-group__title) {
    padding-top: 4px;
    color: var(--trade-subtle);
    font-size: var(--trade-font-xs);
    font-weight: var(--trade-weight-strong);
    letter-spacing: 0;
  }

  :deep(.van-cell) {
    align-items: center;
    padding: 14px 16px;
  }

  :deep(.van-cell__title) {
    font-weight: var(--trade-weight-medium);
  }

  :deep(.van-cell__label) {
    margin-top: 4px;
    color: var(--trade-muted);
  }
}

.cell-icon {
  margin-right: 10px;
  color: var(--trade-up);
}

.data-actions {
  display: grid;
  gap: 10px;
  padding: 14px 16px 16px;

  :deep(.van-button__content) {
    gap: 6px;
  }
}

.import-uploader {
  width: 100%;

  :deep(.van-uploader__wrapper),
  :deep(.van-uploader__input-wrapper) {
    width: 100%;
  }
}

:global(:root[data-theme='dark']) .mine-summary {
  background: linear-gradient(135deg, rgba(22, 199, 132, 0.18), rgba(21, 31, 27, 0.94)), var(--trade-surface);
}
</style>
