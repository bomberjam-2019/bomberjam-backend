export interface IHasTick {
  tick: number;
}

export interface IHasPos {
  x: number;
  y: number;
}

export interface IJoinRoomOpts {
  name?: string;
  roomId?: string;
  spectate?: boolean;
}

export interface IClientMessage extends IHasTick {
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
}

export interface IBomb extends IHasPos {
  playerId: string;
  countdown: number;
  range: number;
}

export interface IBonus extends IHasPos {
  type: string;
}

export interface IGameState extends IHasTick {
  state: -1 | 0 | 1;
  tiles: string;
  players: { [id: string]: IPlayer };
  bombs: { [id: string]: IBomb };
  bonuses: { [id: string]: IBonus };
  explosions: string;
  width: number;
  height: number;
}
