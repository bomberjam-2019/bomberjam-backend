const allActions = ['up', 'down', 'left', 'right', 'stay', 'bomb'];

function yourBot(state, myPlayerId, model) {
  return model.getBestAction(state);
}

function dumbBot(state, myPlayerId) {
  return 'stay';
}

module.exports = [yourBot, dumbBot, dumbBot, dumbBot];
