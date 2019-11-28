import { playInBrowser, IGameState, ActionCode, IBot } from '../dist';

const allActions: ActionCode[] = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

class RandomBot implements IBot {
  getAction(state: IGameState, myPlayerId: string) {
    return allActions[Math.floor(Math.random() * allActions.length)];
  }
}

const bots = [new RandomBot(), new RandomBot(), new RandomBot(), new RandomBot()];

playInBrowser(bots).catch(console.log);
