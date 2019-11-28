import { IGameStateSimulation, IBot } from '../types';
import { getJoinOptions, jsonClone, sleepAsync } from './utils';
import GameClient from './gameClient';
import GameStateSimulation from './gameStateSimulation';

function ensureValidBot(bot: IBot) {
  if (typeof bot !== 'object') throw new Error(`Bot is not an object with a getAction method`);

  if (typeof bot.getAction !== 'function') throw new Error(`getAction is not a function`);
}

function ensureFourValidBots(bots: IBot[]): void {
  if (!Array.isArray(bots) || bots.length !== 4) throw new Error('Expected bots to be an array of four functions');

  for (let i = 0; i < bots.length; i++) {
    ensureValidBot(bots[i]);
  }
}

export async function playInBrowser(bot: IBot): Promise<void> {
  ensureValidBot(bot);

  const joinOpts = getJoinOptions();
  const clients: GameClient[] = [];

  const bots = [bot, bot, bot, bot];

  const mainClient = new GameClient(bots[0], jsonClone(joinOpts), false);
  const roomId = await mainClient.runAsync();
  await sleepAsync(500);
  clients.push(mainClient);

  if (joinOpts.training) {
    for (let i = 0; i < 3; i++) {
      const newJoinOpts = jsonClone(joinOpts);
      newJoinOpts.roomId = roomId;
      newJoinOpts.name = `${newJoinOpts.name} (${i + 1})`;
      newJoinOpts.createNewRoom = false;

      const otherClient = new GameClient(bots[i + 1], newJoinOpts, true);
      await otherClient.runAsync();
      await sleepAsync(500);
      clients.push(otherClient);
    }
  }
}

export function startSimulation(bots: IBot[], saveGamelog: boolean): IGameStateSimulation {
  ensureFourValidBots(bots);
  return new GameStateSimulation(bots, saveGamelog);
}
