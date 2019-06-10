import _ from 'lodash';

import { ARE_PLAYERS_INVINCIBLE, DEFAULT_BOMB_COUNTDOWN, DEFAULT_BOMB_RANGE } from '../common/constants';
import { MapSchema, Schema, type } from '@colyseus/schema';
import { Action, Movement, TileKind } from './types';
import { IBomb, IBonus, IGameState, IHasPos, IPlayer } from '../common/interfaces';

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

export class Bonus extends Schema implements IBonus {
  @type('string')
  type: string = '';

  @type('number')
  x: number = 0;

  @type('number')
  y: number = 0;
}

type PosIncrementer = (pos: IHasPos) => void;

const positionIncrementers: { [mov: string]: PosIncrementer } = {
  [Movement.Up]: (pos: IHasPos) => pos.y--,
  [Movement.Down]: (pos: IHasPos) => pos.y++,
  [Movement.Left]: (pos: IHasPos) => pos.x--,
  [Movement.Right]: (pos: IHasPos) => pos.x++
};

let objectCounter = 0;

export class GameState extends Schema implements IGameState {
  private static readonly DefaultWidth: number = defaultMap[0].length;
  private static readonly DefaultHeight: number = defaultMap.length;

  private static readonly StartPositions: Array<{ x: number; y: number }> = [
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

  @type({ map: Bonus })
  bonuses: { [id: string]: Bonus } = new MapSchema<Bonus>();

  @type('string')
  explosions: string = '';

  @type('number')
  width: number = GameState.DefaultWidth;

  @type('number')
  height: number = GameState.DefaultHeight;

  @type('number')
  tickDuration: number = 0;

  public isWaitingForPlayers(): boolean {
    return this.state === -1;
  }

  public isPlaying(): boolean {
    return this.state === 0;
  }

  public isEnded(): boolean {
    return this.state === 1;
  }

  private isOutOfBound(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;

    const idx = y * this.width + x;
    return idx >= this.tiles.length;
  }

  public getTileAt(x: number, y: number): TileKind {
    if (this.isOutOfBound(x, y)) return TileKind.OutOfBound;

    const idx = y * this.width + x;
    return this.tiles[idx] as TileKind;
  }

  public setTileAt(x: number, y: number, newTile: TileKind) {
    if (this.isOutOfBound(x, y) || newTile.length !== 1) return;

    const idx = y * this.width + x;
    this.tiles = this.tiles.substr(0, idx) + newTile + this.tiles.substr(idx + 1);
  }

  public findActiveBombAt(x: number, y: number): IBomb | undefined {
    return _.find(this.bombs, b => b.countdown > 0 && b.x === x && b.y === y);
  }

  public findAlivePlayerAt(x: number, y: number): IPlayer | undefined {
    return _.find(this.players, p => p.alive && p.x === x && p.y === y);
  }

  public refresh() {
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

    // no spot left ?
    const playerCount = Object.keys(this.players).length;
    if (playerCount >= GameState.StartPositions.length) return;

    const startPos = GameState.StartPositions[playerCount];
    player.x = startPos.x;
    player.y = startPos.y;

    this.players[id] = player;
  }

  public killPlayer(player: IPlayer) {
    if (!ARE_PLAYERS_INVINCIBLE) {
      player.alive = false;
      player.bombsLeft = 0;
      player.maxBombs = 0;
      player.bombRange = 0;
    }
  }

  public movePlayer(playerId: string, player: Player, movement: string) {
    if (movement === Movement.Stay) return;

    const posIncrementer = positionIncrementers[movement];
    if (!posIncrementer) return;

    const nextPos: IHasPos = {
      x: player.x,
      y: player.y
    };

    posIncrementer(nextPos);

    const nextTile = this.getTileAt(nextPos.x, nextPos.y);
    if (nextTile === TileKind.OutOfBound) return;

    if (nextTile === TileKind.Empty) {
      const otherPlayer = this.findAlivePlayerAt(nextPos.x, nextPos.y);
      if (otherPlayer) return;

      const bomb = this.findActiveBombAt(nextPos.x, nextPos.y);
      if (bomb) return;

      player.x = nextPos.x;
      player.y = nextPos.y;
    }
  }

  public executeAction(playerId: string, player: Player, action: Action) {
    if (action === Action.PlantBomb) {
      const hasEnoughBombs = player.bombsLeft > 0;
      if (!hasEnoughBombs) return;

      const existingBomb = this.findActiveBombAt(player.x, player.y);
      if (!existingBomb) {
        const newBomb = new Bomb();

        newBomb.x = player.x;
        newBomb.y = player.y;
        newBomb.range = player.bombRange;
        newBomb.playerId = playerId;
        newBomb.countdown = DEFAULT_BOMB_COUNTDOWN;

        const bombId = objectCounter++ + '';
        this.bombs[bombId] = newBomb;
        player.bombsLeft--;
      }
    }
  }

  public runBombs() {
    const visitedBombs = new Set<IBomb>(); // avoid handling bombs twice
    const explosionChain: IBomb[] = []; // FIFO
    const deletedBombIds = new Set<string>();
    const explosionPositions = new Set<string>();
    const destroyedBlockPositions = new Set<string>();

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

      for (let i = 1; i <= bomb.range; i++) {
        posIncrementer(pos);

        const tile = this.getTileAt(pos.x, pos.y);

        // destroy block and do not spread explosion beyond that
        if (tile === TileKind.Block) {
          explosionPositions.add(`${pos.x}:${pos.y}`);
          destroyedBlockPositions.add(`${pos.x}:${pos.y}`);
          return;
        }

        // check if hitting another bomb / player / bonus
        if (tile === TileKind.Empty) {
          const otherBomb = this.findActiveBombAt(pos.x, pos.y);
          if (otherBomb && !visitedBombs.has(otherBomb)) {
            explosionChain.push(otherBomb);
            visitedBombs.add(otherBomb);
          }

          const victim = this.findAlivePlayerAt(pos.x, pos.y);
          if (victim) this.killPlayer(victim);

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

      const victim = this.findAlivePlayerAt(bomb.x, bomb.y);
      if (victim) this.killPlayer(victim);

      // find other bombs that would explode and their victims
      propagateExplosion(bomb, positionIncrementers[Movement.Up]);
      propagateExplosion(bomb, positionIncrementers[Movement.Down]);
      propagateExplosion(bomb, positionIncrementers[Movement.Left]);
      propagateExplosion(bomb, positionIncrementers[Movement.Right]);
    }

    // 3) remove destroyed walls now otherwise too many walls could have been destroyed
    for (const posStr of destroyedBlockPositions) {
      // TODO we might want to drop a bonus here :tada:!
      const [x, y] = posStr.split(':');
      this.setTileAt(Number(x), Number(y), TileKind.Empty);
    }

    // TODO add a number to each explosion to represent its explosion time so the client can display a real explosion chain
    this.explosions = [...explosionPositions].join(';');
  }
}
