import { GameState, Player } from '../src/server/state';

import EvoBot from './bot';
import { GameSimulator } from '../src/client/gameSimulator';
import { IBot } from '../src/client/bot';
import { NeuralNetwork } from './neuralNetwork';
import { threadId } from 'worker_threads';

type botDictionnary = { [index: string]: EvoBot };

export default class GenerationManager {
  private numberOfGames: number;
  lastGenerationResults!: GameState[];
  private polulationSize: number;
  private bots: botDictionnary;
  private currentGeneration: number;

  constructor(numberOfGames: number) {
    this.numberOfGames = numberOfGames;
    this.polulationSize = numberOfGames * 4;
    this.currentGeneration = 1;
    this.bots = this.createBots();
  }

  private generateBotName(index: number): string {
    return `evo-gen${this.currentGeneration}-${index}`;
  }

  private createBots(): botDictionnary {
    let bots: botDictionnary = {};

    for (var i = 0; i < this.polulationSize; i++) {
      const brain = new NeuralNetwork(143, 8, 6);
      const bot = new EvoBot(brain, this.generateBotName(i));
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
      const game = new GameSimulator(1000, [
        this.bots[botsId.pop() as string],
        this.bots[botsId.pop() as string],
        this.bots[botsId.pop() as string],
        this.bots[botsId.pop() as string]
      ]);
      games.push(game.run());
    }

    const allGames = Promise.all(games);
    this.lastGenerationResults = await allGames;
  }

  nextGeneration() {
    this.currentGeneration++;
    // Merge all bots results
    let allBots = this.lastGenerationResults.reduce(
      (previous, current) => {
        return Object.assign(previous, current.players);
      },
      {} as { [id: string]: Player }
    );

    // Calculate Total score for generation
    const totalScore = Object.keys(allBots).reduce((previous, current) => {
      return previous + allBots[current].score;
    }, 0);

    // Sort best bot to suckiest bot
    const sortedIds = Object.keys(allBots).sort((a, b) =>
      allBots[a].score > allBots[b].score ? -1 : allBots[a].score < allBots[b].score ? 1 : 0
    );

    //Remove suckiest bots
    const idsToRemove = sortedIds.slice(this.numberOfGames * 2);
    idsToRemove.forEach(id => delete this.bots[id]);

    var childIndex = 1;
    for (const botId in this.bots) {
      const childBot = this.bots[botId].makeChild(this.generateBotName(childIndex));
      childBot.mutate();
      this.bots[childBot.id] = childBot;
      childIndex++;
    }

    console.log(`Generation ${this.currentGeneration - 1} score: ${totalScore}`);
    console.log(`Best bot: ${allBots[sortedIds[0]].id} score: ${allBots[sortedIds[0]].score}`);
  }
}
