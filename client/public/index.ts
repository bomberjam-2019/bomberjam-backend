import _ from 'lodash';

import { Client, Room } from 'colyseus.js';
import { APP_NAME } from '../../common/constants';
import { Application, AnimatedSprite, TilingSprite, Sprite, IResourceDictionary, Texture } from 'pixi.js';
import { IBonus, IGameState, IHasPos, IJoinRoomOpts, IPlayer, IStateListener } from '../../common/types';
import { Sprites } from './assets';

const roomId = new URLSearchParams(window.location.search).get('r');
if (typeof roomId !== 'string' || roomId.trim().length === 0) throw new Error(`Missing roomId in 'r' query string parameter`);

const joinOpts: IJoinRoomOpts = {
  spectate: true,
  roomId: roomId
};

console.log(`joinging room ${joinOpts.roomId}`);

const client = new Client('ws://localhost:4321');
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
  ...Sprites.player,
  Sprites.bonuses.bomb,
  Sprites.bonuses.fire
];

class TextureRegistry {
  public playerTextures: Texture[];

  constructor(resources: IResourceDictionary) {
    this.playerTextures = Sprites.player.map(path => resources[path].texture);
  }
}

class GameRenderer {
  private room: Room<any>;
  private pixi: Application;
  private textures: TextureRegistry;
  private state: IGameState;
  private deltaSum: number = 0;
  private playerSprites: { [playerId: string]: Sprite } = {};

  public spriteRatio: number = 1;

  constructor(room: Room<any>, pixi: Application, textures: TextureRegistry) {
    this.room = room;
    this.pixi = pixi;
    this.textures = textures;

    this.state = room.state as IGameState;
  }

  public onGameTick(state: IGameState) {
    this.deltaSum = 0;
    this.state = state;

    console.log('=========');
    _.forEach(this.state.players, (player: any) => {
      player.triggerAll();
    });
  }

  public onPixiTick(delta: number): void {
    const progress = delta / this.state.tickDuration;

    console.log(delta + ' / ' + this.deltaSum);

    _.forEach(this.playerSprites, (sprite: Sprite) => {
      sprite.x += sprite.vx * progress;
      sprite.y += sprite.vy * progress;
    });

    this.deltaSum += delta;
  }

  public registerChangeHandlers() {
    this.registerPlayers();
  }

  private registerPlayers() {
    this.room.state.players.onAdd = (player: IPlayer, playerId: string) => {
      this.registerPlayer(playerId, player);
    };

    this.room.state.players.onRemove = (player: IPlayer, playerId: string) => {
      this.unregisterSprite(this.playerSprites, playerId);
    };

    for (const playerId in this.room.state.players) {
      this.registerPlayer(playerId, this.room.state.players[playerId]);
    }
  }

  private registerPlayer(playerId: string, player: IPlayer): void {
    if (player.alive) {
      const sprite = this.makeAnimatedSprite(this.textures.playerTextures, player, false);
      sprite.anchor.set(0, 0.5);
      this.playerSprites[playerId] = sprite;
      this.pixi.stage.addChild(sprite);

      const propertyCallbacks: { [field: string]: (oldVal: any, newVal: any) => void } = {
        x: (prev: number, curr: number) => {
          sprite.vx = typeof prev === 'undefined' || prev === curr ? 0 : curr - prev > 0 ? tilePixelSize : -tilePixelSize;
          sprite.x = player.x * tilePixelSize;
        },
        y: (prev: number, curr: number) => {
          sprite.vy = typeof prev === 'undefined' || prev === curr ? 0 : curr - prev > 0 ? tilePixelSize : -tilePixelSize;
          sprite.y = player.y * tilePixelSize;
        }
      };

      this.onStatePropertyChange(player, propertyCallbacks);
    }
  }

  private onStatePropertyChange(obj: Object, callbacks: { [field: string]: (oldVal: any, newVal: any) => void }) {
    (obj as IStateListener).onChange = changes => {
      for (const change of changes) {
        const callback = callbacks[change.field];
        if (callback) callback(change.previousValue, change.value);
      }
    };
  }

  private unregisterSprite(sprites: { [k: string]: Sprite }, key: string) {
    const sprite: Sprite = sprites[key];
    if (sprite) {
      this.pixi.stage.removeChild(sprite);
      sprite.destroy();
      delete sprites[key];
    }
  }

  private makeAnimatedSprite(textures: Texture[], pos: IHasPos, center: boolean = false): Sprite {
    const sprite = new AnimatedSprite(textures, true);

    if (center) {
      sprite.position.set(pos.x * tilePixelSize + tilePixelSize / 2.0, pos.y * tilePixelSize + tilePixelSize / 2.0);
    } else {
      sprite.position.set(pos.x * tilePixelSize, pos.y * tilePixelSize);
    }

    sprite.animationSpeed = 0.15;
    sprite.scale.set(this.spriteRatio, this.spriteRatio);
    sprite.vx = 0;
    sprite.vy = 0;

    sprite.play();

    return sprite;
  }
}

