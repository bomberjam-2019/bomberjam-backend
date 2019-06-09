import path from 'path';
import { Client } from 'colyseus.js';
import { IGameState, IJoinRoomOpts } from '../common/interfaces';
import { loop } from './bot';

const argv: any = require('minimist')(process.argv.slice(2));
const configPath = path.resolve(__dirname, '../config.json');
const config = require(configPath);

const joinOpts: IJoinRoomOpts = {
  name: config.yourName,
  roomId: '',
  spectate: false
};

// start training
if (argv['t']) {
  config.serverName = 'localhost';
}
// join a specific room
else if (argv['s'] || argv['m']) {
  if (typeof config.roomId !== 'string' || config.roomId.length === 0) {
    throw new Error('Missing roomId to spectate in config.json');
  }

  joinOpts.roomId = config.roomId;

  // join a specific room for a match
  if (argv['s']) {
    joinOpts.spectate = true;
  }
}

const colyseus = require('colyseus.js');
const serverUrl = `ws://${config.serverName}:${config.serverPort}`;

class GameClient {
  private readonly silent: boolean;
  private readonly client: Client;

  public constructor(silent: boolean) {
    this.silent = silent;
    this.client = new colyseus.Client(serverUrl);

    this.client.onOpen.add(() => {
      this.log('connection established, trying to join room...');
      const room = this.client.join('bomberman', joinOpts);

      room.onJoin.add(() => this.log(`successfully joined room ${room.id}`));
      room.onLeave.add(() => this.log(`leaved room ${room.id}`));
      room.onError.add((err: any) => this.log(`something wrong happened with room ${room.id}`, err));

      room.onStateChange.add((state: IGameState) => {
        try {
          executeLoop(room, state);
        } catch (err) {
          const msg = err instanceof Error ? err.stack : err;
          this.log(msg);
        }

        if (!this.silent) drawGame(state);
      });
    });

    this.client.onClose.add(() => this.log('connection has been closed'));
    this.client.onError.add((err: any) => this.log('something wrong happened with client: ', err));
  }

  private log(message?: any, ...optionalParams: any[]) {
    if (!this.silent) console.log(message, optionalParams);
  }
}

const clients: GameClient[] = [];
clients.push(new GameClient(false));

if (argv['t']) {
  for (let i = 0; i < 3; i++) clients.push(new GameClient(true));
}

function executeLoop(room: any, state: IGameState) {
  // TODO simplify / create a new state object so the bot can be developed in an easier way
  const stateCopy = deepClone(state);
  const result: any = loop(stateCopy);

  if (result && typeof result === 'object') {
    result.tick = state.tick;
    room.send(result);
  }
}

function drawGame(state: IGameState) {
  let tiles = state.tiles;

  for (const bombId in state.bombs) {
    const bomb = state.bombs[bombId];
    const idx = bomb.y * state.width + bomb.x;
    if (bomb.countdown > 0) tiles = replaceCharAt(tiles, idx, 'σ');
  }

  for (const playerId in state.players) {
    const player = state.players[playerId];
    const idx = player.y * state.width + player.x;

    if (player.alive) tiles = replaceCharAt(tiles, idx, '☺');
  }

  const explosionsPositions = state.explosions.split(';').filter(e => e.length > 0);
  for (const explosionPosStr of explosionsPositions) {
    const explosionPos = explosionPosStr.split(':');
    const idx = Number(explosionPos[1]) * state.width + Number(explosionPos[0]);
    tiles = replaceCharAt(tiles, idx, '*');
  }

  tiles = tiles.replace(/\./g, ' ');
  tiles = tiles.replace(/\+/g, '░');
  tiles = tiles.replace(/#/g, '█');

  const eol = process.platform === 'win32' ? '\r\n' : '\n';
  const map = splitStringIntoChunks(tiles, state.width).join(eol);

  console.log('========');
  console.log(JSON.stringify(state));
  console.log(map);
}

function splitStringIntoChunks(text: string, size: number): string[] {
  const chunkCount = Math.ceil(text.length / size);
  const chunks = new Array(chunkCount);

  for (let i = 0, j = 0; i < chunkCount; ++i, j += size) {
    chunks[i] = text.substr(j, size);
  }

  return chunks;
}

function replaceCharAt(text: string, idx: number, newChar: string): string {
  return text.substr(0, idx) + newChar + text.substr(idx + 1);
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
