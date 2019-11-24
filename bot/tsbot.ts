import { playInBrowser } from '../dist/client';

const allActions = ['stay', 'left', 'right', 'up', 'down', 'bomb'];

function yourBot(state: any, myPlayerId: string) {
  return allActions[Math.floor(Math.random() * allActions.length)];
}

playInBrowser(yourBot).catch(console.log);
