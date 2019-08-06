import Vue from 'vue';
import App from './App.vue';
import Router from 'vue-router';
import Admin from './views/Admin.vue';
import Game from './views/Game.vue';

Vue.use(Router);

Vue.config.productionTip = false;

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/admin',
      name: 'admin',
      component: Admin
    },
    {
      path: '/games/:roomId',
      name: 'game',
      component: Game
    }
  ]
});

new Vue({
  router,
  render: h => h(App)
}).$mount('#vuejs');
