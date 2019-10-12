import { ActionCode, Actions, IClientMessage, IPlayer } from '../src/types';
import { GameState } from '../src/server/state';
import { SUDDEN_DEATH_COUNTDOWN } from '../src/constants';
import _ from 'lodash';

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
    test('parses ascii map', () => {
      expect(gameState.height).toBe(3);
      expect(gameState.width).toBe(5);
      expect(gameState.tiles).toBe('..+...+++...+..');
      expect(gameState.state).toBe(-1);
      expect(gameState.isSimulationPaused).toBe(true);
    });
  });

  describe('start and stop', () => {
    test('automatically starts when four players join the game', () => {
      addPlayers('a', 'b', 'c', 'd');

      expect(gameState.state).toBe(0);
    });
  });

  describe('movement', () => {
    test('moves right', () => {
      gameState.isSimulationPaused = false;
      addPlayers('a', 'b', 'c', 'd');

      expect(gameState.players['a'].x).toBe(0);
      expect(gameState.players['a'].y).toBe(0);

      simulateTick({
        a: Actions.Right
      });

      expect(gameState.players['a'].x).toBe(1);
      expect(gameState.players['a'].y).toBe(0);
    });
  });

  describe('sudden death', () => {
    beforeEach(() => {
      addPlayers('a', 'b', 'c', 'd');
    });

    test('when players do not move game ends with a winner', () => {
      gameState.isSimulationPaused = false;

      const tileCount = gameState.width * gameState.height;
      for (let i = 0; i < SUDDEN_DEATH_COUNTDOWN + tileCount; i++) {
        simulateTick({});
      }

      expect(gameState.state).toBe(1);
      expect(gameState.suddenDeathEnabled).toBe(true);
      expect(gameState.suddenDeathCountdown).toBe(0);

      const playersAliveCount = _.filter(gameState.players, (p: IPlayer) => p.alive).length;
      expect(playersAliveCount).toBe(1);
    });

    test('sudden death is delayed when game is paused', () => {
      gameState.isSimulationPaused = false;
      for (let i = 0; i < SUDDEN_DEATH_COUNTDOWN / 4; i++) {
        simulateTick({});
      }

      gameState.isSimulationPaused = true;
      for (let i = 0; i < SUDDEN_DEATH_COUNTDOWN * 2; i++) {
        simulateTick({});
      }

      gameState.isSimulationPaused = false;
      for (let i = 0; i < SUDDEN_DEATH_COUNTDOWN / 4; i++) {
        simulateTick({});
      }

      expect(gameState.state).toBe(0);
      expect(gameState.suddenDeathEnabled).toBe(false);
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
  }
});
