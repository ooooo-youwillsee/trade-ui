import { computed, ref, watch } from 'vue';

// 主题状态通过 localStorage 持久化，并同步到 documentElement 的 data-theme。
const THEME_KEY = 'trade-ui-theme';
const theme = ref(localStorage.getItem(THEME_KEY) || 'light');

// 应用主题时同时更新 DOM 标记和本地存储，刷新后可恢复用户选择。
function applyTheme(value) {
  document.documentElement.dataset.theme = value;
  localStorage.setItem(THEME_KEY, value);
}

applyTheme(theme.value);

// 主题切换后立即写入 DOM，SCSS 通过 data-theme 变量完成颜色切换。
watch(theme, applyTheme);

// 对外暴露布尔型 isDark，便于开关组件直接双向绑定。
export function useTheme() {
  const isDark = computed({
    get: () => theme.value === 'dark',
    set: (value) => {
      theme.value = value ? 'dark' : 'light';
    },
  });

  return {
    isDark,
    theme,
  };
}
