import _ from 'lodash';

import {
  ARE_PLAYERS_INVINCIBLE,
  DEFAULT_BOMB_COUNTDOWN,
  DEFAULT_BOMB_RANGE,
  DEFAULT_LIVES,
  SUDDEN_DEATH_STARTS_AT
} from '../common/constants';
import { MapSchema, Schema, type } from '@colyseus/schema';
import { ActionCode, Actions, IBomb, IGameState, IHasPos, IPlayer, TileCode, Tiles } from '../common/types';
import { replaceCharAt } from '../common/utils';

// prettier-ignore
const defaultMap: string[] = [
  '..+++++++++..',
  '.#+#+#+#+#.#.',
  '++.+.++++++++',
  '+#+#+#+#+#.#.',
  '.+++++++.++++',
  '+#+#+#.#+#.#.',
  '+.+..++..++++',
  '+#+#+#+#+#.#+',
  '.+.++++++..+.',
  '.#+#+#+#+#+#.',
  '..+++++++++..'
];

export class Player extends Schema implements IPlayer {
  @type('string')
  id: string = '';

  @type('string')
  name: string = '';

  @type('boolean')
  connected: boolean = true;

  @type('number')
  x: number = 0;

  @type('number')
  y: number = 0;

  @type('number')
  bombsLeft: number = 1;

  @type('number')
  maxBombs: number = 1;

  @type('number')
  bombRange: number = DEFAULT_BOMB_RANGE;

  @type('boolean')
  alive: boolean = true;

  @type('number')
  lives: number = DEFAULT_LIVES;
}

export class Bomb extends Schema implements IBomb {
  @type('string')
  playerId: string = '';

  @type('number')
  countdown: number = 0;

  @type('number')
  range: number = 1;

  @type('number')
  x: number = 0;

  @type('number')
  y: number = 0;
}

type PosIncrementer = (pos: IHasPos) => void;

const positionIncrementers: { [mov: string]: PosIncrementer } = {
  [Actions.Up]: (pos: IHasPos) => pos.y--,
  [Actions.Down]: (pos: IHasPos) => pos.y++,
  [Actions.Left]: (pos: IHasPos) => pos.x--,
  [Actions.Right]: (pos: IHasPos) => pos.x++
};

let objectCounter = 0;

export class GameState extends Schema implements IGameState {
  private static readonly DefaultWidth: number = defaultMap[0].length;
  private static readonly DefaultHeight: number = defaultMap.length;

  private static readonly StartPositions: Array<IHasPos> = [
    { x: 0, y: 0 },
    { x: GameState.DefaultWidth - 1, y: 0 },
    { x: 0, y: GameState.DefaultHeight - 1 },
    { x: GameState.DefaultWidth - 1, y: GameState.DefaultHeight - 1 }
  ];

  @type('number')
  state: -1 | 0 | 1 = -1;

  @type('number')
  tick: number = 0;

  @type('string')
  tiles: string = defaultMap.join('');

  @type({ map: Player })
  players: { [id: string]: Player } = new MapSchema<Player>();

  @type({ map: Bomb })
  bombs: { [id: string]: Bomb } = new MapSchema<Bomb>();

  @type('string')
  explosions: string = '';

  @type('number')
  width: number = GameState.DefaultWidth;

  @type('number')
  height: number = GameState.DefaultHeight;

  @type('number')
  tickDuration: number = 0;

  public isPlaying(): boolean {
    return this.state === 0;
  }

  public isGameEnded(): boolean {
    return this.state === 1;
  }

  private isOutOfBound(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;

    const idx = this.coordToTileIndex(x, y);
    return idx >= this.tiles.length;
  }

  public getTileAt(x: number, y: number): TileCode {
    if (this.isOutOfBound(x, y)) return Tiles.OutOfBound;

    const idx = this.coordToTileIndex(x, y);
    return this.tiles[idx] as TileCode;
  }

