import { createApp } from 'vue'
import App from './app.vue'
// 页面级样式：只放布局与页面底色（组件必须自包含）
// oxlint-disable-next-line import/no-unassigned-import
import './playground.css'

createApp(App).mount('#app')
