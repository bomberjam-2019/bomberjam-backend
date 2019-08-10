import path from 'path';
import fs from 'fs';

import { DEFAULT_SERVER_PORT } from '../constants';
import { IGameState, IJoinRoomOpts, ISimpleGameState } from '../types';

const argv: any = require('minimist')(process.argv.slice(2));
const execPath = process.cwd();

export function getJoinOptions(): IJoinRoomOpts {
  const configFileName = argv['config'] || '';
  const configPath = path.resolve(execPath, configFileName);
  if (configFileName.length === 0 || !fs.existsSync(configPath))
    throw new Error('Could not find specified --config json file at ' + configPath);
  const config: any = require(configPath);

  const joinOpts: IJoinRoomOpts = {
    name: config.playerName,
    roomId: '',
    spectate: false,
    serverName: 'localhost',
    serverPort: DEFAULT_SERVER_PORT,
    shufflePlayers: false
  };

  const clientMode = argv['mode'] || '';

  // join a specific room when spectate or joining a match
  if (clientMode === 'spectate' || clientMode === 'match') {
    if (typeof config.roomId !== 'string' || config.roomId.length === 0) {
      throw new Error('Missing roomId in config.json');
    }

    joinOpts.roomId = config.roomId;
    joinOpts.serverName = config.serverName;
    joinOpts.serverPort = config.serverPort;

    // join a specific room for a match
    if (clientMode === 'spectate') {
      joinOpts.spectate = true;
    }
  } else if (clientMode === 'training') {
    joinOpts.training = true;
    joinOpts.createNewRoom = true;
  } else {
    throw new Error('Invalid option --mode, values are training, match or spectate');
  }

  if (typeof config.shufflePlayers === 'boolean') {
    joinOpts.shufflePlayers = config.shufflePlayers;
  }

  return joinOpts;
}

export function getFourBots(): Function[] {
  const botsFileName = argv['bot'] || '';
  const botsPath = path.resolve(execPath, botsFileName);
  if (botsFileName.length === 0 || !fs.existsSync(botsPath)) throw new Error('Could not find specified --bot js file at ' + botsPath);
  const bot = require(botsPath);
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
