import { ActionCode, IClientMessage } from '../src/types';
import GameState from '../src/server/gameState';

export function addPlayers(gameState: GameState, ...playerIds: string[]) {
  for (const playerId of playerIds) {
    gameState.addPlayer(playerId, playerId);
  }
}

export function simulateTick(gameState: GameState, actions: { [playerId: string]: ActionCode }) {
  const messages: IClientMessage[] = [];

  for (const playerId in actions) {
    messages.push({
      action: actions[playerId],
      playerId: playerId,
      tick: gameState.tick,
      elapsed: 0
    });
  }

  gameState.executeNextTick(messages);
}
