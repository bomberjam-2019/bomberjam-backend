import process from 'process';
import path from 'path';
import fs from 'fs';

import { IJoinRoomOpts } from '../types';

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

  if (typeof config.roomId !== 'string') throw new Error(`Property roomId in ${configPath} must be a string, even if empty`);

  if (config.roomId.length === 0 && config.serverName !== 'localhost' && config.serverName !== '127.0.0.1')
    throw new Error(`Practicing in browser without specific room ID requires server to be set to localhost in ${configPath}`);

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

export function jsonClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
