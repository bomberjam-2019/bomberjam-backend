import { addPlayers, simulateTick } from './gameStateUtils';
import { RESPAWN_TIME, AllActions } from '../src/types';
import GameState from '../src/server/gameState';

describe('GameState death timing', () => {
  // prettier-ignore
  const asciiMap = [
    '......',
    '......',
    '......',
    '......'
  ];

  let gameState: GameState;

  beforeEach(() => {
    // start game with 4 players
    gameState = new GameState(asciiMap);
    addPlayers(gameState, 'a', 'b', 'c', 'd');
    gameState.isSimulationPaused = false;

    // increase all player bomb range to the gamestate dimensions
    for (const playerId in gameState.players) {
      gameState.players[playerId].bombRange = Math.max(gameState.width, gameState.height);
    }
  });

  test('nothing', () => {
    // player a is at top left (0, 0) then goes to (2, 0)
    simulateTick(gameState, { a: AllActions.Right });
    simulateTick(gameState, { a: AllActions.Right });

    expect(gameState.players['a'].x).toBe(2);
    expect(gameState.players['a'].y).toBe(0);

    // player b is at top right (5, 0) then goes to (3, 0)
    simulateTick(gameState, { b: AllActions.Left });
    simulateTick(gameState, { b: AllActions.Left });

    expect(gameState.players['b'].x).toBe(3);
    expect(gameState.players['b'].y).toBe(0);

    // player c is at bottom left (0, 3) then goes to (1, 1)
    simulateTick(gameState, { c: AllActions.Up });
    simulateTick(gameState, { c: AllActions.Up });
    simulateTick(gameState, { c: AllActions.Right });

    expect(gameState.players['c'].x).toBe(1);
    expect(gameState.players['c'].y).toBe(1);

    // player d is at bottom right (5, 3) then goes to (4, 1)
    simulateTick(gameState, { d: AllActions.Up });
    simulateTick(gameState, { d: AllActions.Up });
    simulateTick(gameState, { d: AllActions.Left });

    expect(gameState.players['d'].x).toBe(4);
    expect(gameState.players['d'].y).toBe(1);

    // The player positions looks like this now:
    // ..ab..
    // .c..d.
    // ......
    // ......

    // a is going to drop a bomb, then when the bomb countdown will be equal to 1:
    // - c will walk up in the explosion and will be hit at the next tick
    // - a will stay at his position and will be hit at the next tick
    // - b will walk down trying to escape the explosion and will be hit at the next tick
    // - d will stay safely at his position, then the next tick walk up after the explosion and then will not be hit at all

    simulateTick(gameState, { a: AllActions.Bomb });
    expect(Object.keys(gameState.bombs)).toHaveLength(1);

    while (Object.keys(gameState.bombs).length === 1 && Object.values(gameState.bombs)[0].countdown > 1) {
      simulateTick(gameState, {});
    }

    expect(Object.keys(gameState.bombs)).toHaveLength(1);
    expect(Object.values(gameState.bombs)[0].countdown).toBe(1);

    simulateTick(gameState, {
      c: AllActions.Up,
      a: AllActions.Stay,
      b: AllActions.Down,
      d: AllActions.Stay
    });

    expect(Object.keys(gameState.bombs)).toHaveLength(0);

    expect(gameState.players['c'].respawning).toBe(RESPAWN_TIME);
    expect(gameState.players['c'].x).toBe(1);
    expect(gameState.players['c'].y).toBe(0);

    expect(gameState.players['a'].respawning).toBe(RESPAWN_TIME);
    expect(gameState.players['a'].x).toBe(2);
    expect(gameState.players['a'].y).toBe(0);

    expect(gameState.players['b'].respawning).toBe(RESPAWN_TIME);
    expect(gameState.players['b'].x).toBe(3);
    expect(gameState.players['b'].y).toBe(0);

    expect(gameState.players['d'].respawning).toBe(0);
    expect(gameState.players['d'].x).toBe(4);
    expect(gameState.players['d'].y).toBe(1);

    // c, a and b are "stunned" and cannot move while they are respawned
    // so they move action will not have any effect

    simulateTick(gameState, {
      c: AllActions.Up,
      a: AllActions.Down,
      b: AllActions.Stay,
      d: AllActions.Up
    });

    expect(gameState.players['c'].respawning).toBe(RESPAWN_TIME - 1);
    expect(gameState.players['c'].x).toBe(0);
    expect(gameState.players['c'].y).toBe(3);

    expect(gameState.players['a'].respawning).toBe(RESPAWN_TIME - 1);
    expect(gameState.players['a'].x).toBe(0);
    expect(gameState.players['a'].y).toBe(0);

    expect(gameState.players['b'].respawning).toBe(RESPAWN_TIME - 1);
    expect(gameState.players['b'].x).toBe(5);
    expect(gameState.players['b'].y).toBe(0);

    expect(gameState.players['d'].respawning).toBe(0);
    expect(gameState.players['d'].x).toBe(4);
    expect(gameState.players['d'].y).toBe(0);
  });
});
