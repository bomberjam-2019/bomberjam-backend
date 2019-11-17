import EvoBot from './bot';
import { GameSimulator } from '../src/client/gameSimulator';
import { GameState } from '../src/server/state';
import { IBot } from '../src/client/bot';
import { NeuralNetwork } from './neuralNetwork';

export class GenerationManager {
  private numberOfGames: number;
  lastGenerationResults!: GameState[];
  private polulationSize: number;
  private bots: { [id: string]: IBot };

  constructor(numberOfGames: number) {
    this.numberOfGames = numberOfGames;
    this.polulationSize = numberOfGames * 4;
    this.bots = this.createBots();
  }

  private createBots(): { [id: string]: IBot } {
    let bots: { [id: string]: IBot } = {};

    for (var _i = 0; _i < this.polulationSize; _i++) {
      const brain = new NeuralNetwork(143, 8, 6);
      const bot = new EvoBot(brain, `evo-${_i}`);
      bots[bot.id] = bot;
    }
    return bots;
  }

  // https://stackoverflow.com/a/12646864/5115252
  private shuffleArray(array: any[]) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }

  async runGeneration() {
    let games: Promise<GameState>[] = [];
    let botsId = Object.keys(this.bots);
    this.shuffleArray(botsId);
    for (var _i = 0; _i < this.numberOfGames; _i++) {
      const game = new GameSimulator(
        1000,
        [
          this.bots[botsId.pop() as string],
          this.bots[botsId.pop() as string],
          this.bots[botsId.pop() as string],
          this.bots[botsId.pop() as string]
        ],
        true
      );
      games.push(game.run());
    }

    console.log('Playing games');
    this.lastGenerationResults = await Promise.all(games);
    console.log('All games done');
  }

  nextGeneration() {}
}
