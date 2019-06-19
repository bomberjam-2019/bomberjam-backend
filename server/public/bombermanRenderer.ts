import _ from 'lodash';

import { Room } from 'colyseus.js';
import { AnimatedSprite, Application, Sprite, Texture, TilingSprite, DisplayObject } from 'pixi.js';
import { TextureRegistry } from './textureRegistry';
import { IBomb, IBonus, IGameState, IHasPos, IPlayer } from '../../common/types';
import { deepClone } from '../../common/utils';

type SpriteType = 'player' | 'bomb' | 'flame' | 'bonus' | 'block' | 'wall';

export class BombermanRenderer {
  private room: Room<any>;
  private pixiApp: Application;
  private textures: TextureRegistry;
  private prevState: IGameState;

  private wallSprites: Sprite[] = [];
  private blockSprites: Sprite[] = [];
  private playerSprites: { [playerId: string]: AnimatedSprite } = {};
  private bombSprites: { [bombId: string]: Sprite } = {};
  private bonusesSprites: { [bonusId: string]: Sprite } = {};
  private flameSprites: Sprite[] = [];

  private tilePixelSize: number = 32;
  private spriteRatio: number = 1;

  private get currState(): IGameState {
    return this.room.state as IGameState;
  }

  public get canvas(): HTMLCanvasElement {
    return this.pixiApp.view;
  }

  constructor(room: Room<any>, pixiApp: Application, textures: TextureRegistry) {
    this.room = room;
    this.pixiApp = pixiApp;
    this.textures = textures;
    this.prevState = this.currState;

    this.initialize();
  }

  public initialize() {
    this.spriteRatio = this.tilePixelSize / this.textures.floor.width;
    this.pixiApp.renderer.resize(this.currState.width * this.tilePixelSize, this.currState.height * this.tilePixelSize);

    const wallTilingSprite = new TilingSprite(this.textures.floor, this.pixiApp.screen.width, this.pixiApp.screen.height);
    wallTilingSprite.tileScale.set(this.spriteRatio, this.spriteRatio);
    this.pixiApp.stage.addChild(wallTilingSprite);

    this.registerStateChangeHandlers();

    this.pixiApp.ticker.add(() => this.onPixiFrameUpdated(this.pixiApp.ticker.elapsedMS));
  }

  public onStateChanged() {
    for (const playerId in this.playerSprites) {
      const oldPlayer = this.prevState.players[playerId];
      const newPlayer = this.currState.players[playerId];

      if (oldPlayer && newPlayer) {
        if (newPlayer.x > oldPlayer.x) {
          this.unregisterObjectSprite(this.playerSprites, playerId);
          this.registerPlayer(playerId, oldPlayer, 'right');
        } else if (newPlayer.x < oldPlayer.x) {
          this.unregisterObjectSprite(this.playerSprites, playerId);
          this.registerPlayer(playerId, oldPlayer, 'left');
        } else if (newPlayer.y > oldPlayer.y) {
          this.unregisterObjectSprite(this.playerSprites, playerId);
          this.registerPlayer(playerId, oldPlayer, 'front');
        } else if (newPlayer.y < oldPlayer.y) {
          this.unregisterObjectSprite(this.playerSprites, playerId);
          this.registerPlayer(playerId, oldPlayer, 'back');
        } else {
          (<AnimatedSprite>this.playerSprites[playerId]).stop();
        }

        const sprite: Sprite = this.playerSprites[playerId];

        sprite.x = oldPlayer.x * this.tilePixelSize;
        sprite.y = oldPlayer.y * this.tilePixelSize;

        sprite.vx = oldPlayer.x === newPlayer.x ? 0 : newPlayer.x - oldPlayer.x > 0 ? this.tilePixelSize : -this.tilePixelSize;
        sprite.vy = oldPlayer.y === newPlayer.y ? 0 : newPlayer.y - oldPlayer.y > 0 ? this.tilePixelSize : -this.tilePixelSize;

        if (this.currState.state === 1) {
          sprite.vx = 0;
          sprite.vy = 0;
        }
      }
    }

    // Hide bombs that just exploded
    for (const bombId in this.currState.bombs) {
      const bomb: IBomb = this.currState.bombs[bombId];
      const bombSprite: Sprite = this.bombSprites[bombId];

      if (bomb.countdown <= 0 && bombSprite) bombSprite.visible = false;
    }

    // Hide dead players
    for (const playerId in this.currState.players) {
      const player: IPlayer = this.currState.players[playerId];
      const playerSprite: Sprite = this.playerSprites[playerId];

      if (!player.alive && playerSprite) playerSprite.visible = false;
    }

    this.registerFlames();
    this.registerWallsAndBlocks();

    // z-ordering
    this.pixiApp.stage.children.sort((s1: DisplayObject, s2: DisplayObject) => {
      const y1 = Math.floor(s1.y / this.tilePixelSize);
      const y2 = Math.floor(s2.y / this.tilePixelSize);

      if (y1 === y2) {
        const x1 = Math.floor(s1.x / this.tilePixelSize);
        const x2 = Math.floor(s2.x / this.tilePixelSize);

        if (x1 === x2) {
          // TODO sort sprites at the same location based on their type (bomb behind player for example)
        }
      }

      return y1 - y2;
    });

    this.prevState = deepClone(this.currState);
  }

