import { startSimulation, IGameState, ActionCode } from '../dist/client';

const allActions: ActionCode[] = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

function yourBot(state: IGameState, myPlayerId: string) {
  return allActions[Math.floor(Math.random() * allActions.length)];
}

let simulation = startSimulation();
console.log(simulation.currentState.tiles);

while (!simulation.isFinished) {
  const playerIds = Object.keys(simulation.currentState.players);
  const playerActions = Object.assign({}, ...playerIds.map(pid => ({ [pid]: yourBot(simulation.currentState, pid) })));

  simulation.executeNextTick(playerActions);
  console.log(simulation.currentState.tiles);
}
