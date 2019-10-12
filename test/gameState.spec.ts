import { ActionCode, AllActions, IClientMessage, IPlayer } from '../src/types';
import { POINTS_KILLED_PLAYER, SUDDEN_DEATH_COUNTDOWN } from '../src/constants';
import { GameState } from '../src/server/state';
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
      expect(gameState.isSimulationPaused).toBe(true);
    });
  });

  describe('movement', () => {
    test('moves right', () => {
      gameState.isSimulationPaused = false;
      addPlayers('a', 'b', 'c', 'd');

      expect(gameState.players['a'].x).toBe(0);
      expect(gameState.players['a'].y).toBe(0);

      simulateTick({
        a: AllActions.Right
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

  describe('death responsibility', () => {
    // prettier-ignore
    const asciiMap = [
      '.....',
      '.#.#.',
      '.....',
    ];

    beforeEach(() => {
      // ensure that positive points are given at death for this test
      expect(POINTS_KILLED_PLAYER).toBeGreaterThan(0);

      // start game with 4 players
      gameState = new GameState(asciiMap);
      addPlayers('a', 'b', 'c', 'd');
      gameState.isSimulationPaused = false;

      // increase all player bomb range just enough to make explosions overlap
      for (const playerId in gameState.players) {
        gameState.players[playerId].bombRange = 3;
      }

      // all players scores should be zero at the beginning of the game
      for (const playerId in gameState.players) {
        expect(gameState.players[playerId].score).toBe(0);
      }

      // remove player c because he does not participate in this test and will block player a on his way
      delete gameState.players['c'];

      // player a is at top left (0, 0)
      expect(gameState.players['a'].x).toBe(0);
      expect(gameState.players['a'].y).toBe(0);

      // player b (victim) is at top right (4, 0)
      expect(gameState.players['b'].x).toBe(4);
      expect(gameState.players['b'].y).toBe(0);
    });

    test('should give points to the player that triggers an explosion chain where the first bomb cannot hit a victim', () => {
      // player d is at bottom right (4, 2) then comes between a and b at (2, 0)
      simulateTick({ d: AllActions.Left });
      simulateTick({ d: AllActions.Left });
      simulateTick({ d: AllActions.Up });
      simulateTick({ d: AllActions.Up });

      expect(gameState.players['d'].x).toBe(2);
      expect(gameState.players['d'].y).toBe(0);

      // a drops a bomb
      simulateTick({ a: AllActions.Bomb });

      // d also drops a bomb but one tick after a
      simulateTick({ d: AllActions.Bomb });

      // both a and d flies away to escape the explosions
      simulateTick({ a: AllActions.Down, d: AllActions.Down });
      simulateTick({ a: AllActions.Down, d: AllActions.Down });
      simulateTick({ a: AllActions.Right, d: AllActions.Right });

      // a and d should be safe respectively at (1, 2) and (3, 2)
      expect(gameState.players['a'].x).toBe(1);
      expect(gameState.players['a'].y).toBe(2);

      expect(gameState.players['d'].x).toBe(3);
      expect(gameState.players['d'].y).toBe(2);

      // there should be two active bombs with two different countdown
      expect(Object.keys(gameState.bombs)).toHaveLength(2);
      expect(_.uniq(_.map(gameState.bombs, bomb => bomb.countdown))).toHaveLength(2);

      // a's bomb cannot reach player b but it can reach d's bomb,
      // so d's bomb will explode because of a's bomb
      // in the end, a should get the points, not d, because he triggered the explosion chain
      // wait for the bombs to explode
      const minCountdown = _.min(_.map(gameState.bombs, bomb => bomb.countdown)) as number;
      for (let i = 0; i < minCountdown; i++) {
        simulateTick({});
      }

      // the two bombs should be in an exploding state as the first one triggered the second
      for (const bombId in gameState.bombs) {
        expect(gameState.bombs[bombId].countdown).toBe(0);
      }

      // player a should have a positive score, and not d
      expect(gameState.players['a'].score).toBe(0);
      expect(gameState.players['d'].score).toBeGreaterThan(0);
    });

    test('should give points at the closest attacker if two bombs explode at the same time (1)', () => {
      // player d is at bottom right (4, 2) then comes between a and b at (2, 0)
      simulateTick({ d: AllActions.Left });
      simulateTick({ d: AllActions.Left });
      simulateTick({ d: AllActions.Up });
      simulateTick({ d: AllActions.Up });

      expect(gameState.players['d'].x).toBe(2);
      expect(gameState.players['d'].y).toBe(0);

      // both a and d drop a bomb at the same time
      simulateTick({ a: AllActions.Bomb, d: AllActions.Bomb });

      // both a and d flies away to escape the explosions
      simulateTick({ a: AllActions.Down, d: AllActions.Down });
      simulateTick({ a: AllActions.Down, d: AllActions.Down });
      simulateTick({ a: AllActions.Right, d: AllActions.Right });

      // a and d should be safe respectively at (1, 2) and (3, 2)
      expect(gameState.players['a'].x).toBe(1);
      expect(gameState.players['a'].y).toBe(2);

      expect(gameState.players['d'].x).toBe(3);
      expect(gameState.players['d'].y).toBe(2);

      // there should be two active bombs with the same countdown
      expect(Object.keys(gameState.bombs)).toHaveLength(2);
      expect(_.uniq(_.map(gameState.bombs, bomb => bomb.countdown))).toHaveLength(1);

      // wait for the bombs to explode at the same time
      const minCountdown = _.min(_.map(gameState.bombs, bomb => bomb.countdown)) as number;
      for (let i = 0; i < minCountdown; i++) {
        simulateTick({});
      }

      // the two bombs should be in an exploding state
      for (const bombId in gameState.bombs) {
        expect(gameState.bombs[bombId].countdown).toBe(0);
      }

      // as they exploded at the same time, it was not an explosion chain
      // the closest attacker get the points, so player d should have a positive score, and not player a
      expect(gameState.players['d'].score).toBeGreaterThan(0);
      expect(gameState.players['a'].score).toBe(0);
    });

    test('should give points at the closest attacker if two bombs explode at the same time (2)', () => {
      // player b (victim) is at top right (4, 0) then go to (3, 0)
      simulateTick({ b: AllActions.Left });

      expect(gameState.players['b'].x).toBe(3);
      expect(gameState.players['b'].y).toBe(0);

      // player a is at top left (0, 0) then go to (1, 0)
      simulateTick({ a: AllActions.Right });

      expect(gameState.players['a'].x).toBe(1);
      expect(gameState.players['a'].y).toBe(0);

      // player d is at bottom right (4, 2) then go to (4, 0)
      simulateTick({ d: AllActions.Up });
      simulateTick({ d: AllActions.Up });

      expect(gameState.players['d'].x).toBe(4);
      expect(gameState.players['d'].y).toBe(0);

      // both a and d drop a bomb at the same time
      simulateTick({ a: AllActions.Bomb, d: AllActions.Bomb });

      // both a and d flies away to escape the explosions
      simulateTick({ a: AllActions.Left, d: AllActions.Down });
      simulateTick({ a: AllActions.Down, d: AllActions.Stay });

      // a and d should be safe respectively at (0, 1) and (4, 1)
      expect(gameState.players['a'].x).toBe(0);
      expect(gameState.players['a'].y).toBe(1);

      expect(gameState.players['d'].x).toBe(4);
      expect(gameState.players['d'].y).toBe(1);

      // there should be two active bombs with the same countdown
      expect(Object.keys(gameState.bombs)).toHaveLength(2);
      expect(_.uniq(_.map(gameState.bombs, bomb => bomb.countdown))).toHaveLength(1);

      // wait for the bombs to explode at the same time
      const minCountdown = _.min(_.map(gameState.bombs, bomb => bomb.countdown)) as number;
      for (let i = 0; i < minCountdown; i++) {
        simulateTick({});
      }

      // the two bombs should be in an exploding state
      for (const bombId in gameState.bombs) {
        expect(gameState.bombs[bombId].countdown).toBe(0);
      }

      // as they exploded at the same time, it was not an explosion chain
      // the closest attacker get the points, so player d should have a positive score, and not player a
      expect(gameState.players['d'].score).toBeGreaterThan(0);
      expect(gameState.players['a'].score).toBe(0);
    });

    test('should give points at the first exploded bomb that could react the victim even if there was another bomb on the way', () => {
      // both players a and d can both hit player b from a distance
      gameState.players['a'].bombRange = Math.max(gameState.width, gameState.height);
      gameState.players['d'].bombRange = gameState.players['a'].bombRange;

      // player d is at bottom right (4, 2) then comes between a and b at (2, 0)
      simulateTick({ d: AllActions.Left });
      simulateTick({ d: AllActions.Left });
      simulateTick({ d: AllActions.Up });
      simulateTick({ d: AllActions.Up });

      expect(gameState.players['d'].x).toBe(2);
      expect(gameState.players['d'].y).toBe(0);

      // a drops a bomb
      simulateTick({ a: AllActions.Bomb });

      // d also drops a bomb but one tick after a
      simulateTick({ d: AllActions.Bomb });

      // both a and d flies away to escape the explosions
      simulateTick({ a: AllActions.Down, d: AllActions.Down });
      simulateTick({ a: AllActions.Down, d: AllActions.Down });
      simulateTick({ a: AllActions.Right, d: AllActions.Right });

      // a and d should be safe respectively at (1, 2) and (3, 2)
      expect(gameState.players['a'].x).toBe(1);
      expect(gameState.players['a'].y).toBe(2);

      expect(gameState.players['d'].x).toBe(3);
      expect(gameState.players['d'].y).toBe(2);

      // there should be two active bombs with two different countdown
      expect(Object.keys(gameState.bombs)).toHaveLength(2);
      expect(_.uniq(_.map(gameState.bombs, bomb => bomb.countdown))).toHaveLength(2);

      // a's bomb can reach player b but the explosions encounters d's non-yet-exploded bomb
      // d's bomb also explodes, so both bombs can now reach player b, but the death responsibility is given to a
      // wait for the bombs to explode
      const minCountdown = _.min(_.map(gameState.bombs, bomb => bomb.countdown)) as number;
      for (let i = 0; i < minCountdown; i++) {
        simulateTick({});
      }

      // the two bombs should be in an exploding state as the first one triggered the second
      for (const bombId in gameState.bombs) {
        expect(gameState.bombs[bombId].countdown).toBe(0);
      }

      // player a should have a positive score, and not d
      expect(gameState.players['a'].score).toBeGreaterThan(0);
      expect(gameState.players['d'].score).toBe(0);
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
