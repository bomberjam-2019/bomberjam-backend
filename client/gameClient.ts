import { IGameState, IJoinRoomOpts } from '../common/types';
import { Client, Room } from 'colyseus.js';
import { APP_NAME } from '../common/constants';
import { createSanitizedStateCopyForBot, sleepAsync } from './utils';

const open = require('open');
const colyseus = require('colyseus.js');

export class GameClient {
  private readonly bot: Function;
  private readonly joinOptions: IJoinRoomOpts;
  private readonly silent: boolean;
  private readonly client: Client;
  private readonly serverWsUrl: string;
  private readonly serverHttpUrl: string;

  private room?: Room<IGameState>;

  public constructor(bot: Function, joinOptions: IJoinRoomOpts, silent: boolean) {
    this.bot = bot;
    this.joinOptions = joinOptions;
    this.silent = silent;
    this.serverWsUrl = `ws://${joinOptions.serverName}:${joinOptions.serverPort}`;
    this.serverHttpUrl = `http://${joinOptions.serverName}:${joinOptions.serverPort}`;
    this.client = new colyseus.Client(this.serverWsUrl);
  }

  public async runAsync(): Promise<string> {
    await this.openColyseusClientAsync();
    await this.joinRoomAsync();
    await this.showGameInBrowserAsync();
    await this.startPlayingAsync();

    return this.room!.id;
  }

  private openColyseusClientAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.client.onOpen.add(() => resolve());
        this.client.onError.add((err: any) => {
          reject(err);
          this.close();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private joinRoomAsync(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.room = this.client.join(APP_NAME, this.joinOptions);

        this.room.onJoin.add(() => resolve());
        this.room.onLeave.add(() => this.close());
        this.room.onError.add((err: any) => {
          reject(err);
          this.close();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private async showGameInBrowserAsync(): Promise<void> {
    if (!this.silent) {
      await open(`${this.serverHttpUrl}/games/${this.room!.id}`);
      await sleepAsync(1500);
    }
  }

  private async startPlayingAsync() {
    if (this.room) {
      this.room.onStateChange.add((state: IGameState) => this.runBotSafely(state));
    }
  }

  private runBotSafely(state: IGameState) {
    try {
      this.runBot(state);
    } catch (err) {
      this.log('encountered an error in loop', err);
    }
  }

  private runBot(state: IGameState) {
    if (this.isGameFinished(state)) {
      this.close();
      return;
    }

    if (this.isWaitingForPlayers(state)) {
      return;
    }

    if (this.room) {
      const sanitizedState = createSanitizedStateCopyForBot(state);
      const result = this.bot(sanitizedState, this.room.sessionId);

      if (typeof result === 'string') {
        this.room.send({
          action: result,
          tick: state.tick
        });
      }
    }
  }

  private isGameFinished(state: IGameState) {
    return state.state === 1;
  }

  private isWaitingForPlayers(state: IGameState) {
    return state.state === -1;
  }

  private log(message?: any, ...optionalParams: any[]) {
    if (!this.silent) {
      if (optionalParams && optionalParams.length > 0) console.log(message, optionalParams);
      else console.log(message);
    }
  }

  private close() {
    try {
      if (this.room) {
        this.room.onStateChange.removeAll();
        this.room.leave();
      }
    } catch {}

    try {
      this.client.close();
    } catch {}
  }
}
