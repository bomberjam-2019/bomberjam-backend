import { ActionCode, IClientMessage } from '../types';
import { createSanitizedStateCopyForBot, getFourBots } from './utils';
import GameState from '../server/gameState';

import path from 'path';
import fs from 'fs';
import os from 'os';

async function main() {
  const writeStream = await createWriteStream();

  try {
    const maxIterations = 10000;
    const state = new GameState();
    state.isSimulationPaused = false;

    let i = 0;
    const bots = getFourBots().map(botFunc => ({
      id: `bot-${i++}`,
      botFunc: botFunc,
      action: 'stay' as ActionCode
    }));

    for (const bot of bots) {
      state.addPlayer(bot.id, bot.id);
    }

    appendStateToFile();

    let iter = 0;
    while (state.isPlaying() && iter < maxIterations) {
      const sanitizedState = createSanitizedStateCopyForBot(state);
      const playerMessages: IClientMessage[] = [];

      for (const bot of bots) {
        const player = state.players[bot.id];

        bot.action = bot.botFunc(sanitizedState, bot.id);

        if (player.alive) {
          playerMessages.push({
            action: bot.action,
            playerId: bot.id,
            tick: state.tick,
            elapsed: 0
          });
        }
      }

      const shuffledPlayerMessages = shuffle(playerMessages);
      state.executeNextTick(shuffledPlayerMessages);

      appendStateToFile();
      iter++;
    }

    if (iter >= maxIterations) throw new Error('Game was aborted due to too many iterations. Is sudden death working properly?');

    let winnerSentence = `Nobody won after ${state.tick} ticks`;
    const winner = Object.keys(state.players).filter(id => state.players[id].hasWon);
    if (winner.length) {
      winnerSentence = `Bot ${winner[0]} wins after ${state.tick} ticks`;
    }

    function appendStateToFile() {
      const step = {
        state: state,
        actions: {} as { [botId: string]: string }
      };

      for (const bot of bots) {
        step.actions[bot.id] = bot.action;
      }

      writeStream.write(JSON.stringify(step) + os.EOL);
    }

    console.log(writeStream.path);
    console.log(winnerSentence);
  } finally {
    writeStream.end();
  }
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function createWriteStream(): Promise<fs.WriteStream> {
  return new Promise<fs.WriteStream>(resolve => {
    const filename = path.resolve(process.cwd(), `${Date.now()}.gamelog`);

    const stream = fs.createWriteStream(filename);
    stream.once('open', () => {
      resolve(stream);
    });
  });
}

main().catch(err => console.log(err));
