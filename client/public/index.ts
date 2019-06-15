import _ from 'lodash';

import { Client, Room } from 'colyseus.js';
import { APP_NAME, DEFAULT_SERVER_PORT } from '../../common/constants';
import { Application, AnimatedSprite, TilingSprite, Sprite, IResourceDictionary, Texture, DisplayObject } from 'pixi.js';
import { IBomb, IBonus, IGameState, IHasPos, IJoinRoomOpts, IPlayer } from '../../common/types';
import { Sprites } from './assets';
import { deepClone } from '../../common/utils';

type SpriteType = 'player' | 'bomb' | 'flame' | 'bonus' | 'block' | 'wall';

const roomId = new URLSearchParams(window.location.search).get('r');
if (typeof roomId !== 'string' || roomId.trim().length === 0) throw new Error(`Missing roomId in 'r' query string parameter`);

const joinOpts: IJoinRoomOpts = {
  spectate: true,
  roomId: roomId
};

console.log(`joinging room ${joinOpts.roomId}`);

const client = new Client('ws://localhost:' + DEFAULT_SERVER_PORT);
const room = client.join(APP_NAME, joinOpts);

const app = new Application({
  width: 256,
  height: 256,
  antialias: true,
  backgroundColor: 0x000000,
  resolution: 1
});

const tilePixelSize = 32;
const pixiContainer = document.getElementById('pixi');
const debugContainer = document.getElementById('debug');

const allTexturePaths = [
  Sprites.floor,
  Sprites.block,
  Sprites.wall,
  ...Sprites.bomb,
  ...Sprites.flame,
  ...Sprites.player.front,
  ...Sprites.player.back,
  ...Sprites.player.side,
  Sprites.bonuses.bomb,
  Sprites.bonuses.fire
];

class TextureRegistry {
  public wall: Texture;
  public block: Texture;
  public player: {
    side: Texture[];
    back: Texture[];
    front: Texture[];
  };
  public bomb: Texture[];
  public flame: Texture[];
  public fireBonus: Texture;
  public bombBonus: Texture;

  constructor(resources: IResourceDictionary) {
    this.wall = resources[Sprites.wall].texture;
    this.block = resources[Sprites.block].texture;
    this.player = {
      front: Sprites.player.front.map(path => resources[path].texture),
      back: Sprites.player.back.map(path => resources[path].texture),
      side: Sprites.player.side.map(path => resources[path].texture)
    };
    this.bomb = Sprites.bomb.map(path => resources[path].texture);
    this.flame = Sprites.flame.map(path => resources[path].texture);
    this.fireBonus = resources[Sprites.bonuses.fire].texture;
    this.bombBonus = resources[Sprites.bonuses.bomb].texture;
  }
}

class GameRenderer {
  private room: Room<any>;
  private pixi: Application;
  private textures: TextureRegistry;
  private prevState: IGameState;
  private currState: IGameState;

  private wallSprites: Sprite[] = [];
  private blockSprites: Sprite[] = [];
  private playerSprites: { [playerId: string]: Sprite } = {};
  private bombSprites: { [bombId: string]: Sprite } = {};
  private bonusesSprites: { [bonusId: string]: Sprite } = {};
  private flameSprites: Sprite[] = [];

  public spriteRatio: number = 1;

  constructor(room: Room<any>, pixi: Application, textures: TextureRegistry) {
    this.room = room;
    this.pixi = pixi;
    this.textures = textures;

    this.currState = room.state as IGameState;
    this.prevState = this.currState;
  }

