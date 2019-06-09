import { IClientMessage } from '../common/interfaces';

export interface IBombermanClientMessage extends IClientMessage {
  movement: string;
  action: Action;
}

export const Movement = {
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
  Stay: 'stay'
};

export enum Action {
  PlantBomb = 'bomb',
  Nothing = 'none'
}

export enum TileKind {
  OutOfBound = '',
  Empty = '.',
  Wall = '#',
  Block = '+'
}
