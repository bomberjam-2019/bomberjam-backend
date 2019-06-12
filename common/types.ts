export interface IJoinRoomOpts {
  name?: string;
  roomId?: string;
  spectate?: boolean;
  serverName?: string;
  serverPort?: number;
  training?: boolean;
}

export interface IHasTick {
  tick: number;
}

export interface IHasPos {
  x: number;
  y: number;
}

export type ActionCode = 'up' | 'down' | 'left' | 'right' | 'bomb' | 'stay';

export const Actions: { [key: string]: ActionCode } = {
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
  Bomb: 'bomb',
  Stay: 'stay'
};

export type TileCode = '' | '.' | '#' | '+';

export const Tiles: { [key: string]: TileCode } = {
  OutOfBound: '',
  Empty: '.',
  Wall: '#',
  Block: '+'
};

export interface IClientMessage extends IHasTick {
  action: ActionCode;
  playerId: string;
  elapsed: number;
}

export interface IPlayer extends IHasPos {
  id: string;
  name: string;
  connected: boolean;
  bombsLeft: number;
  maxBombs: number;
  bombRange: number;
  alive: boolean;
  lives: number;
}

export interface IBomb extends IHasPos {
  playerId: string;
  countdown: number;
  range: number;
}

export interface IGameState extends IHasTick {
  state: -1 | 0 | 1;
  tiles: string;
  players: { [id: string]: IPlayer };
  bombs: { [id: string]: IBomb };
  explosions: string;
  width: number;
  height: number;
  tickDuration: number;
}
