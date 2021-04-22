// const {ipcMain} = require("electron")
import Vue from 'vue';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';
Vue.use(Antd)
import App from './App.vue'

// ipcMain.handle('lost-connection', () => {
//   console.log('lost-connection');
// })

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')

