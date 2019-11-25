import { ActionCode, IGameState, IGameStateSimulation } from '../types';
import { jsonClone } from './utils';
import GameState from '../server/gameState';

export default class GameStateSimulation implements IGameStateSimulation {
  private readonly hardcodedPlayerIdAndNames: { [playerId: string]: string } = {
    p1: 'p1',
    p2: 'p2',
    p3: 'p3',
    p4: 'p4'
  };

  private readonly internalState: GameState;

  public currentState: IGameState;
  public previousState: IGameState;
  public isFinished: boolean;

  public constructor() {
    this.internalState = this.createGameState();
    this.currentState = jsonClone(this.internalState);
    this.previousState = this.currentState;
    this.isFinished = false;
  }

  private createGameState(): GameState {
    const gameState = new GameState();

    for (const playerId in this.hardcodedPlayerIdAndNames) {
      gameState.addPlayer(playerId, this.hardcodedPlayerIdAndNames[playerId]);
    }

    gameState.roomId = this.createRoomId();
    gameState.isSimulationPaused = false;
    gameState.tickDuration = 0;
    gameState.shouldWriteHistoryToDiskWhenGameEnded = true;

    return gameState;
  }

  private createRoomId() {
    const guid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    return guid.substring(0, 9);
  }

  public executeNextTick(playerActions: { [playerId: string]: ActionCode }): void {
    if (playerActions === null) throw new Error('Argument cannot be null');

    if (this.isFinished) throw new Error('Game is already finished');

    this.internalState.executeNextTickWithActions(playerActions);

    this.previousState = this.currentState;
    this.currentState = jsonClone(this.internalState);

    if (this.currentState.state === 1) this.isFinished = true;
  }
}
