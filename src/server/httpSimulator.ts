import express, { Express, Request, Response } from 'express';
import { ActionCode, AllActions, IClientMessage } from '../types';
import GameState from './gameState';

export default class HttpSimulator {
  private readonly allActionCodes: Set<string> = new Set<string>(Object.values(AllActions));
  private readonly deleteExistingGameStateAfterMs: number = 5 * 60 * 1000;
  private readonly hardcodedPlayerIdAndNames: { [playerId: string]: string } = {
    p1: 'p1',
    p2: 'p2',
    p3: 'p3',
    p4: 'p4'
  };

  private readonly expressApp: Express;
  private readonly runningGames: { [gameId: string]: GameState };
  private readonly runningGamesTimeouts: { [gameId: string]: NodeJS.Timeout };

  private constructor(expressApp: Express) {
    this.expressApp = expressApp;
    this.runningGames = {};
    this.runningGamesTimeouts = {};

    this.expressApp.use(express.json());
    this.expressApp.post('/simulator/:id', this.handleRequest.bind(this));
  }

  public static setup(expressApp: Express) {
    new HttpSimulator(expressApp);
  }

  private handleRequest(req: Request, res: Response): void {
    try {
      if (this.isValidRequest(req)) {
        const gameState = this.simulateGame(req.params.id, req.body);
        res.send(JSON.stringify(gameState));
      } else {
        this.httpError(res, 400, 'Invalid game id or JSON request body');
      }
    } catch (err) {
      this.httpError(res, 500, err.toString());
    }
  }

  private isValidRequest(req: Request): boolean {
    return typeof req.params.id === 'string' && typeof req.body === 'object';
  }

  private simulateGame(gameId: string, payload: { [playerId: string]: ActionCode }): GameState {
    const gameState: GameState = this.runningGames[gameId];
    if (!gameState) {
      // do nothing else with this new game state and return it immediately
      // so the simulator program can now let the bots take decisions
      return (this.runningGames[gameId] = this.createNewGameState(gameId));
    }

    const clientMessages = this.extractClientMessagesFromRequestPayload(gameState, payload);
    gameState.executeNextTick(clientMessages);
    this.renewDelayedGameStateRemovalOnInactivity(gameId);
    return gameState;
  }

  private renewDelayedGameStateRemovalOnInactivity(gameId: string): void {
    const existingTimeout = this.runningGamesTimeouts[gameId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    this.runningGamesTimeouts[gameId] = setTimeout(() => {
      delete this.runningGamesTimeouts[gameId];
      delete this.runningGames[gameId];
    }, this.deleteExistingGameStateAfterMs);
  }

  private createNewGameState(gameId: string): GameState {
    const gameState = new GameState();

    for (const playerId in this.hardcodedPlayerIdAndNames) {
      gameState.addPlayer(playerId, this.hardcodedPlayerIdAndNames[playerId]);
    }

    gameState.roomId = gameId;
    gameState.isSimulationPaused = false;
    gameState.tickDuration = 0;

    return gameState;
  }

  private extractClientMessagesFromRequestPayload(gameState: GameState, payload: { [playerId: string]: ActionCode }): IClientMessage[] {
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

  private httpError(res: Response, errorCode: number, errorMessage: string): void {
    res.status(errorCode);
    res.send({ error: errorMessage });
  }
}
