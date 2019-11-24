const { playInBrowser, startSimulation } = require('../dist/client');

const allActions = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

function yourBot(state, myPlayerId) {
  return allActions[Math.floor(Math.random() * allActions.length)];
}

let simulation = startSimulation();

while (!simulation.isFinished) {
  console.log(simulation.currentState.tiles);

  const playerActions = {};

  for (const playerId in simulation.currentState.players) {
    playerActions[playerId] = yourBot(simulation.currentState, playerId);
  }

  simulation = simulation.executeNextTick(playerActions);
}

playInBrowser(yourBot).catch(console.log);
