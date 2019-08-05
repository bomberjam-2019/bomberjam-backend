import path from 'path';

import { DEFAULT_SERVER_PORT } from '../common/constants';
import { IGameState, IJoinRoomOpts, ISimpleGameState } from '../common/types';
import { jsonClone } from '../common/utils';

export function getJoinOptions(): IJoinRoomOpts {
  const argv: any = require('minimist')(process.argv.slice(2));
  const configPath = path.resolve(__dirname, '../config.json');
  const config: any = require(configPath);

  const joinOpts: IJoinRoomOpts = {
    name: config.yourName,
    roomId: '',
    spectate: false,
    serverName: 'localhost',
    serverPort: DEFAULT_SERVER_PORT
  };

  // join a specific room when spectate or joining a match
  if (argv['s'] || argv['m']) {
    if (typeof config.roomId !== 'string' || config.roomId.length === 0) {
      throw new Error('Missing roomId in config.json');
    }

    joinOpts.roomId = config.roomId;
    joinOpts.serverName = config.serverName;
    joinOpts.serverPort = config.serverPort;

    // join a specific room for a match
    if (argv['s']) {
      joinOpts.spectate = true;
    }
  } else if (argv['t']) {
    joinOpts.training = true;
    joinOpts.createNewRoom = true;
  }

  return joinOpts;
}

export function getFourBots(): Function[] {
  const bot = require('../bot/bot.js');
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

    sgs.bombs[bombId] = {
      x: b.x,
      y: b.y,
      playerId: b.playerId,
      countdown: b.countdown,
      range: b.range
    };
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