  public onPixiFrameUpdated(delta: number): void {
    const progress = delta / this.currState.tickDuration;

    _.forEach(this.playerSprites, (sprite: Sprite) => {
      sprite.x += sprite.vx * progress;
      sprite.y += sprite.vy * progress;
    });
  }

  public registerStateChangeHandlers() {
    this.registerPlayers();
    this.registerBombs();
    this.registerBonuses();
  }

  private registerPlayers() {
    this.room.state.players.onAdd = (player: IPlayer, playerId: string) => this.registerPlayer(playerId, player);
    this.room.state.players.onRemove = (player: IPlayer, playerId: string) => this.unregisterObjectSprite(this.playerSprites, playerId);
    for (const playerId in this.currState.players) this.registerPlayer(playerId, this.currState.players[playerId]);
  }

  private registerPlayer(playerId: string, player: IPlayer, orientation: 'left' | 'right' | 'front' | 'back' = 'front'): void {
    if (player.alive) {
      let textures: Texture[] = this.textures.player.front;
      if (orientation === 'left') textures = this.textures.player.left;
      else if (orientation === 'right') textures = this.textures.player.right;
      else if (orientation === 'front') textures = this.textures.player.front;
      else if (orientation === 'back') textures = this.textures.player.back;

      const sprite = this.makeAnimatedSprite(textures, player, 'player', false);
      sprite.anchor.set(0, 0.5);
      this.playerSprites[playerId] = sprite;
      this.pixiApp.stage.addChild(sprite);
    }
  }

  private registerBombs() {
    this.room.state.bombs.onAdd = (bomb: IBomb, bombId: string) => this.registerBomb(bombId, bomb);
    this.room.state.bombs.onRemove = (bomb: IBomb, bombId: string) => this.unregisterObjectSprite(this.bombSprites, bombId);
    for (const bombId in this.currState.bombs) this.registerBomb(bombId, this.currState.bombs[bombId]);
  }

  private registerBomb(bombId: string, bomb: IBomb) {
    if (bomb.countdown >= 0) {
      const sprite = this.makeAnimatedSprite(this.textures.bomb, bomb, 'bomb', true);
      sprite.anchor.set(0.5, 0.5);
      this.bombSprites[bombId] = sprite;
      this.pixiApp.stage.addChild(sprite);
    }
  }

  private registerBonuses() {
    this.room.state.bonuses.onAdd = (bonus: IBonus, bonusId: string) => this.registerBonus(bonusId, bonus);
    this.room.state.bonuses.onRemove = (bonus: IBonus, bonusId: string) => this.unregisterObjectSprite(this.bonusesSprites, bonusId);
    for (const bonusId in this.currState.bonuses) this.registerBonus(bonusId, this.currState.bonuses[bonusId]);
  }

