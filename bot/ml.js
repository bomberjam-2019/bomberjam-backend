const allActions = ['up', 'down', 'left', 'right', 'stay', 'bomb'];

class MachineLearningAgent {
  init(model) {
    this.model = new Model(JSON.parse(model));

    return this.model;
  }

  train(gameStates) {
    this.model.data = `${this.model.data}-${gameStates[126].state.tick}`;

    return this.model;
  }
}

class Model {
  constructor(modelStr) {
    this.data = modelStr.data;
  }

  dump() {
    return JSON.stringify(this);
  }

  getBestAction(gameState) {
    return allActions[Math.floor(Math.random() * allActions.length)];
  }
}

module.exports = new MachineLearningAgent();
