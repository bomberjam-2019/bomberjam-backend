import { GameState } from '../src/server/state';
import { Actions } from '../src/types';

const assert = require('assert');

describe('GameState', () => {
  // prettier-ignore
  const asciiMap = [
    '..+..',
    '.+++.',
    '..+..',
  ];

  describe('constructor', () => {
    it('parses ascii map', () => {
      const gameState = new GameState(asciiMap);

      assert.strictEqual(gameState.height, 3);
      assert.strictEqual(gameState.width, 5);
      assert.strictEqual(gameState.tiles, '..+...+++...+..');
      assert.strictEqual(gameState.state, -1);
      assert.strictEqual(gameState.isSimulationPaused, true);
    });
  });

  describe('start and stop', () => {
    it('automatically starts when four players join the game', () => {
      const gameState = new GameState(asciiMap);

      gameState.addPlayer('a', 'a');
      gameState.addPlayer('b', 'b');
      gameState.addPlayer('c', 'c');
      gameState.addPlayer('d', 'd');

      assert.strictEqual(gameState.state, 0);
    });
  });

  describe('movement', () => {
    it('moves right', () => {
      const gameState = new GameState(asciiMap);

      gameState.isSimulationPaused = false;
      gameState.addPlayer('a', 'a');
      gameState.addPlayer('b', 'b');
      gameState.addPlayer('c', 'c');
      gameState.addPlayer('d', 'd');

      assert.strictEqual(gameState.players['a'].x, 0);
      assert.strictEqual(gameState.players['a'].y, 0);

      gameState.applyClientMessages([
        {
          playerId: 'a',
          action: Actions.Right,
          tick: 0,
          elapsed: 0
        }
      ]);

      assert.strictEqual(gameState.players['a'].x, 1);
      assert.strictEqual(gameState.players['a'].y, 0);
    });
  });
});
