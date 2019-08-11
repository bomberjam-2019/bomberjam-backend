const ndarray = require('ndarray');
const DQN = require('weblearn-dqn');
const { ReLU, Linear, MSE, SGD, Sequential } = require('weblearn');

const MAP_WIDTH = 13;
const MAP_HEIGHT = 11;
const NB_TILES = MAP_WIDTH * MAP_HEIGHT;
const INITIALLY_BLOCKED_TILES = (((MAP_WIDTH - 1) / 2) * (MAP_HEIGHT - 1)) / 2;
const INITIALLY_FREE_TILES = NB_TILES - INITIALLY_BLOCKED_TILES;
const MAX_PLAYERS = 4;
const MAX_BOMBS = INITIALLY_FREE_TILES;
const MAX_BONUSES = INITIALLY_FREE_TILES;
const STATE_SIZE = 967;

const MAX_LIFE = 3;
const ACTIONS = ['up', 'down', 'left', 'right', 'stay', 'bomb'];
const TILE_NUMBERS = {
  '#': 0,
  '.': 1,
  '+': 2
};
const BONUS_NUMBERS = {
  fire: 0,
  bomb: 1
};

const MAX_TICKS = 1100;

class MachineLearningAgent {
  init(modelStr) {
    //const model = JSON.parse(modelStr);
    //console.log(Object.keys(model));
    //console.log(Object.keys(model.model));
    //console.log(Object.keys(model.agent));

    const inputLayerSize = STATE_SIZE;
    const outputLayerSize = ACTIONS.length;
    const hiddenLayer1Size = Math.floor(inputLayerSize / 4);
    const hiddenLayer2Size = Math.floor(outputLayerSize * 4);

    this.model = Sequential({
      optimizer: SGD(0.01),
      loss: MSE()
    });

    this.model
      .add(Linear(inputLayerSize, hiddenLayer1Size))
      .add(ReLU())
      .add(Linear(hiddenLayer1Size, hiddenLayer2Size))
      .add(ReLU())
      .add(Linear(hiddenLayer2Size, outputLayerSize));

    this.agent = DQN({
      model: this.model,
      numActions: outputLayerSize
    });
  }

  train(gameStates, playerNumber) {
    const currentPlayerId = Object.keys(gameStates[0].state.players)[playerNumber];
    const lastStateForPlayer =
      gameStates.find(gameState => !gameState.state.players[currentPlayerId].alive) || gameStates[gameStates.length - 1];
    this.getBestAction(lastStateForPlayer.state, currentPlayerId, true);

    const loss = this.agent.learn();
    console.log(`Loss: ${loss}`);
  }

  dump() {
    return JSON.stringify({
      model: this.model,
      agent: this.agent
    });
  }

  getBestAction(gameState, currentPlayerId, done = false) {
    if (!gameState.players[currentPlayerId].alive && !done) {
      return ACTIONS[0]; // Doesn't matter, you're dead
    }

    const state = toModelInput(gameState, currentPlayerId);
    const reward = getReward(gameState, currentPlayerId);

    return ACTIONS[this.agent.step(state, reward, done)];
  }
}

function toModelInput(gameState, currentPlayerId) {
  const modelInput = [];

  // Encode tiles
  const tiles = gameState.tiles;
  for (let i = 0; i < NB_TILES; i++) {
    modelInput.push(TILE_NUMBERS[tiles[i]]);
  }

  // Encode players
  const players = Object.values(gameState.players);
  for (let i = 0; i < MAX_PLAYERS; i++) {
    if (players.length <= i) {
      modelInput.push(-1, -1, -1, -1, -1, -1, -1, -1);
      continue;
    }

    const { id, x, y, bombsLeft, maxBombs, bombRange, alive, lives } = players[i];
    modelInput.push(getPlayerNumber(players, id), x, y, bombsLeft, maxBombs, bombRange, alive ? 1 : 0, lives);
  }

  // Encode bombs
  const bombs = Object.values(gameState.bombs);
  for (let i = 0; i < MAX_BOMBS; i++) {
    if (bombs.length <= i) {
      modelInput.push(-1, -1, -1, -1);
      continue;
    }

    const { x, y, countdown, range } = bombs[i];
    modelInput.push(x, y, countdown, range);
  }

  // Encode bonuses
  const bonuses = Object.values(gameState.bonuses);
  for (let i = 0; i < MAX_BONUSES; i++) {
    if (bonuses.length <= i) {
      modelInput.push(-1, -1, -1);
      continue;
    }

    const { x, y, type } = bonuses[i];
    modelInput.push(x, y, BONUS_NUMBERS[type]);
  }

  // Encode currentPlayer
  const currentPlayerNumber = getPlayerNumber(players, currentPlayerId);
  modelInput.push(currentPlayerNumber);

  return ndarray(modelInput);
}

function getReward(gameState, currentPlayerId) {
  const currentPlayer = gameState.players[currentPlayerId];
  const players = Object.values(gameState.players);
  const otherPlayers = players.filter(player => player.id !== currentPlayerId);
  const otherPlayersMaximumLifeCount = MAX_LIFE * otherPlayers.length;
  const otherPlayersLifeCount = otherPlayers.reduce((lives, player) => lives + player.lives, 0);
  const otherAlivePlayers = otherPlayers.filter(player => player.alive);

  // If you won, get points based on how fast you won
  if (!otherAlivePlayers) {
    console.log('I win!');
    return MAX_TICKS - gameState.ticks;
  }

  // Try to stay as healthy as possible
  return currentPlayer.lives / MAX_LIFE;
}

function getPlayerNumber(players, currentPlayerId) {
  return players.reduce((playerNumber, player, i) => {
    return currentPlayerId === player.id ? i : playerNumber;
  }, 0);
}

module.exports = [new MachineLearningAgent(), new MachineLearningAgent(), new MachineLearningAgent(), new MachineLearningAgent()];
