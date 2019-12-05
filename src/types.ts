export const APP_NAME = 'bomberjam';

export const DEFAULT_SERVER_PORT = 4321;

export const TICK_DURATION_MS = 1000;
export const MAX_RESPONSE_TIME_MS = 500;
export const MAX_PLAYERS = 4;
export const MAX_SPECTATORS = 16;

export const DEFAULT_BOMB_RANGE = 2;
export const DEFAULT_BOMB_COUNTDOWN = 8;
export const BOMB_BONUS_COUNT = 8;
export const FIRE_BONUS_COUNT = 8;
export const SUDDEN_DEATH_COUNTDOWN = 240;

export const RESPAWN_TIME = 10;
export const LOSE_BONUSES_ON_DEATH = false;

export const POINTS_PER_ALIVE_TICK = 0;
export const POINTS_BLOCK_DESTROYED = 5;
export const POINTS_KILLED_PLAYER = 20;
export const POINTS_DEATH = 0;
export const POINTS_LAST_SURVIVOR = 50;

export const PLAYER_COLORS: number[] = [0xff8f8f, 0xffff8a, 0x7aff7a, 0x75c0ff, 0xff78fd];

// prettier-ignore
export const DEFAULT_ASCII_MAP: string[] = [
  '..+++++++++..',
  '.#+#+#+#+#.#.',
  '++.+.++++++++',
  '+#+#+#+#+#.#.',
  '.+++++++.++++',
  '+#+#+#.#+#.#.',
  '+.+..++..++++',
  '+#+#+#+#+#.#+',
  '.+.++++++..+.',
  '.#+#+#+#+#+#.',
  '..+++++++++..'
];

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
  sessionId?: string; // used for re-joining rooms
}

export interface IHasTick {
  tick: number;
}

export interface IHasPos {
  x: number;
  y: number;
}

export interface IHasState {
  state: IGameState;
}

export type MoveCode = 'up' | 'down' | 'left' | 'right' | 'stay';

export type ActionCode = MoveCode | 'bomb';

export type TileCode = '' | '.' | '#' | '+' | '*';

export type BonusCode = 'bomb' | 'fire';

export type GameActionCode = 'increaseSpeed' | 'decreaseSpeed' | 'resumeGame' | 'pauseGame';

// kind of redundant but this is the only way I found to restrict each value's type of an object
// while also defining it keys in advance for auto-completion
interface IAllActions {
  Up: ActionCode;
  Down: ActionCode;
  Left: ActionCode;
  Right: ActionCode;
  Bomb: ActionCode;
  Stay: ActionCode;
}

export const AllActions: IAllActions = {
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
  Bomb: 'bomb',
  Stay: 'stay'
};

// same comment then above
interface IAllTiles {
  OutOfBound: TileCode;
  Empty: TileCode;
  Wall: TileCode;
  Block: TileCode;
  Explosion: TileCode;
}

export const AllTiles: IAllTiles = {
  OutOfBound: '',
  Empty: '.',
  Wall: '#',
  Block: '+',
  Explosion: '*'
};

// same comment then above
interface IAllGameActions {
  ResumeGame: GameActionCode;
  PauseGame: GameActionCode;
  IncreaseSpeed: GameActionCode;
  DecreaseSpeed: GameActionCode;
}

export const AllGameActions: IAllGameActions = {
  ResumeGame: 'resumeGame',
  PauseGame: 'pauseGame',
  IncreaseSpeed: 'increaseSpeed',
  DecreaseSpeed: 'decreaseSpeed'
};

interface IBonusCode {
  Bomb: BonusCode;
  Fire: BonusCode;
}

export const AllBonusCode: IBonusCode = {
  Bomb: 'bomb',
  Fire: 'fire'
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
  score: number;
  color: number;
  respawning: number;
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
  suddenDeathCountdown: number;
  suddenDeathEnabled: boolean;
}

export interface IGameState extends ISimpleGameState {
  roomId: string;
  ownerId: string;
  players: { [id: string]: IPlayer };
  bombs: { [id: string]: IBomb };
  bonuses: { [id: string]: IBonus };
  tickDuration: number;
  isSimulationPaused: boolean;
}

export interface IRoomMetadata {
  roomId: string;
  tick: number;
  state: -1 | 0 | 1;
  players: string[];
}

export interface IGameStateSimulation {
  currentState: IGameState;
  previousState: IGameState;
  isFinished: boolean;
  executeNextTick(): void;
}

export interface IBot {
  getAction: (state: IGameState, myPlayerId: string) => ActionCode;
}

export interface IBoard {
  width: number;
  height: number;
}

export const Board: IBoard = {
  width: DEFAULT_ASCII_MAP[0].length,
  height: DEFAULT_ASCII_MAP.length
};

export declare function playInBrowser(bots: IBot[]): Promise<void>;

export declare function startSimulation(bots: IBot[], saveGamelog: boolean): IGameStateSimulation;
