import fs from 'fs';
import path from 'path';

import { DEFAULT_SERVER_PORT } from '../constants';
import { IGameState, IJoinRoomOpts, ISimpleGameState, IMachineLearningAgent } from '../types';

const argv: any = require('minimist')(process.argv.slice(2));
const execPath = process.cwd();
const mode = argv['mode'];
const configPath = argv['config'];
const botsPath = argv['bot'];
const mlPath = argv['ml'];
const modelPath = argv['model'];

console.log(`execPath   = ${execPath}`);
console.log(`mode       = ${mode}`);
console.log(`configPath = ${configPath}`);
console.log(`botsPath   = ${botsPath}`);
console.log(`mlPath     = ${mlPath}`);
console.log(`modelPath  = ${modelPath}`);

export function getJoinOptions(): IJoinRoomOpts {
  // const configPath = path.resolve(__dirname, '../config.json');
  const config: any = require(path.resolve(execPath, configPath));

  const joinOpts: IJoinRoomOpts = {
    name: config.playerName,
    roomId: '',
    spectate: false,
    serverName: 'localhost',
    serverPort: DEFAULT_SERVER_PORT
  };

  // join a specific room when spectate or joining a match
  if (mode === 'spectate' || mode === 'match') {
    if (typeof config.roomId !== 'string' || config.roomId.length === 0) {
      throw new Error('Missing roomId in config.json');
    }

    joinOpts.roomId = config.roomId;
    joinOpts.serverName = config.serverName;
    joinOpts.serverPort = config.serverPort;

    // join a specific room for a match
    if (mode === 'spectate') {
      joinOpts.spectate = true;
    }
  } else if (mode === 'training') {
    joinOpts.training = true;
    joinOpts.createNewRoom = true;
  }

  return joinOpts;
}

export function getFourBots(): Function[] {
  const bot = require(path.resolve(execPath, botsPath));
  const botType = typeof bot;

  if (botType === 'function') {
    return [bot, bot, bot, bot];
  }

  if (botType === 'object' && Array.isArray(bot)) {
    const bots = (<any[]>bot).filter(b => typeof b === 'function') as Function[];
    const botCount = bots.length;

    if (botCount > 0) {
      for (let i = 0; i < 4 - botCount; i++) {
        bots.push(bots[0]);
      }

      return bots.slice(0, 4);
    }
  }

  throw new Error('Exported bots must be one or many functions');
}

export async function sleepAsync(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export function createSanitizedStateCopyForBot(state: IGameState): ISimpleGameState {
  state = jsonClone(state);

  const sgs: ISimpleGameState = {
    tick: state.tick,
    state: state.state,
    tiles: state.tiles,
    players: {},
    bombs: {},
    bonuses: {},
    width: state.width,
    height: state.height,
    suddenDeathEnabled: state.suddenDeathEnabled
  };

  for (const playerId in state.players) {
    const p = state.players[playerId];

    sgs.players[playerId] = {
      x: p.x,
      y: p.y,
      id: p.id,
      bombsLeft: p.bombsLeft,
      maxBombs: p.maxBombs,
      bombRange: p.bombRange,
      alive: p.alive,
      lives: p.lives
    };
  }

  for (const bombId in state.bombs) {
    const b = state.bombs[bombId];

    if (b.countdown > 0) {
      sgs.bombs[bombId] = {
        x: b.x,
        y: b.y,
        playerId: b.playerId,
        countdown: b.countdown,
        range: b.range
      };
    }
  }

  for (const bonusId in state.bonuses) {
    const b = state.bonuses[bonusId];

    sgs.bonuses[bonusId] = {
      x: b.x,
      y: b.y,
      type: b.type
    };
  }

  return sgs;
}

export function jsonClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function getMachineLearningAgents(): IMachineLearningAgent[] {
  return require(path.resolve(execPath, mlPath));
}

export function getSavedModel(): string {
  return fs.readFileSync(getSavedModelPath(), 'utf8');
}

export function getSavedModelPath(): string {
  return path.resolve(execPath, modelPath);
}
