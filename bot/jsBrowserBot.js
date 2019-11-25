const { playInBrowser } = require('../dist/client');

const allActions = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

function yourBot(state, myPlayerId) {
  return allActions[Math.floor(Math.random() * allActions.length)];
}

playInBrowser(yourBot).catch(console.log);
