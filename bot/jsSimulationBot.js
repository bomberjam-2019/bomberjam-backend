const { startSimulation } = require('../dist/client');

const allActions = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

class RandomBot {
  getAction(state, myPlayerId) {
    return allActions[Math.floor(Math.random() * allActions.length)];
  }
}

function simulateGame() {
  const bots = [new RandomBot(), new RandomBot(), new RandomBot(), new RandomBot()];

  const simulation = startSimulation(bots);

  while (!simulation.isFinished) {
    simulation.executeNextTick();
  }

  console.log(simulation.currentState);
}

simulateGame();
