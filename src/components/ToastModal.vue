<script setup>
import { CheckCircle2, X } from '@lucide/vue';

defineProps({
  message: {
    type: String,
    default: '',
  },
  open: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: '提示',
  },
});

defineEmits(['close']);
</script>

<template>
  <div v-if="open" class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <div class="toast-modal" role="dialog" aria-modal="true" aria-labelledby="toast-title">
      <button class="icon-button modal-close" type="button" title="关闭" @click="$emit('close')">
        <X :size="18" />
      </button>
      <CheckCircle2 :size="34" />
      <h2 id="toast-title">{{ title }}</h2>
      <p>{{ message }}</p>
      <button class="save-button" type="button" @click="$emit('close')">确定</button>
    </div>
  </div>
</template>
