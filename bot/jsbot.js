const { playInBrowser, startSimulation } = require('../dist/client');

const allActions = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

function yourBot(state, myPlayerId) {
  return allActions[Math.floor(Math.random() * allActions.length)];
}

// 1) play in browser using the colyseus server,
// either in practice or tournament mode with a room ID
// playInBrowser(yourBot).catch(console.log);

// 2) simulate a game without the browser, very fast
let simulation = startSimulation();
console.log(simulation.currentState.tiles);

while (!simulation.isFinished) {
  const playerIds = Object.keys(simulation.currentState.players);
  const playerActions = Object.assign({}, ...playerIds.map(pid => ({ [pid]: yourBot(simulation.currentState, pid) })));

  simulation.executeNextTick(playerActions);
  console.log(simulation.currentState.tiles);
}
