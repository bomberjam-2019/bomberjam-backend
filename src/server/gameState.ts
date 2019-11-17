import _ from 'lodash';
import { MapSchema, Schema, type } from '@colyseus/schema';

import { ActionCode, AllActions, AllTiles, BonusCode, IClientMessage, IGameState, IHasPos, MoveCode, TileCode } from '../types';
import {
  BOMB_BONUS_COUNT,
  DEFAULT_BOMB_COUNTDOWN,
  FIRE_BONUS_COUNT,
  LOSE_BONUSES_ON_DEATH,
  PLAYER_COLORS,
  POINTS_BLOCK_DESTROYED,
  POINTS_DEATH,
  POINTS_KILLED_PLAYER,
  POINTS_LAST_SURVIVOR,
  POINTS_PER_ALIVE_TICK,
  RESPAWN_TIME,
  SUDDEN_DEATH_COUNTDOWN
} from '../constants';
import { EquatableSet } from '../utils';
import Player from './player';
import Bomb from './bomb';
import Bonus from './bonus';
import GameStateHistory from './gameStateHistory';

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

type PosIncrementer = (pos: IHasPos) => void;

const positionIncrementers: { [mov: string]: PosIncrementer } = {
  [AllActions.Up]: (pos: IHasPos) => pos.y--,
  [AllActions.Down]: (pos: IHasPos) => pos.y++,
  [AllActions.Left]: (pos: IHasPos) => pos.x--,
  [AllActions.Right]: (pos: IHasPos) => pos.x++,
  [AllActions.Stay]: () => {}
};

let objectCounter = 0;

export default class GameState extends Schema implements IGameState {
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

  @type('int8')
  width: number = 0;

  @type('int8')
  height: number = 0;

  @type('int16')
  tickDuration: number = 0;

  @type('int16')
  suddenDeathCountdown: number = SUDDEN_DEATH_COUNTDOWN;

  @type('boolean')
  suddenDeathEnabled: boolean = false;

  @type('boolean')
  isSimulationPaused: boolean = true;

  public shouldWriteHistoryToDiskWhenGameEnded: boolean = false;

  private readonly history: GameStateHistory;

  private readonly startPositions: IHasPos[] = [];

  private readonly plannedBonuses: { [tileIndex: number]: BonusCode } = {};

  private readonly playerColors: number[] = [];

  private firstPlayingTickExecuted: boolean = false;

  private endGameCleanupExecuted: boolean = false;

  private suddenDeathPos: IHasPos & { dir: MoveCode; iter: number } = {
    x: 0,
    y: 0,
    iter: 0,
    dir: 'right'
  };

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
    this.planPlayerColors();

