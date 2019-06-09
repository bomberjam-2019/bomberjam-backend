/// <reference path="../../node_modules/pixi.js/pixi.js.d.ts" />

import { Application, TilingSprite, Sprite } from 'pixi.js';
import { Client } from 'colyseus.js';
import { IGameState } from '../../common/interfaces';
import { Sprites } from './assets';

const client = new Client('ws://localhost:4321');
const room = client.join('bomberman');

const app = new Application({
  width: 256,
  height: 256,
  antialias: true,
  backgroundColor: 0xdddddd,
  resolution: 1
});

const tilePixelSize = 32;

app.loader.add(Object.values(Sprites)).load(() => {
  room.onJoin.add(() => console.log(`successfully joined room ${room.id}`));
  room.onLeave.add(() => console.log(`leaved room ${room.id}`));
  room.onError.add((err: any) => console.log(`something wrong happened with room ${room.id}`, err));

  const blockSprites: Sprite[] = [];
  const textureScaleRatio = tilePixelSize / app.loader.resources[Sprites.Floor].texture.width;

  let initialized = false;
  room.onStateChange.add((state: IGameState) => {
    if (!initialized) {
      app.renderer.resize(state.width * tilePixelSize, state.height * tilePixelSize);
      document.getElementById('pixi')!.appendChild(app.view);

      const wallTexture = app.loader.resources[Sprites.Floor].texture;
      const wallTilingSprite = new TilingSprite(wallTexture, app.screen.width, app.screen.height);
      wallTilingSprite.tileScale.set(textureScaleRatio, textureScaleRatio);
      app.stage.addChild(wallTilingSprite);

      initialized = true;
    }

    app.stage.removeChild(...blockSprites);

    for (let x = 0; x < state.width; x++) {
      for (let y = 0; y < state.height; y++) {
        const idx = y * state.width + x;
        const char = state.tiles[idx];

        if (char === '+' || char === '#') {
          let sprite: Sprite;
          if (char === '+') {
            sprite = new Sprite(app.loader.resources[Sprites.Block].texture);
            blockSprites.push(sprite);
          } else {
            sprite = new Sprite(app.loader.resources[Sprites.Wall].texture);
          }

          sprite.position.set(x * tilePixelSize, y * tilePixelSize);
          sprite.scale.set(textureScaleRatio, textureScaleRatio);
          app.stage.addChild(sprite);
        }
      }
    }

    console.log(JSON.stringify(state));
  });

  client.onClose.add(() => console.log('connection has been closed'));
  client.onError.add((err: any) => console.log('something wrong happened with client: ', err));
});
