import { faCompressArrowsAlt, faExpandArrowsAlt, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';

import BomberjamLogo from './views/BomberjamLogo.vue';
import BackButton from './views/BackButton.vue';
import Home from './views/Home.vue';
import Game from './views/Game.vue';
import Spectate from './views/Spectate.vue';
import App from './App.vue';
import Replay from './views/Replay.vue';
import Router from 'vue-router';
import Vue from 'vue';

library.add(faCompressArrowsAlt, faExpandArrowsAlt, faPlay, faPause);
Vue.component('font-awesome-icon', FontAwesomeIcon);
Vue.component('bomberjam-logo', BomberjamLogo);
Vue.component('back-button', BackButton);

Vue.use(Router);

Vue.config.productionTip = false;

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/spectate',
      name: 'spectate',
      component: Spectate
    },
    {
      path: '/games/:roomId',
      name: 'game',
      component: Game
    },
    {
      path: '/replay',
      name: 'replay',
      component: Replay
    }
  ]
});

new Vue({
  router,
  render: h => h(App)
}).$mount('#vuejs');
