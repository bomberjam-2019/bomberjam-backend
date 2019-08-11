import {
  ARE_PLAYERS_INVINCIBLE,
  BOMB_BONUS_COUNT,
  DEFAULT_BOMB_COUNTDOWN,
  DEFAULT_BOMB_RANGE,
  DEFAULT_LIVES,
  FIRE_BONUS_COUNT,
  SUDDEN_DEATH_STARTS_AT
} from '../constants';
import {
  ActionCode,
  Actions,
  BonusCode,
  IBomb,
  IBonus,
  IClientMessage,
  IGameState,
  IHasPos,
  IPlayer,
  MoveCode,
  TileCode,
  Tiles
} from '../types';
import { MapSchema, Schema, type } from '@colyseus/schema';

import _ from 'lodash';

// prettier-ignore
const defaultAsciiMap: string[] = [
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

  @type('int8')
  x: number = 0;

  @type('int8')
  y: number = 0;

  @type('int8')
  bombsLeft: number = 1;

  @type('int8')
  maxBombs: number = 1;

  @type('int8')
  bombRange: number = DEFAULT_BOMB_RANGE;

  @type('boolean')
  alive: boolean = true;

  @type('int8')
  lives: number = DEFAULT_LIVES;

  @type('boolean')
  hasWon: boolean = false;
}

export class Bomb extends Schema implements IBomb {
  @type('string')
  playerId: string = '';

  @type('int8')
  countdown: number = 0;

  @type('int8')
  range: number = 1;

  @type('int8')
  x: number = 0;

  @type('int8')
  y: number = 0;
}

export class Bonus extends Schema implements IBonus {
  @type('int8')
  x: number = 0;

  @type('int8')
  y: number = 0;

  @type('string')
  type: BonusCode = 'bomb';
}

type PosIncrementer = (pos: IHasPos) => void;

const positionIncrementers: { [mov: string]: PosIncrementer } = {
  [Actions.Up]: (pos: IHasPos) => pos.y--,
  [Actions.Down]: (pos: IHasPos) => pos.y++,
  [Actions.Left]: (pos: IHasPos) => pos.x--,
  [Actions.Right]: (pos: IHasPos) => pos.x++,
  [Actions.Stay]: () => {}
};

let objectCounter = 0;

export class GameState extends Schema implements IGameState {
  @type('string')
  roomId: string = '';

  @type('string')
  ownerId: string = '';

  @type('int8')
  state: -1 | 0 | 1 = -1;

  @type('int32')
  tick: number = 0;

  @type('string')
  tiles: string = '';

  @type({ map: Player })
  players: { [id: string]: Player } = new MapSchema<Player>();

  @type({ map: Bomb })
  bombs: { [id: string]: Bomb } = new MapSchema<Bomb>();

  @type({ map: Bonus })
  bonuses: { [id: string]: Bonus } = new MapSchema<Bonus>();

  @type('string')
  explosions: string = '';

  @type('int8')
  width: number = 0;

  @type('int8')
  height: number = 0;

  @type('int16')
  tickDuration: number = 0;

  @type('boolean')
  suddenDeathEnabled: boolean = false;

  // TODO when simulation is pause, memorize the tick to ajust the sudden death activation
  @type('boolean')
  isSimulationPaused: boolean = true;

  private startPositions: Array<IHasPos> = [];

  private suddenDeathCountdown: number = SUDDEN_DEATH_STARTS_AT;

  private plannedBonuses: { [tileIndex: number]: BonusCode } = {};

  constructor(asciiMap?: string[]) {
    super();

    if (!asciiMap || !GameState.isValidAsciiMap(asciiMap)) {
      asciiMap = defaultAsciiMap;
    }

    this.tiles = asciiMap.join('');
    this.width = asciiMap[0].length;
    this.height = asciiMap.length;
    this.startPositions = [
      { x: 0, y: 0 },
      { x: this.width - 1, y: 0 },
      { x: 0, y: this.height - 1 },
      { x: this.width - 1, y: this.height - 1 }
    ];

    this.planBonusPositions();
  }

  private static isValidAsciiMap(asciiMap: string[]) {
    if (!Array.isArray(asciiMap)) return false;
    if (asciiMap.length <= 1) return false;
    return !asciiMap.some(line => typeof line !== 'string' || line.length <= 1);
  }

