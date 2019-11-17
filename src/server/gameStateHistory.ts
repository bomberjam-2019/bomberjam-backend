import fs from 'fs';
import os from 'os';
import path from 'path';

import { ActionCode, IClientMessage, IGameState } from '../types';
import GameState from './gameState';

interface IStateHistory {
  state: IGameState;
  actions: { [botId: string]: ActionCode | null };
}

export default class GameStateHistory {
  private readonly state: GameState;
  private readonly history: string[];

  constructor(state: GameState) {
    this.state = state;
    this.history = [];
  }

  public append(messages: IClientMessage[]): void {
    const currentTickHistory: IStateHistory = {
      state: this.state,
      actions: {}
    };

    for (const message of messages) {
      currentTickHistory.actions[message.playerId] = message.action;
    }

    for (const playerId in this.state.players) {
      if (!currentTickHistory.actions[playerId]) currentTickHistory.actions[playerId] = null;
    }

    this.history.push(JSON.stringify(currentTickHistory));
  }

  public async write(): Promise<void> {
    const gamelogFolderPath = path.resolve(process.cwd(), 'gamelogs');
    this.ensureFolderExists(gamelogFolderPath);

    const currentGamelogFileName = `${this.getDateFormattedAsYYYYMMDDTHHMMSS()}_${this.state.roomId}.gamelog`;
    const currentGamelogFilePath = path.resolve(gamelogFolderPath, currentGamelogFileName);
    const contents = this.history.join(os.EOL);

    return this.writeFile(currentGamelogFilePath, contents);
  }

  private ensureFolderExists(folderPath: string) {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
  }

  private getDateFormattedAsYYYYMMDDTHHMMSS(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);

    const hours = ('0' + now.getHours()).slice(-2);
    const minutes = ('0' + now.getMinutes()).slice(-2);
    const seconds = ('0' + now.getSeconds()).slice(-2);

    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  }

  private writeFile(path: string, content: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(path, content, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
