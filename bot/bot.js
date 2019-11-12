const allActions = ['up', 'down', 'left', 'right', 'stay', 'bomb'];

function yourBot(state, myPlayerId) {
  return allActions[Math.floor(Math.random() * allActions.length)];
}

function dumbBot(state, myPlayerId) {
  return 'stay';
}

module.exports = yourBot;