  private planBonusPositions() {
    // TODO assign random tiles here, instead of hardcoded map

    const potentialBonusPositions = new Set<number>();

    for (let i = 0; i < this.tiles.length; i++) {
      const char = this.tiles[i];
      if (char === Tiles.Block) potentialBonusPositions.add(i);
    }

    let bombBonusCount = BOMB_BONUS_COUNT;
    let fireBonusCount = FIRE_BONUS_COUNT;
    let totalBonusCount = bombBonusCount + fireBonusCount;

    // shrinking bonuses count to the size of the map
    if (bombBonusCount + fireBonusCount > potentialBonusPositions.size) {
      const bombBonusRatio = bombBonusCount / totalBonusCount;
      const fireBonusRatio = fireBonusCount / totalBonusCount;

      bombBonusCount = Math.floor(potentialBonusPositions.size * bombBonusRatio);
      fireBonusCount = Math.floor(potentialBonusPositions.size * fireBonusRatio);
    }

    // TODO fair bonus positioning instead of random

    for (let i = 0; i < bombBonusCount; i++) {
      const idx = _.sample([...potentialBonusPositions]) as number;
      this.plannedBonuses[idx] = 'bomb';
      potentialBonusPositions.delete(idx);
    }

    for (let i = 0; i < fireBonusCount; i++) {
      const idx = _.sample([...potentialBonusPositions]) as number;
      this.plannedBonuses[idx] = 'fire';
      potentialBonusPositions.delete(idx);
    }
  }

  public isWaitingForPlayers(): boolean {
    return this.state === -1;
  }

  public isPlaying(): boolean {
    return this.state === 0;
  }

  public isGameEnded(): boolean {
    return this.state === 1;
  }

  public shuffleStartPositions() {
    this.startPositions = _.shuffle(this.startPositions);
  }

  private isOutOfBound(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;

    const idx = this.coordToTileIndex(x, y);
    return idx >= this.tiles.length;
  }

  private getTileAt(x: number, y: number): TileCode {
    if (this.isOutOfBound(x, y)) return Tiles.OutOfBound;

    const idx = this.coordToTileIndex(x, y);
    return this.tiles[idx] as TileCode;
  }

  private setTileAt(x: number, y: number, newTile: TileCode): void {
    if (this.isOutOfBound(x, y) || newTile.length !== 1) return;

    const idx = this.coordToTileIndex(x, y);
    this.tiles = GameState.replaceCharAt(this.tiles, idx, newTile);
  }

  private findActiveBombAt(x: number, y: number): IBomb | undefined {
    return _.find(this.bombs, b => b.countdown > 0 && b.x === x && b.y === y);
  }

  private findAlivePlayerAt(x: number, y: number): IPlayer | undefined {
    return _.find(this.players, p => p.alive && p.x === x && p.y === y);
  }

  private findDroppedBonusIndexAt(x: number, y: number): string | undefined {
    for (const bonusId in this.bonuses) {
      const bonus: IBonus = this.bonuses[bonusId];
      if (bonus.x === x && bonus.y === y) return bonusId;
    }
  }

  public applyClientMessages(messages: IClientMessage[]) {
    if (this.isPlaying()) {
      if (this.isSimulationPaused) return;

      this.unleashSuddenDeath();
      this.computeBombCountdownAndPlayerBombsLeft();

      for (const message of messages) {
        const player = this.players[message.playerId];
        if (player && player.connected && player.alive) {
          if (message.action === Actions.Bomb) {
            this.plantBomb(player);
          } else {
            this.movePlayer(player, message.action);
          }
        }
      }

      this.runBombs();
      this.changeStateIfGameEnded();
    } else if (this.isGameEnded()) {
      // end game cleanup
      for (const bombId in this.bombs) delete this.bombs[bombId];

      if (this.explosions.length > 0) this.explosions = '';
    }
  }

  private suddenDeathPos: IHasPos & { dir: MoveCode; iter: number } = {
    x: 0,
    y: 0,
    iter: 0,
    dir: 'right'
  };

