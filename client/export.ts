import { createSanitizedStateCopyForBot, getFourBots } from './utils';
import { GameState } from '../server/state';
import { ActionCode, Actions } from '../common/types';

import path from 'path';
import fs from 'fs';
import os from 'os';

async function main() {
  const writeStream = await createWriteStream();

  try {
    const maxIterations = 10000;
    const state = new GameState();

    let i = 0;
    const bots = getFourBots().map(botFunc => ({
      id: `bot-${i++}`,
      botFunc: botFunc,
      action: 'stay' as ActionCode
    }));

    for (const bot of bots) {
      state.addPlayer(bot.id, bot.id);
    }

    state.startGame();

    let iter = 0;
    while (state.isPlaying() && iter < maxIterations) {
      const sanitizedState = createSanitizedStateCopyForBot(state);
      const shuffledBots = shuffle(bots);

      state.refresh();

      for (const bot of shuffledBots) {
        const player = state.players[bot.id];

        if (player.alive) {
          bot.action = bot.botFunc(sanitizedState, bot.id);

          if (bot.action === Actions.Bomb) {
            state.plantBomb(player);
          } else {
            state.movePlayer(player, bot.action);
          }
        } else {
          bot.action = <any>'';
        }
      }

      state.runBombs();
      state.changeStateIfGameEnded();

      // dump state to file
      const step = {
        state: createSanitizedStateCopyForBot(state),
        actions: {} as { [botId: string]: string }
      };

      for (const bot of shuffledBots) {
        step.actions[bot.id] = bot.action;
      }

      step.actions = sortObjectByKeys(step.actions);

      const stepStr = JSON.stringify(step);
      writeStream.write(stepStr + os.EOL);

      state.tick++;
      iter++;
    }

    if (iter >= maxIterations) throw new Error('Game was aborted due to too many iterations. Is sudden death working properly?');

    let winnerSentence = `Nobody won after ${state.tick} ticks`;
    const winner = Object.keys(state.players).filter(id => state.players[id].hasWon);
    if (winner.length) {
      winnerSentence = `Bot ${winner[0]} wins after ${state.tick} ticks`;
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

function sortObjectByKeys(unordered: { [p: string]: string }): { [p: string]: string } {
  const ordered: { [p: string]: string } = {};

  Object.keys(unordered)
    .sort()
    .forEach((key: string) => {
      ordered[key] = unordered[key];
    });

  return ordered;
}

async function createWriteStream(): Promise<fs.WriteStream> {
  return new Promise<fs.WriteStream>(resolve => {
    const filename = path.resolve(__dirname, `../${Date.now()}.gamelog`);

    const stream = fs.createWriteStream(filename);
    stream.once('open', () => {
      resolve(stream);
    });
  });
}

main().catch(err => console.log(err));
