import { SUDDEN_DEATH_COUNTDOWN, AllActions, AllTiles, IBomb, IHasPos, IPlayer } from '../src/types';
import GameState from '../src/server/gameState';
import { addPlayers, simulateTick } from './gameStateUtils';
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
      addPlayers(gameState, 'a', 'b', 'c', 'd');

      expect(gameState.state).toBe(0);
      expect(gameState.isSimulationPaused).toBe(true);
    });

    test('basic player starting locations', () => {
      addPlayers(gameState, 'a', 'b', 'c', 'd');

      // top left
      expect(gameState.players['a'].x).toBe(0);
      expect(gameState.players['a'].y).toBe(0);

      // top right
      expect(gameState.players['b'].x).toBe(4);
      expect(gameState.players['b'].y).toBe(0);

      // bottom left
      expect(gameState.players['c'].x).toBe(0);
      expect(gameState.players['c'].y).toBe(2);

      // bottom right
      expect(gameState.players['d'].x).toBe(4);
      expect(gameState.players['d'].y).toBe(2);
    });
  });

  describe('movement', () => {
    test('moves right', () => {
      gameState.isSimulationPaused = false;
      addPlayers(gameState, 'a', 'b', 'c', 'd');

      expect(gameState.players['a'].x).toBe(0);
      expect(gameState.players['a'].y).toBe(0);

      simulateTick(gameState, {
        a: AllActions.Right
      });

      expect(gameState.players['a'].x).toBe(1);
      expect(gameState.players['a'].y).toBe(0);
    });
  });

  describe('bombing', () => {
    test('simple bomb at player location', () => {
      gameState.isSimulationPaused = false;
      addPlayers(gameState, 'a', 'b', 'c', 'd');

      simulateTick(gameState, {
        a: AllActions.Bomb
      });

      let bombs: IBomb[] = Object.values(gameState.bombs);
      expect(bombs).toHaveLength(1);

      while (bombs.length > 0 && bombs[0].countdown > 0) {
        simulateTick(gameState, {});
      }

      const expectedExplosionPositions: IHasPos[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }];

      const expectedExplosionIndexes = new Set<number>(expectedExplosionPositions.map(pos => pos.y * gameState.width + pos.x));

      for (let idx = 0; idx < gameState.tiles.length; idx++) {
        const tile = gameState.tiles.charAt(idx);
        if (expectedExplosionIndexes.has(idx)) {
          expect(tile).toBe(AllTiles.Explosion);
        } else {
          expect(tile).not.toBe(AllTiles.Explosion);
        }
      }

      simulateTick(gameState, {});

      for (let idx = 0; idx < gameState.tiles.length; idx++) {
        const tile = gameState.tiles.charAt(idx);
        expect(tile).not.toBe(AllTiles.Explosion);
      }
    });
  });

  describe('sudden death', () => {
    beforeEach(() => {
      addPlayers(gameState, 'a', 'b', 'c', 'd');
    });

    test('when players do not move game ends with a winner', () => {
      gameState.isSimulationPaused = false;

      const tileCount = gameState.width * gameState.height;
      for (let i = 0; i < SUDDEN_DEATH_COUNTDOWN + tileCount; i++) {
        simulateTick(gameState, {});
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
        simulateTick(gameState, {});
      }

      gameState.isSimulationPaused = true;
      for (let i = 0; i < SUDDEN_DEATH_COUNTDOWN * 2; i++) {
        simulateTick(gameState, {});
      }

      gameState.isSimulationPaused = false;
      for (let i = 0; i < SUDDEN_DEATH_COUNTDOWN / 4; i++) {
        simulateTick(gameState, {});
      }

      expect(gameState.state).toBe(0);
      expect(gameState.suddenDeathEnabled).toBe(false);
    });
  });

  describe('when player spawn location occupied find another location around', () => {
    interface IPlayerRespawnTestInput {
      asciiMap: string[];
      expectedPlayerLocations: { [playerId: string]: IHasPos };
    }

    // prettier-ignore
    const testInputs: IPlayerRespawnTestInput[] = [
      // 0
      {
        asciiMap: [
          '.....',
          '.#.#.',
          '.....',
        ],
        expectedPlayerLocations: {
          'a': { x: 0, y: 0 },
          'b': { x: 4, y: 0 },
          'c': { x: 0, y: 2 },
          'd': { x: 4, y: 2 }
        }
      },
      // 1
      {
        asciiMap: [
          '#....',
          '.#.#.',
          '.....',
        ],
        expectedPlayerLocations: {
          'a': { x: 1, y: 0 },
          'b': { x: 4, y: 0 },
          'c': { x: 0, y: 2 },
          'd': { x: 4, y: 2 }
        }
      },
      // 2
      {
        asciiMap: [
          '#####',
          '#..#.',
          '#...#',
        ],
        expectedPlayerLocations: {
          'a': { x: 1, y: 1 },
          'b': { x: 4, y: 1 },
          'c': { x: 1, y: 2 },
          'd': { x: 3, y: 2 }
        }
      }
    ];

    for (let i = 0; i < testInputs.length; i++) {
      test(`scenario ${i}`, () => {
        assertPlayerLocation(testInputs[i]);
      });
    }

    function assertPlayerLocation(input: IPlayerRespawnTestInput) {
      const playerIds = Object.keys(input.expectedPlayerLocations);

      gameState = new GameState(input.asciiMap);
      addPlayers(gameState, ...playerIds);
      gameState.isSimulationPaused = false;

      for (const playerId of playerIds) {
        expect(gameState.players[playerId].x).toBe(input.expectedPlayerLocations[playerId].x);
        expect(gameState.players[playerId].y).toBe(input.expectedPlayerLocations[playerId].y);
      }
    }
  });
});
