import * as tf from '@tensorflow/tfjs-node';

import { GameState, Player } from '../src/server/state';

import EvoBot from './bot';
import { GameSimulator } from '../src/client/gameSimulator';
import { IBot } from '../src/client/bot';
import { ModelStoreManagerRegistry } from '@tensorflow/tfjs-core/dist/io/model_management';
import { NeuralNetwork } from './neuralNetwork';
import { threadId } from 'worker_threads';

type botDictionnary = { [index: string]: EvoBot };

export default class GenerationManager {
  private numberOfGames: number;
  lastGenerationResults!: GameState[];
  private polulationSize: number;
  private bots: botDictionnary;
  private currentGeneration: number;
  private bestScore: number = 0;
  private gameScoreSum: number = 0;
  private bestBotScoreSum: number = 0;
  private model: tf.Sequential | undefined;

  constructor(numberOfGames: number, model?: tf.Sequential) {
    this.numberOfGames = numberOfGames;
    this.polulationSize = numberOfGames * 4;
    this.currentGeneration = 1;
    this.model = model;
    this.bots = this.createBots();
  }

  private generateBotName(index: number): string {
    return `evo-gen${this.currentGeneration}-${index}`;
  }

  private createBots(): botDictionnary {
    let bots: botDictionnary = {};

    for (var i = 0; i < this.polulationSize; i++) {
      const brain = new NeuralNetwork(149, 8, 6, this.model);
      const bot = new EvoBot(brain.copy(), this.generateBotName(i));
      bots[bot.id] = bot;
    }
    return bots;
  }

  private CloneModel(model: tf.Sequential) {}

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
        250,
        [
          this.bots[botsId.pop() as string],
          this.bots[botsId.pop() as string],
          this.bots[botsId.pop() as string],
          this.bots[botsId.pop() as string]
        ],
        false
      );
      games.push(game.run(`gen${this.currentGeneration}-game${_i}`));
    }

    const allGames = Promise.all(games);
    this.lastGenerationResults = await allGames;
  }

  async nextGeneration() {
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
    idsToRemove.forEach(id => {
      this.bots[id].dispose();
      delete this.bots[id];
    });

    //Make babies and mutate
    var childIndex = 1;
    for (const botId in this.bots) {
      const childBot = this.bots[botId].makeChild(this.generateBotName(childIndex));
      childBot.mutate();
      this.bots[childBot.id] = childBot;
      childIndex++;
    }

    if (this.bestScore < allBots[sortedIds[0]].score) {
      console.log(`Saving new best bot with score: ${allBots[sortedIds[0]].score}`);
      this.bestScore = allBots[sortedIds[0]].score;
      await this.bots[sortedIds[0]].brain.model.save('file://./best-bot');
    }

    await this.bots[sortedIds[0]].brain.model.save('file://./last-bot');

    this.gameScoreSum += totalScore;
    let gameScoreAverage = Math.round(this.gameScoreSum / (this.currentGeneration - 1));
    let gameScoreDiff = (((totalScore - gameScoreAverage) / ((gameScoreAverage + totalScore) / 2)) * 100).toFixed(2);

    this.bestBotScoreSum += allBots[sortedIds[0]].score;
    let bestBotAverage = Math.round(this.bestBotScoreSum / (this.currentGeneration - 1));
    let bestBotScoreDiff = (
      ((allBots[sortedIds[0]].score - bestBotAverage) / ((bestBotAverage + allBots[sortedIds[0]].score) / 2)) *
      100
    ).toFixed(2);

    console.log(
      `${this.currentGeneration - 1} | ${totalScore} | ${gameScoreAverage} | ${gameScoreDiff}% | ${
        allBots[sortedIds[0]].score
      } | ${bestBotAverage} | ${bestBotScoreDiff}%`
    );
  }
}
