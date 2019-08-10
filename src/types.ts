/** Bomberman **/

export interface IJoinRoomOpts {
  name?: string;
  roomId?: string;
  spectate?: boolean;
  serverName?: string;
  serverPort?: number;
  training?: boolean;
  createNewRoom?: boolean;
  tickDurationMs?: number;
  shufflePlayers?: boolean;
}

export interface IHasTick {
  tick: number;
}

export interface IHasPos {
  x: number;
  y: number;
}

export type MoveCode = 'up' | 'down' | 'left' | 'right' | 'stay';

export type ActionCode = MoveCode | 'bomb';

export type TileCode = '' | '.' | '#' | '+';

export type BonusCode = 'bomb' | 'fire';

export type GameActionCode = 'increaseSpeed' | 'decreaseSpeed' | 'resumeGame' | 'pauseGame';

export const Actions: { [key: string]: ActionCode } = {
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
  Bomb: 'bomb',
  Stay: 'stay'
};

export const Tiles: { [key: string]: TileCode } = {
  OutOfBound: '',
  Empty: '.',
  Wall: '#',
  Block: '+'
};

export const GameActions: { [key: string]: GameActionCode } = {
  ResumeGame: 'resumeGame',
  PauseGame: 'pauseGame',
  IncreaseSpeed: 'increaseSpeed',
  DecreaseSpeed: 'decreaseSpeed'
};

export interface IClientMessage extends IHasTick {
  action: ActionCode;
  playerId: string;
  elapsed: number;
}

// "simple" versions of state interfaces are used in bot clients
// so they don't get access to unnecessary stuff

export interface ISimplePlayer extends IHasPos {
  id: string;
  bombsLeft: number;
  maxBombs: number;
  bombRange: number;
  alive: boolean;
  lives: number;
}

export interface IPlayer extends ISimplePlayer {
  name: string;
  connected: boolean;
  hasWon: boolean;
}

export interface ISimpleBomb extends IHasPos {
  playerId: string;
  countdown: number;
  range: number;
}

export interface IBomb extends ISimpleBomb {}

export interface ISimpleBonus extends IHasPos {
  type: BonusCode;
}

export interface IBonus extends ISimpleBonus {}

export interface ISimpleGameState extends IHasTick {
  state: -1 | 0 | 1;
  tiles: string;
  players: { [id: string]: ISimplePlayer };
  bombs: { [id: string]: ISimpleBomb };
  bonuses: { [id: string]: ISimpleBonus };
  width: number;
  height: number;
  suddenDeathEnabled: boolean;
}

export interface IGameState extends ISimpleGameState {
  roomId: string;
  ownerId: string;
  players: { [id: string]: IPlayer };
  bombs: { [id: string]: IBomb };
  bonuses: { [id: string]: IBonus };
  explosions: string;
  tickDuration: number;
  suddenDeathEnabled: boolean;
  isSimulationPaused: boolean;
}

export interface IRoomMetadata {
  roomId: string;
  tick: number;
  state: -1 | 0 | 1;
  players: string[];
}
