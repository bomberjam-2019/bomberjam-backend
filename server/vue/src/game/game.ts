import { Client, Room } from 'colyseus.js';
import { APP_NAME, DEFAULT_SERVER_PORT } from '../../../../common/constants';
import { Application, Texture } from 'pixi.js';
import { IGameState, IJoinRoomOpts, IRoomMetadata } from '../../../../common/types';
import { TextureRegistry } from './textureRegistry';
import { BombermanRenderer } from './bombermanRenderer';
import { AllTexturePaths } from './assets';

export function listRooms(): Promise<IRoomMetadata[]> {
  return new Promise<IRoomMetadata[]>((resolve, reject) => {
    try {
      const client = createClient();

      client.getAvailableRooms(APP_NAME, (rooms, err) => {
        if (err) {
          reject(err);
        } else {
          resolve(rooms.map(r => r.metadata as IRoomMetadata));
        }

        client.close();
      });

      client.onError.add((err: any) => {
        client.close();
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export interface IGameViewerController {
  roomId: string;
  stopViewer: () => void;
  increaseSpeed: () => void;
  decreaseSpeed: () => void;
}

export async function showGame(joinOpts: IJoinRoomOpts): Promise<IGameViewerController> {
  const pixiApp = new Application({
    width: 256,
    height: 256,
    antialias: true,
    backgroundColor: 0xffffff,
    resolution: 1
  });

  const textures = await loadTexturesAsync(pixiApp);
  console.log('Game textures loaded');

  const client = createClient();
  await openColyseusClientAsync(client);
  console.log('Client connected');

  joinOpts.spectate = true;

  const room = await joinRoomAsync<IGameState>(client, joinOpts);
  console.log(`Room ${room.id} joined`);

  const pixiContainer = document.getElementById('pixi') as HTMLElement;
  const debugContainer = document.getElementById('debug') as HTMLElement;

  let initialized = false;
  let stopped = false;
  let gameRenderer: BombermanRenderer;

  onStateChanged(room.state);
  room.onStateChange.add(onStateChanged);

  function onStateChanged(state: IGameState) {
    // Sometimes, when we receive the state for the first time, plenty of properties are missing, so skip it
    if (typeof state.tick === 'undefined') return;
    if (stopped) return;

    debugContainer.innerHTML = JSON.stringify(state, null, 2);

    if (!initialized) {
      gameRenderer = new BombermanRenderer(room, pixiApp, textures);
      pixiContainer.appendChild(pixiApp.view);
      pixiApp.ticker.add(() => gameRenderer.onPixiFrameUpdated(pixiApp.ticker.elapsedMS));
      initialized = true;
    }

    gameRenderer.onStateChanged();
  }

  return {
    roomId: room.id,
    stopViewer: () => {
      stopped = true;

      try {
        room.leave();
      } catch {}

      try {
        client.close();
      } catch {}

      cleanupPixiApp(pixiContainer, pixiApp, textures);
    },
    increaseSpeed: () => {
      if (room && room.hasJoined) {
        room.send('increaseSpeed');
      }
    },
    decreaseSpeed: () => {
      if (room && room.hasJoined) {
        room.send('decreaseSpeed');
      }
    }
  };
}

function createClient(): Client {
  return new Client('ws://' + window.location.hostname + ':' + DEFAULT_SERVER_PORT);
}

function loadTexturesAsync(pixiApp: Application): Promise<TextureRegistry> {
  return new Promise<TextureRegistry>((resolve, reject) => {
    try {
      pixiApp.loader.add(AllTexturePaths).load(() => {
        const textures = new TextureRegistry(pixiApp.loader.resources);
        resolve(textures);
      });
    } catch (err) {
      try {
        pixiApp.loader.reset();
      } catch {}
      reject(err);
    }
  });
}

function openColyseusClientAsync(client: Client): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      client.onOpen.add(() => resolve());
      client.onError.add((err: any) => {
        reject(err);
        client.close();
      });
    } catch (err) {
      reject(err);
    }
  });
}

function joinRoomAsync<TState>(client: Client, joinOpts: IJoinRoomOpts): Promise<Room<TState>> {
  return new Promise<Room<TState>>((resolve, reject) => {
    try {
      const room: Room<TState> = client.join(APP_NAME, joinOpts);

      room.onJoin.add(() => resolve(room));
      room.onLeave.add(() => client.close());
      room.onError.add((err: any) => {
        reject(err);
        client.close();
      });
    } catch (err) {
      reject(err);
    }
  });
}

function cleanupPixiApp(pixiContainer: HTMLElement, pixiApp: Application, textures: TextureRegistry) {
  // Omg so much code to clear the pixi gpu texture cache
  // Some instructions might not be effective but overall it seems to work
  try {
    pixiContainer.removeChild(pixiApp.view);

    pixiApp.ticker.stop();
    pixiApp.stop();

    textures.destroy();

    for (const id in pixiApp.loader.resources) {
      const texture: Texture = pixiApp.loader.resources[id].texture;
      if (texture) {
        texture.destroy(true);
        delete pixiApp.loader.resources[id];
      }
    }

    pixiApp.renderer.destroy(true);
    pixiApp.stage.destroy({
      texture: true,
      children: true,
      baseTexture: true
    });

    pixiApp.destroy(true, {
      children: true,
      texture: true,
      baseTexture: true
    });
  } catch {}
}
