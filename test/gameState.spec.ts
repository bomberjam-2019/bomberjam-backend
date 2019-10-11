import { ActionCode, Actions, IClientMessage, IPlayer } from '../src/types';
import { GameState } from '../src/server/state';
import { POINTS_KILLED_PLAYER, SUDDEN_DEATH_COUNTDOWN } from '../src/constants';
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
      for (let i = 0; i < SUDDEN_DEATH_COUNTDOWN + tileCount; i++) {
        simulateTick({});
      }

      assert.strictEqual(gameState.state, 1);
      assert.strictEqual(gameState.suddenDeathEnabled, true);
      assert.strictEqual(gameState.suddenDeathCountdown, 0);

      const playersAliveCount = _.filter(gameState.players, (p: IPlayer) => p.alive).length;
      assert.strictEqual(playersAliveCount, 1);
    });

    it('sudden death is delayed when game is paused', () => {
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

      assert.strictEqual(gameState.state, 0);
      assert.strictEqual(gameState.suddenDeathEnabled, false);
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
      assert.strictEqual(POINTS_KILLED_PLAYER > 0, true);

      // start game with 4 players
      gameState = new GameState(asciiMap);
      addPlayers('a', 'b', 'c', 'd');
      gameState.isSimulationPaused = false;

      // increase all player bomb range just enough to make explosions overlap
      for (const playerId in gameState.players) {
        gameState.players[playerId].bombRange = 3;
      }
    });

    it('should give points to the player that triggers an explosion chain', () => {
      // all players scores should be zero at the beginning of the game
      for (const playerId in gameState.players) {
        assert.strictEqual(gameState.players[playerId].score, 0);
      }

      // kill player c because he does not participate in this test and will block player a on his way
      gameState.killPlayer(gameState.players['c']);

      // player a is at top left (0, 0)
      assert.strictEqual(gameState.players['a'].x, 0);
      assert.strictEqual(gameState.players['a'].y, 0);

      // player b (victim) is at top right (4, 0)
      assert.strictEqual(gameState.players['b'].x, 4);
      assert.strictEqual(gameState.players['b'].y, 0);

      // player d is at bottom right (4, 2) then comes between a and b at (2, 0)
      simulateTick({ d: Actions.Left });
      simulateTick({ d: Actions.Left });
      simulateTick({ d: Actions.Up });
      simulateTick({ d: Actions.Up });

      assert.strictEqual(gameState.players['d'].x, 2);
      assert.strictEqual(gameState.players['d'].y, 0);

      // a drops a bomb
      simulateTick({ a: Actions.Bomb });

      // d also drops a bomb but one tick after a
      simulateTick({ d: Actions.Bomb });

      // both a and d flies away to escape the explosions
      simulateTick({ a: Actions.Down, d: Actions.Down });
      simulateTick({ a: Actions.Down, d: Actions.Down });
      simulateTick({ a: Actions.Right, d: Actions.Right });

      // a and d should be safe respectively at (1, 2) and (3, 2)
      assert.strictEqual(gameState.players['a'].x, 1);
      assert.strictEqual(gameState.players['a'].y, 2);

      assert.strictEqual(gameState.players['d'].x, 3);
      assert.strictEqual(gameState.players['d'].y, 2);

      // there should be two active bombs with two different countdown
      assert.strictEqual(Object.keys(gameState.bombs).length, 2);
      assert.strictEqual(_.uniq(_.map(gameState.bombs, bomb => bomb.countdown)).length, 2);

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
        assert.strictEqual(gameState.bombs[bombId].countdown, 0);
      }

      // player a should have a positive score, and not d
      assert.strictEqual(gameState.players['a'].score > 0, true);
      assert.strictEqual(gameState.players['d'].score === 0, true);
    });

    it('should give points at the closest attacker if two bombs explode at the same time', () => {
      // all players scores should be zero at the beginning of the game
      for (const playerId in gameState.players) {
        assert.strictEqual(gameState.players[playerId].score, 0);
      }

      // kill player c because he does not participate in this test and will block player a on his way
      gameState.killPlayer(gameState.players['c']);

      // player a is at top left (0, 0)
      assert.strictEqual(gameState.players['a'].x, 0);
      assert.strictEqual(gameState.players['a'].y, 0);

      // player b (victim) is at top right (4, 0)
      assert.strictEqual(gameState.players['b'].x, 4);
      assert.strictEqual(gameState.players['b'].y, 0);

      // player d is at bottom right (4, 2) then comes between a and b at (2, 0)
      simulateTick({ d: Actions.Left });
      simulateTick({ d: Actions.Left });
      simulateTick({ d: Actions.Up });
      simulateTick({ d: Actions.Up });

      assert.strictEqual(gameState.players['d'].x, 2);
      assert.strictEqual(gameState.players['d'].y, 0);

      // both a and d drop a bomb at the same time
      simulateTick({ a: Actions.Bomb, d: Actions.Bomb });

      // both a and d flies away to escape the explosions
      simulateTick({ a: Actions.Down, d: Actions.Down });
      simulateTick({ a: Actions.Down, d: Actions.Down });
      simulateTick({ a: Actions.Right, d: Actions.Right });

      // a and d should be safe respectively at (1, 2) and (3, 2)
      assert.strictEqual(gameState.players['a'].x, 1);
      assert.strictEqual(gameState.players['a'].y, 2);

      assert.strictEqual(gameState.players['d'].x, 3);
      assert.strictEqual(gameState.players['d'].y, 2);

      // there should be two active bombs with the same countdown
      assert.strictEqual(Object.keys(gameState.bombs).length, 2);
      assert.strictEqual(_.uniq(_.map(gameState.bombs, bomb => bomb.countdown)).length, 1);

      // wait for the bombs to explode at the same time
      const minCountdown = _.min(_.map(gameState.bombs, bomb => bomb.countdown)) as number;
      for (let i = 0; i < minCountdown; i++) {
        simulateTick({});
      }

      // the two bombs should be in an exploding state
      for (const bombId in gameState.bombs) {
        assert.strictEqual(gameState.bombs[bombId].countdown, 0);
      }

      // as they exploded at the same time, it was not an explosion chain
      // the closest attacker get the points, so player d should have a positive score, and not player a
      assert.strictEqual(gameState.players['d'].score > 0, true);
      assert.strictEqual(gameState.players['a'].score === 0, true);
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
