import { Client } from 'colyseus.js';
import { APP_NAME } from '../../common/constants';
import { Application, AnimatedSprite, TilingSprite, Sprite } from 'pixi.js';
import { IBonus, IGameState, IJoinRoomOpts } from '../../common/types';
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

app.loader.add(allTexturePaths).load(() => {
  room.onJoin.add(() => console.log(`successfully joined room ${room.id}`));
  room.onLeave.add(() => console.log(`leaved room ${room.id}`));
  room.onError.add((err: any) => console.log(`something wrong happened with room ${room.id}`, err));

  const textureScaleRatio = tilePixelSize / app.loader.resources[Sprites.floor].texture.width;

  const playerTextures = Sprites.player.map(path => app.loader.resources[path].texture);
  const flameTextures = Sprites.flame.map(path => app.loader.resources[path].texture);
  const bombTextures = Sprites.bomb.map(path => app.loader.resources[path].texture);

  const wallSprites: Sprite[] = [];
  const blockSprites: Sprite[] = [];
  const playerSprites: AnimatedSprite[] = [];
  const bombSprites: AnimatedSprite[] = [];
  const flameSprites: AnimatedSprite[] = [];
  const bonusSprites: Sprite[] = [];

  let initialized = false;
  room.onStateChange.add((state: IGameState) => {
    debugContainer!.innerHTML = JSON.stringify(state, null, 2);

    if (!initialized) {
      app.renderer.resize(state.width * tilePixelSize, state.height * tilePixelSize);
      pixiContainer!.appendChild(app.view);

      const wallTilingSprite = new TilingSprite(app.loader.resources[Sprites.floor].texture, app.screen.width, app.screen.height);
      wallTilingSprite.tileScale.set(textureScaleRatio, textureScaleRatio);
      app.stage.addChild(wallTilingSprite);

      initialized = true;
    }

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