  private registerBonus(bonusId: string, bonus: IBonus) {
    const texture = bonus.type === 'bomb' ? this.textures.bombBonus : this.textures.fireBonus;
    const sprite = this.makeStaticSprite(texture, bonus, 'bonus', true);
    sprite.anchor.set(0.5, 0.5);
    this.bonusesSprites[bonusId] = sprite;
    this.pixiApp.stage.addChild(sprite);
  }

  private registerFlames() {
    for (const sprite of this.flameSprites) {
      this.unregisterSprite(sprite);
    }

    this.flameSprites.length = 0;

    (this.currState.explosions as string)
      .split(';')
      .filter(str => str.length > 0)
      .forEach(str => {
        const [x, y] = str.split(':').map(Number);

        const sprite = this.makeAnimatedSprite(this.textures.flame, { x: x, y: y }, 'flame', true);
        sprite.anchor.set(0.5, 0.5);
        this.pixiApp.stage.addChild(sprite);
        this.flameSprites.push(sprite);
      });
  }

  private registerWallsAndBlocks() {
    for (const sprite of [...this.wallSprites, ...this.blockSprites]) {
      this.unregisterSprite(sprite);
    }

    this.wallSprites.length = 0;
    this.blockSprites.length = 0;

    for (let x = 0; x < this.currState.width; x++) {
      for (let y = 0; y < this.currState.height; y++) {
        const idx = y * this.currState.width + x;
        const char = this.currState.tiles[idx];

        if (char === '+' || char === '#') {
          let sprite: Sprite;
          if (char === '+') {
            sprite = this.makeStaticSprite(this.textures.block, { x: x, y: y }, 'block', false);
            this.blockSprites.push(sprite);
          } else {
            sprite = this.makeStaticSprite(this.textures.wall, { x: x, y: y }, 'wall', false);
            this.wallSprites.push(sprite);
          }

          this.pixiApp.stage.addChild(sprite);
        }
      }
    }
  }

  private unregisterObjectSprite(sprites: { [k: string]: Sprite }, key: string) {
    const sprite: Sprite = sprites[key];
    if (sprite) {
      this.unregisterSprite(sprite);
      delete sprites[key];
    }
  }

  private unregisterSprite(sprite: Sprite) {
    this.pixiApp.stage.removeChild(sprite);
    sprite.destroy();
  }

  private makeAnimatedSprite(textures: Texture[], pos: IHasPos, type: SpriteType, centered: boolean): AnimatedSprite {
    const sprite = new AnimatedSprite(textures, true);

    if (centered) {
      sprite.position.set(pos.x * this.tilePixelSize + this.tilePixelSize / 2.0, pos.y * this.tilePixelSize + this.tilePixelSize / 2.0);
    } else {
      sprite.position.set(pos.x * this.tilePixelSize, pos.y * this.tilePixelSize);
    }

    sprite.animationSpeed = 0.15;
    sprite.scale.set(this.spriteRatio, this.spriteRatio);
    sprite.vx = 0;
    sprite.vy = 0;
    sprite.type = type;

    sprite.play();

    return sprite;
  }

  private makeStaticSprite(texture: Texture, pos: IHasPos, type: SpriteType, centered: boolean): Sprite {
    const sprite = new Sprite(texture);

    if (centered) {
      sprite.position.set(pos.x * this.tilePixelSize + this.tilePixelSize / 2.0, pos.y * this.tilePixelSize + this.tilePixelSize / 2.0);
    } else {
      sprite.position.set(pos.x * this.tilePixelSize, pos.y * this.tilePixelSize);
    }

    sprite.scale.set(this.spriteRatio, this.spriteRatio);
    sprite.vx = 0;
    sprite.vy = 0;
    sprite.type = type;

    return sprite;
  }
}
