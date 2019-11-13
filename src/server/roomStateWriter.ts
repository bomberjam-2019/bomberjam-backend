import { Room } from 'colyseus';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { IGameState } from '../types';

export default class RoomStateWriter {
  private readonly room: Room<IGameState>;
  private readonly gamelogFolderPath: string;
  private readonly currentGamelogFileName: string;
  private readonly currentGamelogFilePath: string;

  private stream: fs.WriteStream | null;
  private isClosed: boolean = false;

  constructor(room: Room<any>) {
    this.room = room;
    this.gamelogFolderPath = path.resolve(process.cwd(), 'gamelogs');
    this.currentGamelogFileName = `${this.getDateAtFormatYYYYMMDDTHHMMSS()}_${this.room.roomId}.gamelog`;
    this.currentGamelogFilePath = path.resolve(this.gamelogFolderPath, this.currentGamelogFileName);
    this.stream = null;

    this.ensureGamelogFolder();
  }

  private getDateAtFormatYYYYMMDDTHHMMSS(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);

    const hours = ('0' + now.getHours()).slice(-2);
    const minutes = ('0' + now.getMinutes()).slice(-2);
    const seconds = ('0' + now.getSeconds()).slice(-2);

    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  }

  private ensureGamelogFolder(): void {
    if (!fs.existsSync(this.gamelogFolderPath)) {
      fs.mkdirSync(this.gamelogFolderPath);
    }
  }

  public write(): void {
    if (this.isClosed) return;

    const isGamePlaying = this.room.state.state === 0 && !this.room.state.isSimulationPaused;
    const isGameEnded = this.room.state.state === 1;

    if (isGamePlaying || isGameEnded) {
      const noop = () => {};
      this.writeAsync().then(noop, noop);

      if (isGameEnded) this.close();
    }
  }

  private async writeAsync(): Promise<void> {
    if (!this.stream) {
      this.stream = await this.openStream();
    }

    const lineData = {
      state: this.room.state,
      actions: {}
    };

    this.stream.write(JSON.stringify(lineData) + os.EOL);
  }

  private openStream(): Promise<fs.WriteStream> {
    return new Promise<fs.WriteStream>(resolve => {
      const stream = fs.createWriteStream(this.currentGamelogFilePath);
      stream.once('open', () => {
        resolve(stream);
      });
    });
  }

  public close(): void {
    if (this.isClosed) return;

    this.isClosed = true;

    if (this.stream) {
      this.stream.end();
    }
  }
}
