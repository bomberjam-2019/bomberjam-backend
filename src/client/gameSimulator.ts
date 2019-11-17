import { IBot } from './bot';
import { GameState } from '../server/state';

import path from 'path';
import fs from 'fs';
import os from 'os';
import { createSanitizedStateCopyForBot, shuffle } from './utils';
import { IClientMessage } from '../types';

export class GameSimulator {
  protected readonly maxIterations: number;
  bots: IBot[];

  constructor(maxIterations: number, bots: IBot[]) {
    this.maxIterations = maxIterations;
    this.bots = bots;
  }

  async run(): Promise<GameState> {
    const writeStream = await this.createWriteStream();
    const state = new GameState();
    state.isSimulationPaused = false;

    try {
      for (const bot of this.bots) {
        state.addPlayer(bot.id, bot.id);
      }

      this.appendStateToFile(state, {}, writeStream);

      let iteration = 0;
      while (state.isPlaying() && iteration < this.maxIterations) {
        const sanitizedState = createSanitizedStateCopyForBot(state);
        const playerMessages: IClientMessage[] = [];

        const botsActions = {} as any;

        for (const bot of this.bots) {
          const player = state.players[bot.id];

          const action = bot.botFunc(sanitizedState, bot.id);
          botsActions[bot.id] = action;

          if (player.alive) {
            playerMessages.push({
              action: action,
              playerId: bot.id,
              tick: state.tick,
              elapsed: 0
            });
          }
        }

        const shuffledPlayerMessages = shuffle(playerMessages);
        state.applyClientMessages(shuffledPlayerMessages);

        this.appendStateToFile(state, botsActions, writeStream);
        iteration++;
      }
    } finally {
      console.log(writeStream.path);
      writeStream.end();
    }

    return state;
  }

  private appendStateToFile(state: GameState, botsActions: any, writeStream: fs.WriteStream) {
    const step = {
      state: state,
      actions: {} as { [botId: string]: string }
    };

    for (const bot of this.bots) {
      if (botsActions.hasOwnProperty(bot.id)) {
        step.actions[bot.id] = botsActions[bot.id];
      }
    }

    writeStream.write(JSON.stringify(step) + os.EOL);
  }

  private async createWriteStream(): Promise<fs.WriteStream> {
    return new Promise<fs.WriteStream>(resolve => {
      const filename = path.resolve(process.cwd(), `${Date.now()}.gamelog`);

      const stream = fs.createWriteStream(filename);
      stream.once('open', () => {
        resolve(stream);
      });
    });
  }
}