    this.history = new GameStateHistory(this);
  }

  private static isValidAsciiMap(asciiMap: string[]) {
    if (!Array.isArray(asciiMap)) return false;
    if (asciiMap.length <= 1) return false;
    return !asciiMap.some(line => typeof line !== 'string' || line.length <= 1);
  }

  private planBonusPositions() {
    const potentialBonusPositions = new Set<number>();

    for (let i = 0; i < this.tiles.length; i++) {
      const char = this.tiles[i];
      if (char === AllTiles.Block) potentialBonusPositions.add(i);
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

  private planPlayerColors(): void {
    const shuffledColors = _.shuffle(PLAYER_COLORS);
    this.playerColors.push(...shuffledColors.slice(0, 4));
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
    const shuffledStartPositions = _.shuffle(this.startPositions);
    this.startPositions.length = 0;
    this.startPositions.push(...shuffledStartPositions);
  }

  private isOutOfBound(x: number, y: number): boolean {
    return x < 0 || y < 0 || x >= this.width || y >= this.height;
  }

  private getTileAt(x: number, y: number): TileCode {
    if (this.isOutOfBound(x, y)) return AllTiles.OutOfBound;

    const idx = this.coordToTileIndex(x, y);
    return this.tiles[idx] as TileCode;
  }

  private setTileAt(x: number, y: number, newTile: TileCode): void {
    if (this.isOutOfBound(x, y) || newTile.length !== 1) return;

    const idx = this.coordToTileIndex(x, y);
    this.tiles = GameState.replaceCharAt(this.tiles, idx, newTile);
  }

  private findActiveBombAt(x: number, y: number): Bomb | undefined {
    return _.find(this.bombs, b => b.countdown > 0 && b.x === x && b.y === y);
  }

  private findAlivePlayerAt(x: number, y: number): Player | undefined {
    return _.find(this.players, p => p.alive && p.x === x && p.y === y);
  }

  private findDroppedBonusIdAt(x: number, y: number): string | undefined {
    for (const bonusId in this.bonuses) {
      const bonus: Bonus = this.bonuses[bonusId];
      if (bonus.x === x && bonus.y === y) return bonusId;
    }
  }

  public executeNextTick(messages: IClientMessage[]) {
    if (this.isPlaying()) {
      if (!this.isSimulationPaused) {
        if (this.firstPlayingTickExecuted) {
          this.history.append(messages);
        } else {
          this.firstPlayingTickExecuted = true;
        }

        this.respawnPlayers();
        this.unleashSuddenDeath();
        this.runBombs();
        this.applyClientMessages(messages);
        this.changeStateIfGameEnded();
        this.addScorePerTick();
      }
    } else if (this.isGameEnded()) {
      this.executeEndGameCleanup(messages);
    }

    this.tick++;
  }

  private respawnPlayers() {
    for (const playerId in this.players) {
      const player = this.players[playerId];

      if (player.mustRespawn) {
        this.respawnPlayer(player);
      }

      if (player.respawning > 0) player.respawning--;
    }
  }

  private respawnPlayer(player: Player) {
    player.respawning = RESPAWN_TIME;
    player.mustRespawn = false;
    this.movePlayerToItsSpawnLocation(player);
  }

  private movePlayerToItsSpawnLocation(player: Player) {
    const position = Object.keys(this.players).indexOf(player.id);
    const startPosition = this.startPositions[position];

    this.movePlayerToAvailableLocationAround(player, startPosition.x, startPosition.y);
  }

  private movePlayerToAvailableLocationAround(player: Player, x: number, y: number) {
    const maxRadius = Math.max(this.width, this.height);

    for (let radius = 0; radius < maxRadius; radius++) {
      const minX = x - radius;
      const maxX = x + radius;
      const minY = y - radius;
      const maxY = y + radius;

      for (let oy = minY; oy <= maxY; oy++) {
        for (let ox = minX; ox <= maxX; ox++) {
          const tile = this.getTileAt(ox, oy);

          // cannot set a player location to an non-empty tile
          if (!(tile === AllTiles.Empty || tile === AllTiles.Explosion)) continue;

          // cannot set a player location to another alive player location
          const otherPlayer = this.findAlivePlayerAt(ox, oy);
          if (otherPlayer && otherPlayer.id !== player.id) continue;

          // cannot set a player location to an active bomb
          const bomb = this.findActiveBombAt(ox, oy);
          if (bomb) continue;

          // found a safe spot!
          player.x = ox;
          player.y = oy;
          return;
        }
      }
    }
  }

  private unleashSuddenDeath() {
    if (this.suddenDeathCountdown > 0) {
      this.suddenDeathCountdown--;
    }

    if (this.suddenDeathCountdown <= 0) {
      if (!this.suddenDeathEnabled) {
        this.suddenDeathEnabled = true;
      }

      const idx = this.coordToTileIndex(this.suddenDeathPos.x, this.suddenDeathPos.y);
      this.tiles = GameState.replaceCharAt(this.tiles, idx, AllTiles.Wall);

      const victim = this.findAlivePlayerAt(this.suddenDeathPos.x, this.suddenDeathPos.y);
      if (victim) this.killPlayer(victim);

      const bomb = this.findActiveBombAt(this.suddenDeathPos.x, this.suddenDeathPos.y);
      if (bomb && this.bombs[bomb.id]) delete this.bombs[bomb.id];

      const bonusId = this.findDroppedBonusIdAt(this.suddenDeathPos.x, this.suddenDeathPos.y);
      if (bonusId && this.bonuses[bonusId]) delete this.bonuses[bonusId];

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

  private applyClientMessages(messages: IClientMessage[]) {
    for (const message of messages) {
      const player = this.players[message.playerId];
      if (player && player.connected && player.alive) {
        if (message.action === AllActions.Bomb) {
          this.dropBomb(player);
        } else {
          this.movePlayer(player, message.action);
        }
      }
    }
  }

  private computeBombCountdownAndPlayerBombsLeft() {
    const playerBombCounts: { [playerId: string]: number } = {};

    for (const playerId in this.players) {
      playerBombCounts[playerId] = 0;
    }

    _.forEach(this.bombs, (bomb: Bomb) => {
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
    const alivePlayers: Player[] = [];

    for (const playerId in this.players) {
      const player = this.players[playerId];
      if (player.alive && player.connected) alivePlayers.push(player);
    }

    // game ended: all dead or only one player alive left
    if (alivePlayers.length <= 1) {
      this.state = 1;

      if (alivePlayers.length === 1) {
        alivePlayers[0].hasWon = true;
        alivePlayers[0].addScore(POINTS_LAST_SURVIVOR);
      }
    }
  }

  private addScorePerTick() {
    for (const playerId in this.players) {
      const player = this.players[playerId];
      if (player.alive) player.addScore(POINTS_PER_ALIVE_TICK);
    }
  }

  public addPlayer(id: string, name: string) {
    if (this.players[id]) throw new Error(`Player ${name} with ID ${id} already exists`);

    let playerCount = Object.keys(this.players).length;
    if (playerCount >= this.startPositions.length) throw new Error('More players than starting spots');

    const player = new Player();

    this.players[id] = player;
    playerCount++;

    player.id = id;
    player.name = name;
    player.color = this.playerColors[playerCount - 1];

    this.movePlayerToItsSpawnLocation(player);

    if (playerCount >= this.startPositions.length) {
      this.startGame();
    }
  }

  public startGame() {
    this.state = 0;
  }

  private hitPlayer(victim: Player, attacker: Player) {
    if (victim.respawning === 0 && !victim.mustRespawn) {
      victim.addScore(POINTS_DEATH);

      if (victim.id !== attacker.id) {
        attacker.addScore(POINTS_KILLED_PLAYER);
      }

      if (this.suddenDeathEnabled) {
        this.killPlayer(victim);
      } else {
        victim.mustRespawn = true;
        victim.respawning = RESPAWN_TIME;
      }
    }
  }

  public killPlayer(victim: Player) {
    // Only kill player if he is not the winner.
    if (!victim.hasWon) {
      if (LOSE_BONUSES_ON_DEATH) {
        victim.bombsLeft = 0;
        victim.maxBombs = 0;
        victim.bombRange = 0;
      }

      victim.alive = false;
    }
  }

  private movePlayer(player: Player, movement: ActionCode) {
    if (movement === AllActions.Stay) return;

    if (player.mustRespawn || player.respawning === RESPAWN_TIME - 1) return;

    const posIncrementer = positionIncrementers[movement];
    if (!posIncrementer) return;

    const nextPos: IHasPos = {
      x: player.x,
      y: player.y
    };

    posIncrementer(nextPos);

    const nextTile = this.getTileAt(nextPos.x, nextPos.y);
    if (nextTile === AllTiles.OutOfBound) return;

    if (nextTile === AllTiles.Empty || nextTile === AllTiles.Explosion) {
      const otherPlayer = this.findAlivePlayerAt(nextPos.x, nextPos.y);
      if (otherPlayer) return;

      const bomb = this.findActiveBombAt(nextPos.x, nextPos.y);
      if (bomb) return;

      const bonusId = this.findDroppedBonusIdAt(nextPos.x, nextPos.y);
      if (bonusId) {
        const bonus: Bonus = this.bonuses[bonusId];

        if (bonus.type === 'bomb') {
          player.maxBombs++;
        } else if (bonus.type === 'fire') {
          player.bombRange++;
        }

        delete this.bonuses[bonusId];
      }

      player.x = nextPos.x;
      player.y = nextPos.y;

      // just entered in an explosion
      this.explosionPositions.forEach(exploPos => {
        if (exploPos.x === player.x && exploPos.y === player.y) {
          this.hitPlayer(player, this.players[exploPos.attacker]);
        }
      });
    }
  }

  private dropBomb(player: Player) {
    const hasEnoughBombs = player.bombsLeft > 0;
    const isRespawning = player.respawning > 0;
    if (!hasEnoughBombs || isRespawning) return;

    const existingBomb = this.findActiveBombAt(player.x, player.y);
    if (!existingBomb) {
      const bombId = String(objectCounter++);

      const newBomb = new Bomb();
      newBomb.id = bombId;
      newBomb.x = player.x;
      newBomb.y = player.y;
      newBomb.range = player.bombRange;
      newBomb.playerId = player.id;
      newBomb.countdown = DEFAULT_BOMB_COUNTDOWN;

      this.bombs[bombId] = newBomb;
      player.bombsLeft--;

      if (player.bombsLeft < 0) player.bombsLeft = 0;
    }
  }

  private dropBonus(x: number, y: number, type: BonusCode) {
    const bonusId = String(objectCounter++);

    const bonus = new Bonus();
    bonus.id = bonusId;
    bonus.x = x;
    bonus.y = y;
    bonus.type = type;
    this.bonuses[bonusId] = bonus;
  }

  private readonly explosionPositions = new EquatableSet((firstPos: ExplosionPos, secondPos: ExplosionPos) => {
    return firstPos.x === secondPos.x && firstPos.y === secondPos.y;
  });

  private runBombs() {
    this.computeBombCountdownAndPlayerBombsLeft();

    const explosionChain: Explosion[] = []; // FIFO
    const visitedBombs = new Set<Bomb>(); // avoid handling bombs twice
    const deletedBombIds = new Set<string>();
    const playersHits: { [playerId: string]: PlayerHit[] } = {};

    const destroyedBlocks = new EquatableSet((firstBlock: DestroyedBlock, secondBlock: DestroyedBlock) => {
      return firstBlock.x === secondBlock.x && firstBlock.y === secondBlock.y;
    });

    this.explosionPositions.clear();

    // 0) replace previous explosions with empty tiles
    for (let idx = 0; idx < this.tiles.length; idx++) {
      const tile = this.tiles.charAt(idx) as TileCode;
      if (tile === AllTiles.Explosion) this.tiles = GameState.replaceCharAt(this.tiles, idx, AllTiles.Empty);
    }

    // 1) detect zero-countdown exploding bombs
    for (const bombId in this.bombs) {
      const bomb = this.bombs[bombId];

      // bomb explodes
      if (bomb.countdown === 0) {
        visitedBombs.add(bomb);
        explosionChain.push({
          explodedBomb: bomb,
          triggeredBy: bomb,
          countdownWhenExploded: bomb.countdown
        });
      }
    }

    const propagateExplosion = (explosion: Explosion, posIncrementer: PosIncrementer) => {
      const bomb = explosion.explodedBomb;
      const pos: IHasPos = { x: bomb.x, y: bomb.y };
      this.explosionPositions.add({ x: pos.x, y: pos.y, attacker: bomb.playerId });

      const victim = this.findAlivePlayerAt(bomb.x, bomb.y);
      if (victim) {
        if (!playersHits[victim.id]) playersHits[victim.id] = [];
        playersHits[victim.id].push({
          attacker: bomb.playerId,
          victim: victim.id,
          distanceFromBombToVictim: GameState.getDistanceFrom(bomb, victim),
          bombCountdownWhenExploded: explosion.countdownWhenExploded
        });
      }

      for (let i = 1; i <= bomb.range; i++) {
        posIncrementer(pos);

        const tile = this.getTileAt(pos.x, pos.y);

        // destroy block and do not spread explosion beyond that
        if (tile === AllTiles.Block) {
          this.explosionPositions.add({ x: pos.x, y: pos.y, attacker: bomb.playerId });
          destroyedBlocks.add({
            x: pos.x,
            y: pos.y,
            destroyedBy: bomb.playerId
          });
          return;
        }

        // check if hitting another bomb / player / bonus
        if (tile === AllTiles.Empty || tile === AllTiles.Explosion) {
          const otherBomb = this.findActiveBombAt(pos.x, pos.y);
          if (otherBomb && !visitedBombs.has(otherBomb)) {
            visitedBombs.add(otherBomb);
            explosionChain.push({
              explodedBomb: otherBomb,
              triggeredBy: bomb,
              countdownWhenExploded: otherBomb.countdown
            });
          }

          const victim = this.findAlivePlayerAt(pos.x, pos.y);
          if (victim) {
            if (!playersHits[victim.id]) playersHits[victim.id] = [];
            playersHits[victim.id].push({
              attacker: bomb.playerId,
              victim: victim.id,
              distanceFromBombToVictim: GameState.getDistanceFrom(bomb, victim),
              bombCountdownWhenExploded: explosion.countdownWhenExploded
            });
          }

          const bonusId = this.findDroppedBonusIdAt(pos.x, pos.y);
          if (bonusId) delete this.bonuses[bonusId];

          this.explosionPositions.add({ x: pos.x, y: pos.y, attacker: bomb.playerId });
        }
        // nothing to do on walls or out of bounds
        else {
          return;
        }
      }
    };

    // 2) propagate explosion and detonate other bombs on the way
    while (explosionChain.length > 0) {
      const explosion = explosionChain.shift() as Explosion;
      explosion.explodedBomb.countdown = 0;

      // find other bombs that would explode and their victims
      propagateExplosion(explosion, positionIncrementers[AllActions.Up]);
      propagateExplosion(explosion, positionIncrementers[AllActions.Down]);
      propagateExplosion(explosion, positionIncrementers[AllActions.Left]);
      propagateExplosion(explosion, positionIncrementers[AllActions.Right]);
    }

    // 3) remove destroyed walls now otherwise too many walls could have been destroyed
    for (const destroyedBlock of destroyedBlocks) {
      this.setTileAt(destroyedBlock.x, destroyedBlock.y, AllTiles.Empty);
      this.players[destroyedBlock.destroyedBy].addScore(POINTS_BLOCK_DESTROYED);

      // drop bonus if applicable
      const idx = this.coordToTileIndex(destroyedBlock.x, destroyedBlock.y);
      const bonusType = this.plannedBonuses[idx];
      if (bonusType) {
        this.dropBonus(destroyedBlock.x, destroyedBlock.y, bonusType);
        delete this.plannedBonuses[idx];
      }
    }

    // 4) apply damage to players
    for (const victimId in playersHits) {
      const sortedHits = _.orderBy(
        playersHits[victimId],
        [(hit: PlayerHit) => hit.bombCountdownWhenExploded, (hit: PlayerHit) => hit.distanceFromBombToVictim],
        ['asc', 'asc']
      ) as PlayerHit[];
      const bestHit = sortedHits[0];

      this.hitPlayer(this.players[bestHit.victim], this.players[bestHit.attacker]);
    }

    // 5) replace tiles with explosions
    this.explosionPositions.forEach(exploPos => {
      const explosionIndex = this.coordToTileIndex(exploPos.x, exploPos.y);
      this.tiles = GameState.replaceCharAt(this.tiles, explosionIndex, AllTiles.Explosion);
    });

    // 6) remove exploded bombs
    for (const bombId in this.bombs) {
      const bomb = this.bombs[bombId];

      if (bomb.countdown <= 0) deletedBombIds.add(bombId);
    }

    for (const deletedBombId of deletedBombIds) {
      delete this.bombs[deletedBombId];
    }
  }

  private executeEndGameCleanup(messages: IClientMessage[]): void {
    if (!this.endGameCleanupExecuted) {
      for (const bombId in this.bombs) delete this.bombs[bombId];

      this.history.append(messages);

      if (this.shouldWriteHistoryToDiskWhenGameEnded) {
        this.history.write().then(_.noop, console.log);
      }

      this.endGameCleanupExecuted = true;
    }
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

  private static getDistanceFrom(from: IHasPos, to: IHasPos): number {
    return Math.hypot(to.x - from.x, to.y - from.y);
  }
}

interface DestroyedBlock extends IHasPos {
  destroyedBy: string;
}

interface PlayerHit {
  attacker: string;
  victim: string;
  distanceFromBombToVictim: number;
  bombCountdownWhenExploded: number;
}

interface Explosion {
  explodedBomb: Bomb;
  triggeredBy: Bomb;
  countdownWhenExploded: number;
}

interface ExplosionPos extends IHasPos {
  attacker: string;
}