  public setTileAt(x: number, y: number, newTile: TileCode): void {
    if (this.isOutOfBound(x, y) || newTile.length !== 1) return;

    const idx = this.coordToTileIndex(x, y);
    this.tiles = replaceCharAt(this.tiles, idx, newTile);
  }

  public findActiveBombAt(x: number, y: number): IBomb | undefined {
    return _.find(this.bombs, b => b.countdown > 0 && b.x === x && b.y === y);
  }

  public findAlivePlayerAt(x: number, y: number): IPlayer | undefined {
    return _.find(this.players, p => p.alive && p.x === x && p.y === y);
  }

  public refresh() {
    this.unleashSuddenDeath();
    this.computeBombCountdownAndPlayerBombsLeft();
  }

  private suddenDeathPos: IHasPos = {
    x: 0,
    y: 0
  };

  private unleashSuddenDeath() {
    if (this.isPlaying() && this.tick >= SUDDEN_DEATH_STARTS_AT) {
      const idx = this.coordToTileIndex(this.suddenDeathPos.x, this.suddenDeathPos.y);
      this.tiles = replaceCharAt(this.tiles, idx, Tiles.Wall);

      const victim = this.findAlivePlayerAt(this.suddenDeathPos.x, this.suddenDeathPos.y);
      if (victim) this.killPlayer(victim);

      [this.suddenDeathPos.x, this.suddenDeathPos.y] = this.tileIndexToCoord(idx + 1);
    }
  }

  private computeBombCountdownAndPlayerBombsLeft() {
    const playerBombCounts: { [playerId: string]: number } = {};

    for (const playerId in this.players) {
      playerBombCounts[playerId] = 0;
    }

    _.forEach(this.bombs, (bomb: IBomb) => {
      bomb.countdown -= 1;
      if (bomb.countdown >= 0) playerBombCounts[bomb.playerId]++;
    });

    for (const playerId in this.players) {
      const player = this.players[playerId];
      player.bombsLeft = player.maxBombs - playerBombCounts[playerId];
    }
  }

  public addPlayer(id: string, name: string) {
    const player = new Player();

    player.id = id;
    player.name = name;

    const playerCount = Object.keys(this.players).length;
    if (playerCount >= GameState.StartPositions.length) throw new Error('More players than starting spots');

    const startPos = GameState.StartPositions[playerCount];
    player.x = startPos.x;
    player.y = startPos.y;

    this.players[id] = player;
  }

  public hitPlayer(player: IPlayer) {
    if (!ARE_PLAYERS_INVINCIBLE) {
      if (player.lives > 0) {
        player.lives--;

        if (player.lives <= 0) {
          this.killPlayer(player);
        }
      }
    }
  }

  public killPlayer(player: IPlayer) {
    player.lives = 0;
    player.alive = false;
    player.bombsLeft = 0;
    player.maxBombs = 0;
    player.bombRange = 0;
  }

  public movePlayer(player: Player, movement: ActionCode) {
    if (movement === Actions.Stay) return;

    const posIncrementer = positionIncrementers[movement];
    if (!posIncrementer) return;

    const nextPos: IHasPos = {
      x: player.x,
      y: player.y
    };

    posIncrementer(nextPos);

    const nextTile = this.getTileAt(nextPos.x, nextPos.y);
    if (nextTile === Tiles.OutOfBound) return;

    if (nextTile === Tiles.Empty) {
      const otherPlayer = this.findAlivePlayerAt(nextPos.x, nextPos.y);
      if (otherPlayer) return;

      const bomb = this.findActiveBombAt(nextPos.x, nextPos.y);
      if (bomb) return;

      player.x = nextPos.x;
      player.y = nextPos.y;
    }
  }

