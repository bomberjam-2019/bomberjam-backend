const { startSimulation } = require('../dist');

const allActions = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

class RandomBot {
  getAction(state, myPlayerId) {
    return allActions[Math.floor(Math.random() * allActions.length)];
  }
}

function simulateGame() {
  const bots = [new RandomBot(), new RandomBot(), new RandomBot(), new RandomBot()];

  const saveGamelog = true;
  const simulation = startSimulation(bots, saveGamelog);

  while (!simulation.isFinished) {
    simulation.executeNextTick();
  }

  console.log(simulation.currentState);
}

simulateGame();
