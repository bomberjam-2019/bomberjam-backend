import { playInBrowser, IGameState, ActionCode } from '../dist/client';

const allActions: ActionCode[] = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

function yourBot(state: IGameState, myPlayerId: string) {
  return allActions[Math.floor(Math.random() * allActions.length)];
}

playInBrowser(yourBot).catch(console.log);
