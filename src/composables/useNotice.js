import { reactive } from 'vue';

const notice = reactive({
  open: false,
  title: '提示',
  message: '',
});

export function useNotice() {
  function showNotice(message, title = '提示') {
    notice.open = true;
    notice.title = title;
    notice.message = message;
  }

  function closeNotice() {
    notice.open = false;
  }

  return {
    closeNotice,
    notice,
    showNotice,
  };
}
