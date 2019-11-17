import { getFourBots } from './utils';
import { GameSimulator } from './gameSimulator';
import { GenericBot, botFunc } from './bot';

async function main() {
  const maxIterations = 10000;

  const bots = getFourBots().map((botFunc, indeX) => new GenericBot(`bot-${indeX}`, botFunc as botFunc));

  const gameSimulator = new GameSimulator(maxIterations, bots);
  const result = await gameSimulator.run();

  let winnerSentence = `Nobody won after ${result.tick} ticks`;
  const winner = Object.keys(result.players).filter(id => result.players[id].hasWon);
  if (winner.length) {
    winnerSentence = `Bot ${winner[0]} wins after ${result.tick} ticks`;
  }

  console.log(winnerSentence);
}

main().catch(err => console.log(err));
