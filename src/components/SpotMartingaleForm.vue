<script setup>
// 现货马丁编辑表单：配置补仓层级、触发幅度和资金上限。
import { Copy, RotateCcw, Save, Trash2 } from '@lucide/vue';
import { MARTINGALE_SIDE_LONG, MARTINGALE_SIDE_SHORT } from '../strategies/common/martingale';

// form 为响应式草稿，父页面负责保存和删除等副作用。
defineProps({
  calculation: { type: Object, required: true },
  form: { type: Object, required: true },
  formIsSaved: { type: Boolean, required: true },
  presets: { type: Array, required: true },
  selectedId: { type: String, required: true },
});

// 操作事件全部上抛，保持表单组件无路由依赖。
defineEmits(['delete-strategy', 'duplicate-strategy', 'reset-form', 'save-strategy', 'set-preset']);
</script>

<template>
  <!-- 现货马丁表单主体：不展示合约专属的杠杆风险结果。 -->
  <div class="save-page">
    <section class="save-hero">
      <p class="eyebrow">Spot Martingale</p>
      <h2>{{ form.name || '新现货马丁' }}</h2>
      <span :class="['save-pill', { dirty: !formIsSaved }]">{{ formIsSaved ? '已保存' : '待保存' }}</span>
    </section>

    <van-notice-bar
      v-if="calculation.error"
      color="#9d2e1e"
      background="#fff3ef"
      left-icon="warning-o"
      :text="calculation.error"
    />

    <van-cell-group inset title="快捷预设">
      <div class="preset-chips">
        <van-button
          v-for="preset in presets"
          :key="preset.label"
          plain
          round
          size="small"
          type="primary"
          @click="$emit('set-preset', preset.value)"
        >
          {{ preset.label }}
        </van-button>
      </div>
    </van-cell-group>

    <van-cell-group inset title="基础信息">
      <van-field v-model="form.name" label="策略名称" placeholder="输入策略名称" />
      <van-field label="方向">
        <template #input>
          <van-radio-group v-model="form.side" direction="horizontal">
            <van-radio :name="MARTINGALE_SIDE_LONG">做多</van-radio>
            <van-radio :name="MARTINGALE_SIDE_SHORT">做空</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-field v-model.number="form.currentPrice" label="当前价" type="number" input-align="right" />
      <van-field v-model.number="form.firstOrderAmount" label="首单金额" type="number" input-align="right" />
      <van-field v-model.number="form.multiplier" label="加仓倍数" type="number" input-align="right" />
      <van-field v-model.number="form.maxLayers" label="最大层数" type="number" input-align="right" />
      <van-field v-model.number="form.triggerPercent" label="触发幅度 %" type="number" input-align="right" />
      <van-field v-model.number="form.takeProfitPercent" label="止盈比例 %" type="number" input-align="right" />
      <van-field v-model.number="form.totalCapital" label="总资金上限" type="number" input-align="right" />
    </van-cell-group>

    <van-cell-group inset title="执行规则">
      <van-cell center title="首单已成交">
        <template #right-icon><van-switch v-model="form.includeInitialOrder" size="22px" /></template>
      </van-cell>
      <van-cell center title="按总资金限制层级">
        <template #right-icon><van-switch v-model="form.restrictByCapital" size="22px" /></template>
      </van-cell>
    </van-cell-group>

    <div class="save-actions">
      <van-button
        icon-position="left"
        round
        type="primary"
        :disabled="Boolean(calculation.error)"
        @click="$emit('save-strategy')"
      >
        <template #icon><Save :size="17" /></template>
        保存策略
      </van-button>
      <van-button round plain type="primary" @click="$emit('duplicate-strategy')">
        <template #icon><Copy :size="17" /></template>
        复制
      </van-button>
      <van-button round plain @click="$emit('reset-form')">
        <template #icon><RotateCcw :size="17" /></template>
        重置
      </van-button>
      <van-button round plain type="danger" @click="$emit('delete-strategy', selectedId)">
        <template #icon><Trash2 :size="17" /></template>
        删除
      </van-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* 保存页布局：操作按钮在移动端保持两列，主按钮独占一行。 */
.save-page {
  display: grid;
  gap: 12px;
  padding-top: 12px;
}
.save-hero {
  border: 1px solid rgba(22, 199, 132, 0.22);
  border-radius: 8px;
  padding: 18px;
  background: var(--trade-save-bg);
  box-shadow: var(--trade-card-shadow);
}
.save-hero h2 {
  margin: 4px 0 0;
  color: var(--trade-text);
  font-size: var(--trade-font-display);
  font-weight: var(--trade-weight-title);
  line-height: var(--trade-line-tight);
  overflow-wrap: anywhere;
}
.eyebrow {
  margin: 0;
  color: var(--trade-subtle);
  font-size: var(--trade-font-xs);
  font-weight: var(--trade-weight-strong);
  letter-spacing: 0;
  text-transform: uppercase;
}
.save-pill {
  display: inline-flex;
  margin-top: 10px;
  border-radius: 999px;
  padding: 5px 10px;
  color: var(--trade-up);
  background: var(--trade-up-soft);
  font-size: var(--trade-font-xs);
  font-weight: var(--trade-weight-strong);
}
.save-pill.dirty {
  color: var(--trade-warn);
  background: var(--trade-warn-soft);
}
.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px 14px;
}
.save-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 4px 4px 16px;
}
.save-actions :deep(.van-button:first-child) {
  grid-column: 1 / -1;
}
</style>