  public plantBomb(player: Player) {
    const hasEnoughBombs = player.bombsLeft > 0;
    if (!hasEnoughBombs) return;

    const existingBomb = this.findActiveBombAt(player.x, player.y);
    if (!existingBomb) {
      const newBomb = new Bomb();

      newBomb.x = player.x;
      newBomb.y = player.y;
      newBomb.range = player.bombRange;
      newBomb.playerId = player.id;
      newBomb.countdown = DEFAULT_BOMB_COUNTDOWN;

      const bombId = objectCounter++ + '';
      this.bombs[bombId] = newBomb;
      player.bombsLeft--;
    }
  }

  public runBombs() {
    const visitedBombs = new Set<IBomb>(); // avoid handling bombs twice
    const explosionChain: IBomb[] = []; // FIFO
    const deletedBombIds = new Set<string>();
    const explosionPositions = new Set<string>();
    const destroyedBlockPositions = new Set<string>();
    const hitPlayers = new Set<string>();

    // 1) detect zero-countdown exploding bombs
    for (const bombId in this.bombs) {
      const bomb = this.bombs[bombId];

      // cleanup already exploded bomb
      if (bomb.countdown < 0) {
        deletedBombIds.add(bombId);
        continue;
      }

      // bomb explodes
      if (bomb.countdown === 0) {
        explosionChain.push(bomb);
        visitedBombs.add(bomb);
      }
    }

    for (const deletedBombId of deletedBombIds) {
      delete this.bombs[deletedBombId];
    }

    const propagateExplosion = (bomb: IBomb, posIncrementer: PosIncrementer) => {
      const pos: IHasPos = { x: bomb.x, y: bomb.y };
      explosionPositions.add(`${pos.x}:${pos.y}`);

      const victim = this.findAlivePlayerAt(bomb.x, bomb.y);
      if (victim) hitPlayers.add(victim.id);

      for (let i = 1; i <= bomb.range; i++) {
        posIncrementer(pos);

        const tile = this.getTileAt(pos.x, pos.y);

        // destroy block and do not spread explosion beyond that
        if (tile === Tiles.Block) {
          explosionPositions.add(`${pos.x}:${pos.y}`);
          destroyedBlockPositions.add(`${pos.x}:${pos.y}`);
          return;
        }

        // check if hitting another bomb / player / bonus
        if (tile === Tiles.Empty) {
          const otherBomb = this.findActiveBombAt(pos.x, pos.y);
          if (otherBomb && !visitedBombs.has(otherBomb)) {
            explosionChain.push(otherBomb);
            visitedBombs.add(otherBomb);
          }

          const victim = this.findAlivePlayerAt(pos.x, pos.y);
          if (victim) hitPlayers.add(victim.id);

          // TODO destroy bonus
          explosionPositions.add(`${pos.x}:${pos.y}`);
        }
        // nothing to do on walls or out of bounds
        else {
          return;
        }
      }
    };

    // 2) propagate explosion and detonate other bombs on the way
    while (explosionChain.length > 0) {
      const bomb = explosionChain.shift() as IBomb;
      bomb.countdown = 0;

      // find other bombs that would explode and their victims
      propagateExplosion(bomb, positionIncrementers[Actions.Up]);
      propagateExplosion(bomb, positionIncrementers[Actions.Down]);
      propagateExplosion(bomb, positionIncrementers[Actions.Left]);
      propagateExplosion(bomb, positionIncrementers[Actions.Right]);
    }

    // 3) remove destroyed walls now otherwise too many walls could have been destroyed
    for (const posStr of destroyedBlockPositions) {
      // TODO we might want to drop a bonus here :tada:!
      const [x, y] = posStr.split(':');
      this.setTileAt(Number(x), Number(y), Tiles.Empty);
    }

    // 4) apply damage to players
    for (const playerId of hitPlayers) {
      this.hitPlayer(this.players[playerId]);
    }

    // TODO add a number to each explosion to represent its explosion time so the client can display a real explosion chain
    this.explosions = [...explosionPositions].join(';');
  }

  private coordToTileIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  private tileIndexToCoord(idx: number): number[] {
    const x = idx % this.width;
    const y = Math.floor(idx / this.width);

    return [x, y];
  }
}
