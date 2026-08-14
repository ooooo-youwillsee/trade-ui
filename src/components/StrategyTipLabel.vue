<script setup>
import { ref } from 'vue';
import { CircleHelp } from '@lucide/vue';

defineProps({
  label: { type: String, default: '' },
  tip: { type: String, required: true },
});

const show = ref(false);
const buttonRef = ref(null);
const placement = ref('top');
const popoverWidth = ref(300);

// 打开前根据图标位置选择弹层方向和可用宽度，避免移动端靠边标签被裁切。
function openTip() {
  const button = buttonRef.value;
  if (button) {
    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const preferredWidth = Math.min(300, viewportWidth - 32);
    const centeredLeft = rect.left + rect.width / 2 - preferredWidth / 2;
    const centeredRight = centeredLeft + preferredWidth;

    if (centeredLeft < 16) {
      placement.value = 'right';
      popoverWidth.value = Math.max(160, Math.min(300, viewportWidth - rect.right - 20));
    } else if (centeredRight > viewportWidth - 16) {
      placement.value = 'left';
      popoverWidth.value = Math.max(160, Math.min(300, rect.left - 20));
    } else {
      placement.value = 'top';
      popoverWidth.value = preferredWidth;
    }
  }
  show.value = true;
}

function closeTip() {
  show.value = false;
}
</script>

<template>
  <span class="strategy-tip-label">
    <span v-if="label" class="strategy-tip-label__text">{{ label }}</span>
    <van-popover
      v-model:show="show"
      class="strategy-tip-label__popover"
      :placement="placement"
      :style="{ maxWidth: `${popoverWidth}px` }"
      theme="dark"
      trigger="manual"
    >
      <div class="strategy-tip-content" role="tooltip">{{ tip }}</div>
      <template #reference>
        <button
          ref="buttonRef"
          type="button"
          class="strategy-tip-label__button"
          :aria-label="`${label || '该指标'}说明`"
          @mouseenter="openTip"
          @mouseleave="closeTip"
          @focus="openTip"
          @blur="closeTip"
          @click.stop="openTip"
          @keydown.esc.stop="closeTip"
        >
          <CircleHelp :size="14" aria-hidden="true" />
        </button>
      </template>
    </van-popover>
  </span>
</template>

<style scoped lang="scss">
.strategy-tip-label {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  vertical-align: middle;
}

.strategy-tip-label__text {
  min-width: 0;
}

.strategy-tip-label__button {
  display: inline-grid;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 50%;
  padding: 0;
  place-items: center;
  color: var(--trade-muted);
  background: transparent;
  cursor: help;
}

.strategy-tip-label__button:hover,
.strategy-tip-label__button:focus-visible {
  color: var(--trade-info);
  background: var(--trade-surface-soft);
  outline: none;
}

.strategy-tip-label__button:focus-visible {
  box-shadow: 0 0 0 2px var(--trade-focus);
}
</style>

<style lang="scss">
.strategy-tip-label__popover.van-popover {
  max-width: calc(100vw - 32px);
}

.strategy-tip-content {
  max-width: 100%;
  padding: 10px 12px;
  color: inherit;
  font-size: var(--trade-font-sm);
  line-height: 1.55;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
