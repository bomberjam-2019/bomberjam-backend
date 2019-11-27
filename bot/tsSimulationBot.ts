import { startSimulation, IGameState, ActionCode, IBot } from '../dist/client';

const allActions: ActionCode[] = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

class RandomBot implements IBot {
  getAction(state: IGameState, myPlayerId: string) {
    return allActions[Math.floor(Math.random() * allActions.length)];
  }
}

function simulateGame(): void {
  const bots = [new RandomBot(), new RandomBot(), new RandomBot(), new RandomBot()];

  const saveGamelog = true;
  const simulation = startSimulation(bots, saveGamelog);

  while (!simulation.isFinished) {
    simulation.executeNextTick();
  }

  console.log(simulation.currentState);
}

simulateGame();
