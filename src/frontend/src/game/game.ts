import { Application, Texture } from 'pixi.js';
import { Client, Room } from 'colyseus.js';
import { APP_NAME, DEFAULT_SERVER_PORT, AllGameActions, IGameState, IHasState, IJoinRoomOpts, IRoomMetadata } from '../../../types';
import { Sprites } from './assets';
import BomberjamRenderer from './bomberjamRenderer';
import SoundRegistry from './soundRegistry';
import TextureRegistry from './textureRegistry';

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

export interface IReplayGameController {
  stopViewer: () => void;
  resumeGame: () => void;
  pauseGame: () => void;
  increaseSpeed: () => void;
  decreaseSpeed: () => void;
  goToStateIdx: (newStateIdx: number) => void;
}

export async function replayGame(
  states: IGameState[],
  stateChangedCallback: (stateIdx: number, state: IGameState) => void
): Promise<IReplayGameController> {
  const pixiApp = new Application({
    antialias: true,
    backgroundColor: 0xffffff,
    resolution: 1
  });

  const textures = await loadTexturesAsync(pixiApp);
  const sounds = await loadSoundsAsync(pixiApp);
  const pixiContainer = document.getElementById('pixi') as HTMLElement;

  let initialized = false;
  let stopped = false;
  let paused = false;
  let gameRenderer: BomberjamRenderer;
  let tickDuration = 300;
  let stateIdx = 0;

  const stateProvider: IHasState = {
    state: states[stateIdx]
  };

  // hack: does not block function exit so we can return the controller
  window.setTimeout(async () => {
    while (!stopped) {
      displayState(stateIdx);

      if (!paused) {
        stateIdx++;
        if (stateIdx >= states.length) stateIdx = states.length - 1;
      }

      await sleepAsync(tickDuration);
    }
  }, 0);

  function displayState(stateIdx: number) {
    stateProvider.state = states[stateIdx];
    stateProvider.state.tickDuration = tickDuration;
    stateChangedCallback(stateIdx, stateProvider.state);

    onStateChanged(stateProvider.state);
  }

  function onStateChanged(state: IGameState) {
    // Sometimes, when we receive the state for the first time, plenty of properties are missing, so skip it
    if (typeof state.tick === 'undefined') return;
    if (stopped) return;

    if (!initialized) {
      gameRenderer = new BomberjamRenderer(stateProvider, pixiApp, textures, sounds, true);
      pixiContainer.appendChild(pixiApp.view);
      pixiApp.ticker.add(() => gameRenderer.onPixiFrameUpdated(pixiApp.ticker.elapsedMS));
      initialized = true;
    }

    gameRenderer.onStateChanged();
  }

  return {
    increaseSpeed: () => {
      gameRenderer.resetPlayerPositions();
      tickDuration = tickDuration > 110 ? tickDuration - 100 : 10;
    },
    decreaseSpeed: () => {
      gameRenderer.resetPlayerPositions();
      tickDuration += 100;
    },
    pauseGame: () => {
      gameRenderer.resetPlayerPositions();
      paused = true;
      sounds.pause.play({
        complete: () => {
          sounds.pauseAll();
        }
      });
    },
    resumeGame: () => {
      sounds.resumeAll();
      sounds.unpause.play();
      paused = false;
    },
    goToStateIdx: (newStateIdx: number) => {
      if (gameRenderer && stateIdx >= 0 && stateIdx < states.length) {
        stateIdx = newStateIdx;
        displayState(stateIdx);
      }
    },
    stopViewer: () => {
      stopped = true;
      cleanupPixiApp(pixiContainer, pixiApp, textures, sounds);
    }
  };
}

export interface ILiveGameController {
  roomId: string;
  stopViewer: () => void;
  resumeGame: () => void;
  pauseGame: () => void;
  increaseSpeed: () => void;
  decreaseSpeed: () => void;
}

export async function showGame(
  joinOpts: IJoinRoomOpts,
  stateChangedCallback: (newState: IGameState, isOwner: boolean) => void
): Promise<ILiveGameController> {
  const pixiApp = new Application({
    antialias: true,
    backgroundColor: 0xffffff,
    resolution: 1
  });

  const textures = await loadTexturesAsync(pixiApp);
  const sounds = await loadSoundsAsync(pixiApp);
  const client = createClient();

  await openColyseusClientAsync(client);
  console.log('Client connected');

  joinOpts.spectate = true;

  const room = await joinRoomAsync<IGameState>(client, joinOpts);
  console.log(`Room ${room.id} joined with session id ${room.sessionId}`);

  const pixiContainer = document.getElementById('pixi') as HTMLElement;

  let initialized = false;
  let stopped = false;
  let gameRenderer: BomberjamRenderer;

  onStateChanged(room.state);
  room.onStateChange.add(onStateChanged);

  function onStateChanged(state: IGameState) {
    // Sometimes, when we receive the state for the first time, plenty of properties are missing, so skip it
    if (typeof state.tick === 'undefined') return;
    if (stopped) return;

    stateChangedCallback(state, room.sessionId === state.ownerId);

    if (!initialized) {
      gameRenderer = new BomberjamRenderer(room, pixiApp, textures, sounds);
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

      cleanupPixiApp(pixiContainer, pixiApp, textures, sounds);
    },
    resumeGame: () => {
      if (room && room.hasJoined) {
        sounds.resumeAll();
        sounds.unpause.play();
        room.send(AllGameActions.ResumeGame);
      }
    },
    pauseGame: () => {
      if (room && room.hasJoined) {
        room.send(AllGameActions.PauseGame);
        sounds.pause.play({
          complete: () => {
            sounds.pauseAll();
          }
        });
      }
    },
    increaseSpeed: () => {
      if (room && room.hasJoined) room.send(AllGameActions.IncreaseSpeed);
      if (gameRenderer) gameRenderer.resetPlayerPositions();
    },
    decreaseSpeed: () => {
      if (room && room.hasJoined) room.send(AllGameActions.DecreaseSpeed);
      if (gameRenderer) gameRenderer.resetPlayerPositions();
    }
  };
}

function createClient(): Client {
  return new Client('ws://' + window.location.hostname + ':' + DEFAULT_SERVER_PORT);
}

function loadTexturesAsync(pixiApp: Application): Promise<TextureRegistry> {
  return new Promise<TextureRegistry>((resolve, reject) => {
    try {
      pixiApp.loader.add(Sprites.spritesheet).load(() => {
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

function loadSoundsAsync(pixiApp: Application): Promise<SoundRegistry> {
  return new Promise<SoundRegistry>((resolve, reject) => {
    try {
      SoundRegistry.loadResources(pixiApp.loader);
      pixiApp.loader.load(() => {
        const sounds = new SoundRegistry(pixiApp.loader.resources);
        resolve(sounds);
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

function cleanupPixiApp(pixiContainer: HTMLElement, pixiApp: Application, textures: TextureRegistry, sounds: SoundRegistry) {
  // Omg so much code to clear the pixi gpu texture cache
  // Some instructions might not be effective but overall it seems to work
  try {
    pixiContainer.removeChild(pixiApp.view);

    pixiApp.ticker.stop();
    pixiApp.stop();

    textures.destroy();

    sounds.destroy();

    for (const id in pixiApp.loader.resources) {
      if (pixiApp.loader.resources.hasOwnProperty(id)) {
        const texture: Texture = pixiApp.loader.resources[id].texture;
        if (texture) {
          texture.destroy(true);
          delete pixiApp.loader.resources[id];
        }
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

async function sleepAsync(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
