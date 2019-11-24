import { createSanitizedStateCopyForBot, shuffle } from './utils';

import { GameState } from '../server/state';
import { IBot } from './bot';
import { IClientMessage } from '../types';
import fs from 'fs';
import os from 'os';
import path from 'path';

export class GameSimulator {
  protected readonly maxIterations: number;
  protected readonly saveLog: boolean;
  private writeStream!: fs.WriteStream;
  bots: IBot[];

  constructor(maxIterations: number, bots: IBot[], saveLog: boolean = false) {
    this.maxIterations = maxIterations;
    this.bots = bots;
    this.saveLog = saveLog;
  }

  async run(gameName: string = 'simulation'): Promise<GameState> {
    if (this.saveLog) {
      this.writeStream = await this.createWriteStream(gameName);
    }

    const state = new GameState();
    state.isSimulationPaused = false;
    state.suddenDeathCountdown = 2000;

    try {
      for (const bot of this.bots) {
        state.addPlayer(bot.id, bot.id);
      }

      this.appendStateToFile(state, {});

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

        this.appendStateToFile(state, botsActions);
        iteration++;
      }
    } finally {
      if (this.saveLog) {
        console.log(this.writeStream.path);
        this.writeStream.end();
      }
    }

    return state;
  }

  private appendStateToFile(state: GameState, botsActions: any) {
    const step = {
      state: state,
      actions: {} as { [botId: string]: string }
    };

    for (const bot of this.bots) {
      if (botsActions.hasOwnProperty(bot.id)) {
        step.actions[bot.id] = botsActions[bot.id];
      }
    }

    if (this.saveLog) {
      this.writeStream.write(JSON.stringify(step) + os.EOL);
    }
  }

  private async createWriteStream(gameName: string): Promise<fs.WriteStream> {
    return new Promise<fs.WriteStream>(resolve => {
      const filename = path.resolve(process.cwd(), `${gameName}-${Date.now()}.gamelog`);

      const stream = fs.createWriteStream(filename);
      stream.once('open', () => {
        resolve(stream);
      });
    });
  }
}
