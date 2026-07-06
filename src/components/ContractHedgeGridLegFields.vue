<script setup>
import {
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
} from '../strategies/contract/hedgeGrid';

defineProps({
  leg: {
    type: Object,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
});

</script>

<template>
  <van-cell-group inset :title="title">
    <van-field v-model="leg.name" label="合约名称" input-align="right" />
    <van-field v-model.number="leg.lowerPrice" label="下限价格" type="number" input-align="right" />
    <van-field v-model.number="leg.upperPrice" label="上限价格" type="number" input-align="right" />
    <van-field v-model.number="leg.entryPrice" label="入场价格" type="number" input-align="right" />
    <van-field v-model.number="leg.currentPrice" label="当前价格" type="number" input-align="right" />
    <van-field label="网格模式">
      <template #input>
        <van-radio-group v-model="leg.gridMode" direction="horizontal">
          <van-radio :name="GRID_MODE_ARITHMETIC">等差</van-radio>
          <van-radio :name="GRID_MODE_GEOMETRIC">等比</van-radio>
        </van-radio-group>
      </template>
    </van-field>
    <van-cell center title="创建时建仓">
      <template #right-icon>
        <van-switch v-model="leg.openOnCreate" size="22px" />
      </template>
    </van-cell>
    <van-field v-model.number="leg.gridCount" label="网格数量" type="number" input-align="right" />
    <van-field v-model.number="leg.leverage" label="杠杆倍数" type="number" input-align="right" />
    <van-field v-model.number="leg.investment" label="初始保证金" type="number" input-align="right" />
    <van-field v-model.number="leg.additionalInvestment" label="追加保证金" type="number" input-align="right" />
    <van-field v-model.number="leg.minTradeQuantity" label="最小成交数量" type="number" input-align="right" />
  </van-cell-group>
</template>
