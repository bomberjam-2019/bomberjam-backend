import { ActionCode, AllActions, IClientMessage, IGameState } from '../types';
import GameState from '../server/gameState';
import { jsonClone } from './utils';

export default class GameStateSimulation {
  private readonly allActionCodes: Set<string> = new Set<string>(Object.values(AllActions));
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

    gameState.roomId = this.createGuid();
    gameState.isSimulationPaused = false;
    gameState.tickDuration = 0;
    gameState.shouldWriteHistoryToDiskWhenGameEnded = false;

    return gameState;
  }

  private createGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  public executeNextTick(playerActions: { [playerId: string]: ActionCode }): void {
    if (playerActions === null) throw new Error('Argument cannot be null');

    if (this.isFinished) throw new Error('Game is already finished');

    const clientMessages = this.getClientMessagesFromPlayerActions(this.internalState, playerActions);
    this.internalState.executeNextTick(clientMessages);

    this.previousState = this.currentState;
    this.currentState = jsonClone(this.internalState);

    if (this.currentState.state === 1) this.isFinished = true;
  }

  private getClientMessagesFromPlayerActions(gameState: GameState, payload: { [playerId: string]: ActionCode }): IClientMessage[] {
    const clientMessages: IClientMessage[] = [];

    for (const playerId in payload) {
      if (!gameState.players[playerId]) {
        throw new Error(`Player ID ${playerId} is not part of valid player IDs: ${Object.keys(gameState.players).join(', ')}`);
      }

      const action = payload[playerId];
      if (!this.allActionCodes.has(action)) {
        throw new Error(`Action code ${action} is not part of valid action codes: ${[...this.allActionCodes].join(', ')}`);
      }

      clientMessages.push({
        action: action,
        playerId: playerId,
        tick: gameState.tick,
        elapsed: 0
      });
    }

    return clientMessages;
  }
}
