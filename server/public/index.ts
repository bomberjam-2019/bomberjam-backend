import { Client, Room } from 'colyseus.js';
import { APP_NAME, DEFAULT_SERVER_PORT } from '../../common/constants';
import { Application } from 'pixi.js';
import { IGameState, IJoinRoomOpts } from '../../common/types';
import { TextureRegistry } from './textureRegistry';
import { BombermanRenderer } from './bombermanRenderer';
import { AllTexturePaths } from './assets';

const roomId = new URLSearchParams(window.location.search).get('r');
if (typeof roomId !== 'string' || roomId.trim().length === 0) throw new Error(`Missing roomId in query string parameter 'r'`);

console.log(`joinging room ${roomId}`);

const joinOpts: IJoinRoomOpts = {
  spectate: true,
  roomId: roomId
};

const client = new Client('ws://' + window.location.hostname + ':' + DEFAULT_SERVER_PORT);
const room: Room<IGameState> = client.join(APP_NAME, joinOpts);

const pixiApp = new Application({
  width: 256,
  height: 256,
  antialias: true,
  backgroundColor: 0xffffff,
  resolution: 1
});

const pixiContainer = document.getElementById('pixi') as HTMLElement;
const debugContainer = document.getElementById('debug') as HTMLElement;

let gameRenderer: BombermanRenderer;

pixiApp.loader.add(AllTexturePaths).load(() => {
  const textures = new TextureRegistry(pixiApp.loader.resources);
  let initialized = false;

  room.onJoin.add(() => {
    console.log(`successfully joined room ${room.id}`);
    onStateChanged(room.state);
  });

  room.onStateChange.add(onStateChanged);
  room.onLeave.add(() => endGame(`leaved room ${room.id}`));
  room.onError.add((err: any) => endGame(`something wrong happened with room ${room.id}`, err));

  client.onClose.add(() => endGame('connection has been closed'));
  client.onError.add((err: any) => endGame('something wrong happened with client', err));

  function onStateChanged(state: IGameState) {
    debugContainer.innerHTML = JSON.stringify(state, null, 2);

    if (!initialized) {
      gameRenderer = new BombermanRenderer(room, pixiApp, textures);
      pixiContainer.appendChild(pixiApp.view);
      pixiApp.ticker.add(() => gameRenderer.onPixiFrameUpdated(pixiApp.ticker.elapsedMS));
      initialized = true;
    }

    gameRenderer.onStateChanged();
  }

  function endGame(message: string, err?: any) {
    console.log(message, err);
    try {
      client.close();
    } catch {}
  }
});
