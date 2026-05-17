import { createApp } from 'vue';
import Vant from 'vant';
import App from './App.vue';
import router from './router';
import 'vant/lib/index.css';
import './styles.css';

createApp(App).use(router).use(Vant).mount('#app');
