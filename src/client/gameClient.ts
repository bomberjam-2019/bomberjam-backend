import { Client, Room } from 'colyseus.js';
import { APP_NAME } from '../constants';
import { IGameState, IJoinRoomOpts, IBot } from '../types';
import { jsonClone } from './utils';

const open = require('open');
const colyseus = require('colyseus.js');

export default class GameClient {
  private readonly bot: IBot;
  private readonly joinOptions: IJoinRoomOpts;
  private readonly silent: boolean;
  private readonly client: Client;
  private readonly serverWsUrl: string;
  private readonly serverHttpUrl: string;

  private room: Room<IGameState> = undefined as any;

  public constructor(bot: IBot, joinOptions: IJoinRoomOpts, silent: boolean) {
    this.bot = bot;
    this.joinOptions = joinOptions;
    this.silent = silent;
    this.serverWsUrl = `ws://${joinOptions.serverName}:${joinOptions.serverPort}`;
    this.serverHttpUrl = `http://${joinOptions.serverName}:${joinOptions.serverPort}`;
    this.client = new colyseus.Client(this.serverWsUrl);
  }

  public async runAsync(): Promise<string> {
    await this.openColyseusClientAsync();
    const roomId = await this.joinRoomAsync();
    await this.showGameInBrowserAsync(roomId);

    return roomId;
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

  private joinRoomAsync(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const rejoinDelayMs = 3000;

      try {
        let hasJoinedAtLeastOnce = false;

        const setupOnRoomErrorListener = (room: Room<IGameState>) => {
          room.onError.add((err: any) => {
            this.log('An error occured:');
            this.log(err);

            if (hasJoinedAtLeastOnce) {
              setTimeout(() => joinOrRejoin(), rejoinDelayMs);
            } else {
              reject(err);
              this.close();
            }
          });
        };

        const setupOnRoomLeaveListener = (room: Room<IGameState>) => {
          room.onLeave.add(() => {
            if (hasJoinedAtLeastOnce) {
              setTimeout(() => joinOrRejoin(), rejoinDelayMs);
            }
          });
        };

        const setupOnRoomJoinedListener = (room: Room<IGameState>) => {
          room.onJoin.add(() => {
            if (room.id && room.sessionId) {
              hasJoinedAtLeastOnce = true;
              this.log(`Successfully joined room ${room.id} with session id ${room.sessionId}`);
              this.joinOptions.sessionId = room.sessionId;
              resolve(room.id);
            } else {
              this.log('An error occured while joining the room, room id and session id are missing');
              this.close();
            }
          });
        };

        const setupOnStateChanged = (room: Room<IGameState>) => {
          room.onStateChange.add((state: IGameState) => this.runBotSafely(state));
        };

        const joinOrRejoin = () => {
          try {
            if (hasJoinedAtLeastOnce) {
              this.log(`Trying to rejoin room ${this.room.id} with previous session id ${this.joinOptions.sessionId}...`);
              this.room.removeAllListeners();
              this.room = this.client.rejoin(APP_NAME, this.joinOptions);
            } else {
              this.log('Trying to join room...');
              this.room = this.client.join(APP_NAME, this.joinOptions);
            }

            setupOnRoomErrorListener(this.room);
            setupOnRoomLeaveListener(this.room);
            setupOnRoomJoinedListener(this.room);
            setupOnStateChanged(this.room);
          } catch (err) {
            this.log('An error occured:');
            this.log(err);
            this.close();
          }
        };

        joinOrRejoin();
      } catch (err) {
        reject(err);
      }
    });
  }

  private async showGameInBrowserAsync(roomId: string): Promise<void> {
    if (!this.silent) {
      await open(`${this.serverHttpUrl}/games/${roomId}`);
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

    if (this.isWaitingForPlayers(state) || state.isSimulationPaused) {
      return;
    }

    if (this.room) {
      const sanitizedState = jsonClone(state);
      const result = this.bot.getAction(sanitizedState, this.room.sessionId);

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
        if (this.room.hasJoined) this.room.leave();
      }
    } catch {}

    try {
      this.client.close();
    } catch {}
  }
}
