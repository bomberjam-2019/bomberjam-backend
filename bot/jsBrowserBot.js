const { playInBrowser } = require('../dist/client');

const allActions = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

class RandomBot {
  getAction(state, myPlayerId) {
    return allActions[Math.floor(Math.random() * allActions.length)];
  }
}

const bots = [new RandomBot(), new RandomBot(), new RandomBot(), new RandomBot()];

playInBrowser(bots).catch(console.log);
