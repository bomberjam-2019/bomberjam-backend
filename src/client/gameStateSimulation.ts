import { ActionCode, IGameState, IGameStateSimulation, IBot } from '../types';
import { jsonClone } from './utils';
import GameState from '../server/gameState';

export default class GameStateSimulation implements IGameStateSimulation {
  private readonly hardcodedPlayerIdAndNames: { [playerId: string]: string } = {
    p1: 'p1',
    p2: 'p2',
    p3: 'p3',
    p4: 'p4'
  };

  private readonly bots: { [playerId: string]: IBot };
  private readonly internalState: GameState;
  private readonly saveGamelog: boolean;

  public currentState: IGameState;
  public previousState: IGameState;
  public isFinished: boolean;

  public constructor(bots: IBot[], saveGamelog: boolean) {
    this.bots = {};

    let i = 0;
    for (const playerId in this.hardcodedPlayerIdAndNames) {
      this.bots[playerId] = bots[i++];
    }

    this.saveGamelog = saveGamelog;
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
    gameState.shouldWriteHistoryToDiskWhenGameEnded = this.saveGamelog;

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

  public executeNextTick(): void {
    if (this.isFinished) throw new Error('Game is already finished');

    const botActions: { [botId: string]: ActionCode } = {};
    for (const botId in this.bots) {
      botActions[botId] = this.bots[botId].getAction(this.currentState, botId);
    }

    this.internalState.executeNextTickWithActions(botActions);

    this.previousState = this.currentState;
    this.currentState = jsonClone(this.internalState);

    if (this.currentState.state === 1) this.isFinished = true;
  }
}
