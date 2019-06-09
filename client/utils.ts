import path from 'path';
import { DEFAULT_SERVER_PORT } from '../common/constants';
import { IJoinRoomOpts } from '../common/interfaces';

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
  }

  return joinOpts;
}

export function onApplicationExit(callback: (forceExit: boolean) => void) {
  function exitHandler(forceExit: boolean) {
    callback(forceExit);
  }

  process.on('exit', exitHandler.bind(null, false));
  process.on('SIGINT', exitHandler.bind(null, true));
  process.on('SIGUSR1', exitHandler.bind(null, true));
  process.on('SIGUSR2', exitHandler.bind(null, true));
  process.on('uncaughtException', exitHandler.bind(null, true));
}