let textures: TextureRegistry;
let gameRenderer: GameRenderer;

app.loader.add(allTexturePaths).load(() => {
  const textureScaleRatio = tilePixelSize / app.loader.resources[Sprites.floor].texture.width;

  const flameTextures = Sprites.flame.map(path => app.loader.resources[path].texture);
  const bombTextures = Sprites.bomb.map(path => app.loader.resources[path].texture);

  const wallSprites: Sprite[] = [];
  const blockSprites: Sprite[] = [];
  const playerSprites: AnimatedSprite[] = [];
  const bombSprites: AnimatedSprite[] = [];
  const flameSprites: AnimatedSprite[] = [];
  const bonusSprites: Sprite[] = [];

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

      textures = new TextureRegistry(app.loader.resources);
      gameRenderer = new GameRenderer(room, app, textures);
      gameRenderer.spriteRatio = textureScaleRatio;
      gameRenderer.registerChangeHandlers();

      app.ticker.add(delta => {
        gameRenderer.onPixiTick(app.ticker.elapsedMS);
      });

      initialized = true;
    }

    gameRenderer.onGameTick(state);

    for (const sprite of [...wallSprites, ...blockSprites, ...playerSprites, ...bombSprites, ...flameSprites, ...bonusSprites]) {
      app.stage.removeChild(sprite);
      sprite.destroy();
    }

    wallSprites.length = 0;
    blockSprites.length = 0;
    playerSprites.length = 0;
    bombSprites.length = 0;
    flameSprites.length = 0;
    bonusSprites.length = 0;

    for (let x = 0; x < state.width; x++) {
      for (let y = 0; y < state.height; y++) {
        const idx = y * state.width + x;
        const char = state.tiles[idx];

        if (char === '+' || char === '#') {
          let sprite: Sprite;
          if (char === '+') {
            sprite = new Sprite(app.loader.resources[Sprites.block].texture);
            blockSprites.push(sprite);
          } else {
            sprite = new Sprite(app.loader.resources[Sprites.wall].texture);
            wallSprites.push(sprite);
          }

          sprite.position.set(x * tilePixelSize, y * tilePixelSize);
          sprite.scale.set(textureScaleRatio, textureScaleRatio);
          app.stage.addChild(sprite);
        }
      }
    }

    /*
    for (const playerId in state.players) {
      const player = state.players[playerId];

      if (player.alive) {
        const sprite = new AnimatedSprite(playerTextures, true);
        sprite.animationSpeed = 0.15;
        sprite.position.set(player.x * tilePixelSize, player.y * tilePixelSize);
        sprite.scale.set(textureScaleRatio, textureScaleRatio);
        sprite.anchor.set(0, 0.5);
        sprite.play();
        app.stage.addChild(sprite);

        playerSprites.push(sprite);
      }
    }
    */

    for (const bonusId in state.bonuses) {
      const bonus: IBonus = state.bonuses[bonusId];

      const texture = app.loader.resources[bonus.type === 'fire' ? Sprites.bonuses.fire : Sprites.bonuses.bomb].texture;
      const sprite = new Sprite(texture);

      sprite.position.set(bonus.x * tilePixelSize + tilePixelSize / 2.0, bonus.y * tilePixelSize + tilePixelSize / 2.0);
      sprite.scale.set(textureScaleRatio, textureScaleRatio);
      sprite.anchor.set(0.5, 0.5);

      app.stage.addChild(sprite);
      bonusSprites.push(sprite);
    }

    for (const bombId in state.bombs) {
      const bomb = state.bombs[bombId];
      if (bomb.countdown > 0) {
        const sprite = new AnimatedSprite(bombTextures, true);
        sprite.animationSpeed = 0.05;
        sprite.position.set(bomb.x * tilePixelSize + tilePixelSize / 2.0, bomb.y * tilePixelSize + tilePixelSize / 2.0);
        sprite.scale.set(textureScaleRatio, textureScaleRatio);
        sprite.anchor.set(0.5, 0.5);
        sprite.play();

        app.stage.addChild(sprite);
        playerSprites.push(sprite);
      }
    }

    state.explosions
      .split(';')
      .filter(t => t.length > 0)
      .forEach(str => {
        const [x, y] = str.split(':');

        const sprite = new AnimatedSprite(flameTextures, true);
        sprite.animationSpeed = 0.15;
        sprite.position.set(Number(x) * tilePixelSize + tilePixelSize / 2.0, Number(y) * tilePixelSize + tilePixelSize / 2.0);
        sprite.scale.set(textureScaleRatio, textureScaleRatio);
        sprite.anchor.set(0.5, 0.5);
        sprite.play();
        app.stage.addChild(sprite);

        playerSprites.push(sprite);
      });
  });

  client.onClose.add(() => console.log('connection has been closed'));
  client.onError.add((err: any) => console.log('something wrong happened with client: ', err));
});