  public onGameTick(state: IGameState) {
    this.currState = state;

    for (const playerId in this.playerSprites) {
      const oldPlayer = this.prevState.players[playerId];
      const newPlayer = this.currState.players[playerId];

      if (oldPlayer && newPlayer) {
        const sprite: Sprite = this.playerSprites[playerId];

        sprite.x = oldPlayer.x * tilePixelSize;
        sprite.y = oldPlayer.y * tilePixelSize;

        sprite.vx = oldPlayer.x === newPlayer.x ? 0 : newPlayer.x - oldPlayer.x > 0 ? tilePixelSize : -tilePixelSize;
        sprite.vy = oldPlayer.y === newPlayer.y ? 0 : newPlayer.y - oldPlayer.y > 0 ? tilePixelSize : -tilePixelSize;
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
    this.pixi.stage.children.sort((s1: DisplayObject, s2: DisplayObject) => {
      const y1 = Math.floor(s1.y / tilePixelSize);
      const y2 = Math.floor(s2.y / tilePixelSize);

      if (y1 === y2) {
        const x1 = Math.floor(s1.x / tilePixelSize);
        const x2 = Math.floor(s2.x / tilePixelSize);

        if (x1 === x2) {
          // TODO sort sprites at the same location based on their type (bomb behind player for example)
        }
      }

      return y1 - y2;
    });

    this.prevState = deepClone(this.currState);
  }

  public onPixiTick(delta: number): void {
    const progress = delta / this.currState.tickDuration;

    _.forEach(this.playerSprites, (sprite: Sprite) => {
      sprite.x += sprite.vx * progress;
      sprite.y += sprite.vy * progress;
    });
  }

  public registerChangeHandlers() {
    this.registerPlayers();
    this.registerBombs();
    this.registerBonuses();
  }

  private registerPlayers() {
    this.room.state.players.onAdd = (player: IPlayer, playerId: string) => this.registerPlayer(playerId, player);
    this.room.state.players.onRemove = (player: IPlayer, playerId: string) => this.unregisterObjectSprite(this.playerSprites, playerId);
    for (const playerId in this.room.state.players) this.registerPlayer(playerId, this.room.state.players[playerId]);
  }

  private registerPlayer(playerId: string, player: IPlayer): void {
    if (player.alive) {
      const sprite = this.makeAnimatedSprite(this.textures.player.front, player, 'player', false);
      sprite.anchor.set(0, 0.5);
      this.playerSprites[playerId] = sprite;
      this.pixi.stage.addChild(sprite);
    }
  }

  private registerBombs() {
    this.room.state.bombs.onAdd = (bomb: IBomb, bombId: string) => this.registerBomb(bombId, bomb);
    this.room.state.bombs.onRemove = (bomb: IBomb, bombId: string) => this.unregisterObjectSprite(this.bombSprites, bombId);
    for (const bombId in this.room.state.bombs) this.registerBomb(bombId, this.room.state.bombs[bombId]);
  }

  private registerBomb(bombId: string, bomb: IBomb) {
    if (bomb.countdown >= 0) {
      const sprite = this.makeAnimatedSprite(this.textures.bomb, bomb, 'bomb', true);
      sprite.anchor.set(0.5, 0.5);
      this.bombSprites[bombId] = sprite;
      this.pixi.stage.addChild(sprite);
    }
  }

  private registerBonuses() {
    this.room.state.bonuses.onAdd = (bonus: IBonus, bonusId: string) => this.registerBonus(bonusId, bonus);
    this.room.state.bonuses.onRemove = (bonus: IBonus, bonusId: string) => this.unregisterObjectSprite(this.bonusesSprites, bonusId);
    for (const bonusId in this.room.state.bonuses) this.registerBonus(bonusId, this.room.state.bombs[bonusId]);
  }

  private registerBonus(bonusId: string, bonus: IBonus) {
    const texture = bonus.type === 'bomb' ? this.textures.bombBonus : this.textures.fireBonus;
    const sprite = this.makeSprite(texture, bonus, 'bonus', true);
    sprite.anchor.set(0.5, 0.5);
    this.bonusesSprites[bonusId] = sprite;
    this.pixi.stage.addChild(sprite);
  }

  private registerFlames() {
    for (const sprite of this.flameSprites) {
      this.unregisterSprite(sprite);
    }

    this.flameSprites.length = 0;

    (this.room.state.explosions as string)
      .split(';')
      .filter(str => str.length > 0)
      .forEach(str => {
        const [x, y] = str.split(':').map(Number);

        const sprite = this.makeAnimatedSprite(this.textures.flame, { x: x, y: y }, 'flame', true);
        sprite.anchor.set(0.5, 0.5);
        this.pixi.stage.addChild(sprite);
        this.flameSprites.push(sprite);
      });
  }

  private registerWallsAndBlocks() {
    for (const sprite of [...this.wallSprites, ...this.blockSprites]) {
      this.unregisterSprite(sprite);
    }

    this.wallSprites.length = 0;
    this.blockSprites.length = 0;

    for (let x = 0; x < this.room.state.width; x++) {
      for (let y = 0; y < this.room.state.height; y++) {
        const idx = y * this.room.state.width + x;
        const char = this.room.state.tiles[idx];

        if (char === '+' || char === '#') {
          let sprite: Sprite;
          if (char === '+') {
            sprite = this.makeSprite(this.textures.block, { x: x, y: y }, 'block', false);
            this.blockSprites.push(sprite);
          } else {
            sprite = this.makeSprite(this.textures.wall, { x: x, y: y }, 'wall', false);
            this.wallSprites.push(sprite);
          }

          this.pixi.stage.addChild(sprite);
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
    this.pixi.stage.removeChild(sprite);
    sprite.destroy();
  }

  private makeAnimatedSprite(textures: Texture[], pos: IHasPos, type: SpriteType, centered: boolean): Sprite {
    const sprite = new AnimatedSprite(textures, true);

    if (centered) {
      sprite.position.set(pos.x * tilePixelSize + tilePixelSize / 2.0, pos.y * tilePixelSize + tilePixelSize / 2.0);
    } else {
      sprite.position.set(pos.x * tilePixelSize, pos.y * tilePixelSize);
    }

    sprite.animationSpeed = 0.15;
    sprite.scale.set(this.spriteRatio, this.spriteRatio);
    sprite.vx = 0;
    sprite.vy = 0;
    sprite.type = type;

    sprite.play();

    return sprite;
  }

  private makeSprite(texture: Texture, pos: IHasPos, type: SpriteType, centered: boolean): Sprite {
    const sprite = new Sprite(texture);

    if (centered) {
      sprite.position.set(pos.x * tilePixelSize + tilePixelSize / 2.0, pos.y * tilePixelSize + tilePixelSize / 2.0);
    } else {
      sprite.position.set(pos.x * tilePixelSize, pos.y * tilePixelSize);
    }

    sprite.scale.set(this.spriteRatio, this.spriteRatio);
    sprite.vx = 0;
    sprite.vy = 0;
    sprite.type = type;

    return sprite;
  }
}

let textures: TextureRegistry;
let gameRenderer: GameRenderer;

app.loader.add(allTexturePaths).load(() => {
  textures = new TextureRegistry(app.loader.resources);

  const textureScaleRatio = tilePixelSize / app.loader.resources[Sprites.floor].texture.width;

  room.onJoin.add(() => {
    console.log(`successfully joined room ${room.id}`);
  });

  room.onLeave.add(() => console.log(`leaved room ${room.id}`));
  room.onError.add((err: any) => console.log(`something wrong happened with room ${room.id}`, err));

  let initialized = false;
  room.onStateChange.add((state: IGameState) => {
    debugContainer!.innerHTML = JSON.stringify(state, null, 2);

    if (!initialized) {
      app.renderer.resize(state.width * tilePixelSize, state.height * tilePixelSize);
      pixiContainer!.appendChild(app.view);

      const wallTilingSprite = new TilingSprite(app.loader.resources[Sprites.floor].texture, app.screen.width, app.screen.height);
      wallTilingSprite.tileScale.set(textureScaleRatio, textureScaleRatio);
      app.stage.addChild(wallTilingSprite);

      gameRenderer = new GameRenderer(room, app, textures);
      gameRenderer.spriteRatio = textureScaleRatio;
      gameRenderer.registerChangeHandlers();

      app.ticker.add(() => {
        gameRenderer.onPixiTick(app.ticker.elapsedMS);
      });

      initialized = true;
    }

    gameRenderer.onGameTick(state);
  });

  client.onClose.add(() => console.log('connection has been closed'));
  client.onError.add((err: any) => console.log('something wrong happened with client: ', err));
});
