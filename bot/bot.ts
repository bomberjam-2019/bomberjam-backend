import * as tf from '@tensorflow/tfjs';

import { ActionCode, AllActions, BonusCode, ISimpleGameState } from '../src/types';

import { IBot } from '../src/client/bot';
import { NeuralNetwork } from './neuralNetwork';

export default class EvoBot {
  private readonly allActions = Object.values(AllActions);
  private brain: NeuralNetwork;
  readonly id: string;

  constructor(brain: NeuralNetwork, id: string = 'evoBot') {
    this.brain = brain;
    this.id = id;
  }

  botFunc(state: ISimpleGameState): ActionCode {
    const inputs = this.createInput(state);

    const outputs = this.brain.model.predict(inputs) as tf.Tensor;

    const resultArray = outputs.dataSync();
    const resultIndex = resultArray.indexOf(Math.max(...resultArray));

    return this.allActions[resultIndex] as ActionCode;
  }

  makeChild(id: string): EvoBot {
    return new EvoBot(this.brain, id);
  }

  mutate() {
    this.brain.mutate(0.1);
  }

  private createInput(state: ISimpleGameState) {
    let tiles = state.tiles;

    for (const bombId in state.bombs) {
      const bombPosition = this.coordToTileIndex(state.bombs[bombId].x, state.bombs[bombId].y, state.width);
      tiles = this.replaceCharAt(tiles, bombPosition, state.bombs[bombId].countdown.toString());
    }

    for (const playerId in state.players) {
      const playerPosition = this.coordToTileIndex(state.players[playerId].x, state.players[playerId].y, state.width);
      tiles = this.replaceCharAt(tiles, playerPosition, playerId === this.id ? 'm' : 'e');
    }

    for (const bonusId in state.bonuses) {
      const bonusPosition = this.coordToTileIndex(state.bonuses[bonusId].x, state.bonuses[bonusId].y, state.width);
      tiles = this.replaceCharAt(tiles, bonusPosition, state.bonuses[bonusId].type === ('bomb' as BonusCode) ? 'b' : 'f');
    }

    let charsAscii = tiles.split('').map(a => {
      return a.charCodeAt(0);
    });

    return tf.tensor2d([charsAscii]);
  }

  private coordToTileIndex(x: number, y: number, width: number): number {
    return y * width + x;
  }

  private replaceCharAt(text: string, idx: number, newChar: string): string {
    return text.substr(0, idx) + newChar + text.substr(idx + 1);
  }
}

export class RandomBot implements IBot {
  private readonly allActions = Object.values(AllActions);
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  botFunc(state: ISimpleGameState, id: string): ActionCode {
    return this.allActions[Math.floor(Math.random() * this.allActions.length)] as ActionCode;
  }
}
