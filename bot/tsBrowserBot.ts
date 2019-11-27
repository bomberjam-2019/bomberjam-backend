import { playInBrowser, IGameState, ActionCode, IBot } from '../dist/client';

const allActions: ActionCode[] = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

class RandomBot implements IBot {
  getAction(state: IGameState, myPlayerId: string) {
    return allActions[Math.floor(Math.random() * allActions.length)];
  }
}

const bot = new RandomBot();

playInBrowser(bot).catch(console.log);
