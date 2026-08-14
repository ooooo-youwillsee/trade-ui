<script setup>
// 现货网格编辑表单：采集价格区间、投入金额和网格模式。
import { Copy, RotateCcw, Save, Trash2 } from '@lucide/vue';
import {
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_SHORT,
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
} from '../strategies/common/grid';
import GridTipLabel from './GridTipLabel.vue';

// form 来自 store，组件直接使用 v-model 修改草稿。
const props = defineProps({
  calculation: { type: Object, required: true },
  form: { type: Object, required: true },
  formIsSaved: { type: Boolean, required: true },
  presets: { type: Array, required: true },
  selectedId: { type: String, required: true },
});

// 保存、复制、重置、删除等动作由页面统一处理，便于复用提示和路由逻辑。
defineEmits(['delete-strategy', 'duplicate-strategy', 'reset-form', 'save-strategy', 'set-preset']);
</script>

<template>
  <!-- 现货网格表单主体：比合约表单少杠杆和追加保证金字段。 -->
  <div class="save-page">
    <section class="save-hero">
      <p class="eyebrow">Spot Grid Plan</p>
      <h2>{{ form.name || '新现货网格' }}</h2>
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
      <van-field v-model="form.name" placeholder="输入策略名称">
        <template #label><GridTipLabel label="策略名称" tip-key="strategyName" /></template>
      </van-field>
      <van-field>
        <template #label><GridTipLabel label="方向" tip-key="direction" :side="form.side" /></template>
        <template #input>
          <van-radio-group v-model="form.side" direction="horizontal">
            <van-radio :name="CONTRACT_SIDE_LONG">做多</van-radio>
            <van-radio :name="CONTRACT_SIDE_SHORT">做空</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-field>
        <template #label>
          <GridTipLabel label="网格模式" tip-key="gridMode" :grid-mode="form.gridMode" />
        </template>
        <template #input>
          <van-radio-group v-model="form.gridMode" direction="horizontal">
            <van-radio :name="GRID_MODE_ARITHMETIC">等差</van-radio>
            <van-radio :name="GRID_MODE_GEOMETRIC">等比</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-cell center>
        <template #title>
          <GridTipLabel label="创建时立即建仓" tip-key="openOnCreate" :side="form.side" />
        </template>
        <template #right-icon><van-switch v-model="form.openOnCreate" size="22px" /></template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset title="价格区间">
      <van-field v-model.number="form.lowerPrice" type="number" input-align="right">
        <template #label><GridTipLabel label="下限价格" tip-key="lowerPrice" /></template>
      </van-field>
      <van-field v-model.number="form.upperPrice" type="number" input-align="right">
        <template #label><GridTipLabel label="上限价格" tip-key="upperPrice" /></template>
      </van-field>
      <van-field v-model.number="form.entryPrice" type="number" input-align="right">
        <template #label><GridTipLabel label="入场价格" tip-key="entryPrice" /></template>
      </van-field>
      <van-field v-model.number="form.currentPrice" type="number" input-align="right">
        <template #label><GridTipLabel label="当前价格" tip-key="currentPrice" /></template>
      </van-field>
    </van-cell-group>

    <van-cell-group inset title="资金与网格">
      <van-field v-model.number="form.gridCount" type="number" input-align="right">
        <template #label><GridTipLabel label="网格数量" tip-key="gridCount" /></template>
      </van-field>
      <van-field v-model.number="form.investment" type="number" input-align="right">
        <template #label><GridTipLabel label="投入金额" tip-key="investment" mode="spot" /></template>
      </van-field>
      <van-field v-model.number="form.feeRate" type="number" input-align="right">
        <template #label><GridTipLabel label="单边手续费率" tip-key="feeRate" /></template>
        <template #button>%</template>
      </van-field>
      <van-field v-model.number="form.minTradeQuantity" type="number" input-align="right">
        <template #label><GridTipLabel label="最小成交数量" tip-key="minTradeQuantity" /></template>
      </van-field>
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
/* 现货表单布局：保持与合约网格一致的视觉结构。 */
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
:deep(.van-field__label) {
  width: 8.5em;
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
