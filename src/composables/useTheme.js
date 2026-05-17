import { computed, ref, watch } from 'vue';

const THEME_KEY = 'trade-ui-theme';
const theme = ref(localStorage.getItem(THEME_KEY) || 'light');

function applyTheme(value) {
  document.documentElement.dataset.theme = value;
  localStorage.setItem(THEME_KEY, value);
}

applyTheme(theme.value);

watch(theme, applyTheme);

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
