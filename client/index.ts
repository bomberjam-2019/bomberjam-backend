import express from 'express';
import path from 'path';
import http from 'http';

import { APP_NAME, DEFAULT_CLIENT_PORT } from '../common/constants';
import { Client, Room } from 'colyseus.js';
import { IGameState } from '../common/interfaces';
import { loop } from './bot';
import { getJoinOptions, onApplicationExit } from './utils';
import { deepClone, drawAsciiGame } from '../common/utils';

// so the program will not close instantly
process.stdin.resume();

const open = require('open');
const colyseus = require('colyseus.js');
const joinOpts = getJoinOptions();
const serverUrl = `ws://${joinOpts.serverName}:${joinOpts.serverPort}`;

class GameClient {
  private readonly silent: boolean;
  private readonly client: Client;

  private room?: Room<any>;
  private expressAppOpened: boolean = false;

  public constructor(silent: boolean) {
    this.silent = silent;
    this.client = new colyseus.Client(serverUrl);

    this.client.onOpen.add(() => {
      this.log('connection established, trying to join room...');
      this.room = this.client.join(APP_NAME, joinOpts);

      this.room.onJoin.add(() => {
        this.log(`successfully joined room ${this.room!.id}`);

        if (!silent && !this.expressAppOpened) {
          const expressApp: express.Express = express();
          expressApp.set('port', DEFAULT_CLIENT_PORT);
          expressApp.use(express.static(path.resolve(__dirname, './public-dist')));

          const expressServer: http.Server = expressApp.listen(DEFAULT_CLIENT_PORT, async () => {
            this.expressAppOpened = true;
            await open(`http://localhost:${DEFAULT_CLIENT_PORT}?r=${this.room!.id}`);
          });

          onApplicationExit((forceExit: boolean) => {
            expressServer.close();
            if (forceExit) process.exit();
          });
        }
      });

      this.room.onLeave.add(() => this.log(`leaved room ${this.room!.id}`));
      this.room.onError.add((err: any) => this.log(`something wrong happened with room ${this.room!.id}`, err));

      this.room.onStateChange.add((state: IGameState) => {
        try {
          executeLoop(this.room, state);
        } catch (err) {
          this.log('encountered an error in loop', err);
        }

        if (!this.silent) drawAsciiGame(state);
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

if (joinOpts.training) {
  for (let i = 0; i < 3; i++) clients.push(new GameClient(true));
}

function executeLoop(room: any, state: IGameState) {
  // TODO simplify / create a new state object so the bot can be developed in an easier way
  const stateCopy = deepClone(state);
  const result = loop(stateCopy);

  if (result && typeof result === 'string') {
    room.send({
      action: result,
      tick: state.tick
    });
  }
}
