import { reactive } from 'vue';

// 全局提示弹窗状态：用一个响应式对象承载标题、正文和开关状态。
const notice = reactive({
  open: false,
  title: '提示',
  message: '',
});

// 轻量通知 composable：页面只调用 show/close，不直接操作弹窗状态细节。
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
