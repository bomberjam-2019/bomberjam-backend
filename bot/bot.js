const allActions = ['up', 'down', 'left', 'right', 'stay', 'bomb'];

function yourBot(state, myPlayerId) {
  return allActions[Math.floor(Math.random() * allActions.length)];
}

module.exports = yourBot;
