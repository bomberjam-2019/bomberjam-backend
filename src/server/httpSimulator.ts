import express, { Express, Request, Response } from 'express';
import { ActionCode } from '../types';
import GameState from './gameState';

export default class HttpSimulator {
  private readonly deleteExistingGameStateAfterMs: number = 30 * 1000;
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

  private simulateGame(gameId: string, playerActions: { [playerId: string]: ActionCode }): GameState {
    const gameState: GameState = this.runningGames[gameId];
    if (!gameState) {
      // do nothing else with this new game state and return it immediately
      // so the simulator program can now let the bots take decisions
      return (this.runningGames[gameId] = this.createNewGameState(gameId));
    }

    gameState.executeNextTickWithActions(playerActions);

    // game has ended, remove any reference in running games & timeouts
    if (gameState.state === 1) {
      this.deleteGame(gameId);
    } else {
      this.renewDelayedGameStateRemovalOnInactivity(gameId);
    }

    return gameState;
  }

  private deleteGame(gameId: string) {
    clearTimeout(this.runningGamesTimeouts[gameId]);
    delete this.runningGamesTimeouts[gameId];
    delete this.runningGames[gameId];
  }

  private renewDelayedGameStateRemovalOnInactivity(gameId: string): void {
    clearTimeout(this.runningGamesTimeouts[gameId]);

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
    gameState.shouldWriteHistoryToDiskWhenGameEnded = true;

    return gameState;
  }

  private httpError(res: Response, errorCode: number, errorMessage: string): void {
    res.status(errorCode);
    res.send({ error: errorMessage });
  }
}
