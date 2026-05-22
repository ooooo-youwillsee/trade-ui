import { createApp } from 'vue';
import Vant from 'vant';
import App from './App.vue';
import router from './router';
import './composables/useTheme';
import 'vant/lib/index.css';
import './styles/common.scss';

// 应用入口：先引入主题副作用和全局样式，再挂载路由与 Vant 组件库。
createApp(App).use(router).use(Vant).mount('#app');
