const allActions = ['up', 'down', 'left', 'right', 'stay', 'bomb'];

function yourBot(state, myPlayerId, agent) {
  return agent.getBestAction(state, myPlayerId);
}

function dumbBot(state, myPlayerId) {
  return 'right';
}

module.exports = [yourBot, yourBot, yourBot, yourBot];
