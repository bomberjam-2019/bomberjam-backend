import { ActionCode, ISimpleGameState } from '../types';

export type botFunc = (state: ISimpleGameState, id: string) => ActionCode;

export class GenericBot implements IBot {
  readonly id: string;
  readonly botFunc: botFunc;

  constructor(id: string, botFunc: botFunc) {
    this.id = id;
    this.botFunc = botFunc;
  }
}

export interface IBot {
  readonly id: string;
  readonly botFunc: botFunc;
}
