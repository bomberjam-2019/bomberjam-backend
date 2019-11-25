import { ActionCode, IGameState, IGameStateSimulation } from '../types';
import { getJoinOptions, jsonClone, sleepAsync } from './utils';
import GameClient from './gameClient';
import GameStateSimulation from './gameStateSimulation';

export async function playInBrowser(bot: (state: IGameState, myPlayerId: string) => ActionCode): Promise<void> {
  const botType = typeof bot;
  if (botType !== 'function') throw new Error(`Expecting a function, but received ${botType}`);

  const bots = [bot, bot, bot, bot];
  const joinOpts = getJoinOptions();
  const clients: GameClient[] = [];

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

export function startSimulation(): IGameStateSimulation {
  return new GameStateSimulation();
}
