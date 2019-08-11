import { ActionCode, Actions, IClientMessage, IPlayer } from '../src/types';
import { GameState } from '../src/server/state';
import { SUDDEN_DEATH_STARTS_AT } from '../src/constants';
import _ from 'lodash';

const assert = require('assert');

describe('GameState', () => {
  // prettier-ignore
  const asciiMap = [
    '..+..',
    '.+++.',
    '..+..',
  ];

  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState(asciiMap);
  });

  describe('constructor', () => {
    it('parses ascii map', () => {
      assert.strictEqual(gameState.height, 3);
      assert.strictEqual(gameState.width, 5);
      assert.strictEqual(gameState.tiles, '..+...+++...+..');
      assert.strictEqual(gameState.state, -1);
      assert.strictEqual(gameState.isSimulationPaused, true);
    });
  });

  describe('start and stop', () => {
    it('automatically starts when four players join the game', () => {
      addPlayers('a', 'b', 'c', 'd');

      assert.strictEqual(gameState.state, 0);
    });
  });

  describe('movement', () => {
    it('moves right', () => {
      gameState.isSimulationPaused = false;
      addPlayers('a', 'b', 'c', 'd');

      assert.strictEqual(gameState.players['a'].x, 0);
      assert.strictEqual(gameState.players['a'].y, 0);

      simulateTick({
        a: Actions.Right
      });

      assert.strictEqual(gameState.players['a'].x, 1);
      assert.strictEqual(gameState.players['a'].y, 0);
    });
  });

  describe('sudden death', () => {
    beforeEach(() => {
      addPlayers('a', 'b', 'c', 'd');
    });

    it('when players do not move game ends with a winner', () => {
      gameState.isSimulationPaused = false;

      const tileCount = gameState.width * gameState.height;
      for (let i = 0; i < SUDDEN_DEATH_STARTS_AT + tileCount; i++) {
        simulateTick({});
      }

      assert.strictEqual(gameState.state, 1);

      const playersAliveCount = _.filter(gameState.players, (p: IPlayer) => p.alive).length;
      assert.strictEqual(playersAliveCount, 1);
    });

    it('sudden death is delayed when game is paused', () => {
      gameState.isSimulationPaused = false;
      for (let i = 0; i < SUDDEN_DEATH_STARTS_AT / 4; i++) {
        simulateTick({});
      }

      gameState.isSimulationPaused = true;
      for (let i = 0; i < SUDDEN_DEATH_STARTS_AT * 2; i++) {
        simulateTick({});
      }

      gameState.isSimulationPaused = false;
      for (let i = 0; i < SUDDEN_DEATH_STARTS_AT / 4; i++) {
        simulateTick({});
      }

      assert.strictEqual(0, gameState.state);
    });
  });

  function addPlayers(...playerIds: string[]) {
    for (const playerId of playerIds) {
      gameState.addPlayer(playerId, playerId);
    }
  }

  function simulateTick(actions: { [playerId: string]: ActionCode }) {
    const messages: IClientMessage[] = [];

    for (const playerId in actions) {
      messages.push({
        action: actions[playerId],
        playerId: playerId,
        tick: gameState.tick,
        elapsed: 0
      });
    }

    gameState.applyClientMessages(messages);
    gameState.tick++;
  }
});
