import process from 'process';
import path from 'path';
import fs from 'fs';

import { IGameState, IJoinRoomOpts, ISimpleGameState } from '../types';

export function getJoinOptions(): IJoinRoomOpts {
  const configJsonFileName = 'config.json';

  let execDirPath = path.dirname(process.argv[1]);
  let configPath = path.resolve(execDirPath, configJsonFileName);

  while (!fs.existsSync(configPath)) {
    const prevExecDirPath = execDirPath;
    execDirPath = path.dirname(execDirPath);
    if (prevExecDirPath === execDirPath) break;

    configPath = path.resolve(execDirPath, configJsonFileName);
  }

  if (!fs.existsSync(configPath)) throw new Error(`Could not find ${configJsonFileName} in the executable directory or its parents.`);

  const config: any = require(configPath);

  if (typeof config !== 'object') throw new Error(`${configPath} is not a valid JSON file`);

  if (typeof config.playerName !== 'string' || config.playerName.length === 0)
    throw new Error(`Missing playerName property in ${configPath}`);

  if (typeof config.serverName !== 'string' || config.serverName.length === 0)
    throw new Error(`Missing serverName property in ${configPath}`);

  if (typeof config.serverPort !== 'number' || config.serverPort <= 0)
    throw new Error(`Missing or invalid numeric serverPort property in ${configPath}`);

  if (typeof config.roomId !== 'string') throw new Error(`Property roomId in ${configPath} must be a string`);

  console.log(`Found ${configJsonFileName} file: ${configPath}`);

  const joinOpts: IJoinRoomOpts = {
    name: config.playerName.trim(),
    roomId: config.roomId.trim(),
    serverName: config.serverName.trim(),
    serverPort: config.serverPort,
    spectate: false,
    shufflePlayers: false
  };

  if (typeof config.shufflePlayers === 'boolean') {
    joinOpts.shufflePlayers = config.shufflePlayers;
  }

  const clientMode = config.roomId.length === 0 ? 'training' : 'match';

  if (clientMode === 'training') {
    joinOpts.training = true;
    joinOpts.createNewRoom = true;
  }

  return joinOpts;
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
    suddenDeathCountdown: state.suddenDeathCountdown,
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
      score: p.score,
      color: p.color,
      respawning: p.respawning
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

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
