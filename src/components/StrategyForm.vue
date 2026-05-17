<script setup>
import { Copy, RotateCcw, Save, Trash2 } from '@lucide/vue';
import {
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_SHORT,
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
} from '../contractGrid';

defineProps({
  calculation: {
    type: Object,
    required: true,
  },
  form: {
    type: Object,
    required: true,
  },
  formIsSaved: {
    type: Boolean,
    required: true,
  },
  presets: {
    type: Array,
    required: true,
  },
  selectedId: {
    type: String,
    required: true,
  },
});

defineEmits(['delete-strategy', 'duplicate-strategy', 'reset-form', 'save-strategy', 'set-preset']);
</script>

<template>
  <div class="save-page">
    <section class="save-hero">
      <p class="eyebrow">Fresh Grid Plan</p>
      <h2>{{ form.name || '新合约网格' }}</h2>
      <span :class="['save-pill', { dirty: !formIsSaved }]">
        {{ formIsSaved ? '已保存' : '待保存' }}
      </span>
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
            <van-radio :name="CONTRACT_SIDE_LONG">做多</van-radio>
            <van-radio :name="CONTRACT_SIDE_SHORT">做空</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-field label="网格模式">
        <template #input>
          <van-radio-group v-model="form.gridMode" direction="horizontal">
            <van-radio :name="GRID_MODE_ARITHMETIC">等差</van-radio>
            <van-radio :name="GRID_MODE_GEOMETRIC">等比</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-cell center title="创建时立即建仓">
        <template #right-icon>
          <van-switch v-model="form.openOnCreate" size="22px" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset title="价格区间">
      <van-field v-model.number="form.lowerPrice" label="下限价格" type="number" input-align="right" />
      <van-field v-model.number="form.upperPrice" label="上限价格" type="number" input-align="right" />
      <van-field v-model.number="form.entryPrice" label="入场价格" type="number" input-align="right" />
      <van-field v-model.number="form.currentPrice" label="当前价格" type="number" input-align="right" />
    </van-cell-group>

    <van-cell-group inset title="资金与网格">
      <van-field v-model.number="form.gridCount" label="网格数量" type="number" input-align="right" />
      <van-field v-model.number="form.leverage" label="杠杆倍数" type="number" input-align="right" />
      <van-field v-model.number="form.investment" label="初始保证金" type="number" input-align="right" />
      <van-field v-model.number="form.additionalInvestment" label="追加保证金" type="number" input-align="right" />
    </van-cell-group>

    <div class="save-actions">
      <van-button icon-position="left" round type="primary" :disabled="Boolean(calculation.error)" @click="$emit('save-strategy')">
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