  private unleashSuddenDeath() {
    this.suddenDeathCountdown--;

    if (this.suddenDeathCountdown <= 0) {
      this.suddenDeathCountdown = 0;

      if (!this.suddenDeathEnabled) {
        this.suddenDeathEnabled = true;
      }

      const idx = this.coordToTileIndex(this.suddenDeathPos.x, this.suddenDeathPos.y);
      this.tiles = GameState.replaceCharAt(this.tiles, idx, Tiles.Wall);

      const victim = this.findAlivePlayerAt(this.suddenDeathPos.x, this.suddenDeathPos.y);
      if (victim) this.killPlayer(victim);

      // walling bottom
      if (this.suddenDeathPos.dir === 'right' && this.suddenDeathPos.x + 1 >= this.width - this.suddenDeathPos.iter) {
        this.suddenDeathPos.dir = 'down';
      }
      // walling left
      else if (this.suddenDeathPos.dir === 'down' && this.suddenDeathPos.y + 1 >= this.height - this.suddenDeathPos.iter) {
        this.suddenDeathPos.dir = 'left';
      }
      // walling up
      else if (this.suddenDeathPos.dir === 'left' && this.suddenDeathPos.x - 1 < this.suddenDeathPos.iter) {
        this.suddenDeathPos.dir = 'up';
        this.suddenDeathPos.iter++;
      }
      // walling right
      else if (this.suddenDeathPos.dir === 'up' && this.suddenDeathPos.y - 1 < this.suddenDeathPos.iter) {
        this.suddenDeathPos.dir = 'right';
      }

      positionIncrementers[this.suddenDeathPos.dir](this.suddenDeathPos);
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

      if (player.bombsLeft < 0) player.bombsLeft = 0;
    }
  }

  private changeStateIfGameEnded() {
    const alivePlayers: IPlayer[] = [];

    for (const playerId in this.players) {
      const player = this.players[playerId];
      if (player.alive && player.connected) alivePlayers.push(player);
    }

    // game ended: all dead or only one player alive left
    if (alivePlayers.length <= 1) {
      this.state = 1;

      if (alivePlayers.length === 1) {
        alivePlayers[0].hasWon = true;
      }
    }
  }

  public addPlayer(id: string, name: string) {
    const player = new Player();

    player.id = id;
    player.name = name;

    const playerCount = Object.keys(this.players).length;
    if (playerCount >= this.startPositions.length) throw new Error('More players than starting spots');

    const startPos = this.startPositions[playerCount];
    player.x = startPos.x;
    player.y = startPos.y;

    this.players[id] = player;

    if (playerCount + 1 >= this.startPositions.length) {
      this.startGame();
    }
  }

  public startGame() {
    this.state = 0;
  }

  private hitPlayer(player: IPlayer) {
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
    player.bombsLeft = 0;
    player.maxBombs = 0;
    player.bombRange = 0;

    if (!player.hasWon) player.alive = false;
  }

  private movePlayer(player: Player, movement: ActionCode) {
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

      const bonusId = this.findDroppedBonusIndexAt(nextPos.x, nextPos.y);
      if (bonusId) {
        const bonus: IBonus = this.bonuses[bonusId];

        if (bonus.type === 'bomb') {
          player.maxBombs++;
        } else if (bonus.type === 'fire') {
          player.bombRange++;
        }

        delete this.bonuses[bonusId];
      }

      player.x = nextPos.x;
      player.y = nextPos.y;
    }
  }

  private plantBomb(player: Player) {
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

      const bombId = String(objectCounter++);
      this.bombs[bombId] = newBomb;
      player.bombsLeft--;

      if (player.bombsLeft < 0) player.bombsLeft = 0;
    }
  }

  private dropBonus(x: number, y: number, type: BonusCode) {
    const bonus = new Bonus();

    bonus.x = x;
    bonus.y = y;
    bonus.type = type;

    const bonusId = String(objectCounter++);
    this.bonuses[bonusId] = bonus;
  }

  private runBombs() {
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

          const bonusId = this.findDroppedBonusIndexAt(pos.x, pos.y);
          if (bonusId) delete this.bonuses[bonusId];

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
      const [x, y] = posStr.split(':').map(Number);
      this.setTileAt(x, y, Tiles.Empty);

      const idx = this.coordToTileIndex(x, y);
      const bonusType = this.plannedBonuses[idx];
      if (bonusType) {
        this.dropBonus(x, y, bonusType);
        delete this.plannedBonuses[idx];
      }
    }

    // 4) apply damage to players
    for (const playerId of hitPlayers) {
      this.hitPlayer(this.players[playerId]);
    }

    this.explosions = [...explosionPositions].join(';');
  }

  private coordToTileIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  // noinspection JSUnusedLocalSymbols
  private tileIndexToCoord(idx: number): number[] {
    const x = idx % this.width;
    const y = Math.floor(idx / this.width);

    return [x, y];
  }

  private static replaceCharAt(text: string, idx: number, newChar: string): string {
    return text.substr(0, idx) + newChar + text.substr(idx + 1);
  }
}
