import { ActionCode, ISimpleGameState } from '../types';
import { createSanitizedStateCopyForBot, shuffle } from './utils';
import { GameState } from '../server/state';

interface Bot {
  id: string;
  action: ActionCode;
}

export interface Observation {
  state: ISimpleGameState;
  rewards: Number[];
  done: Boolean;
}

export class BomberjamEnv {
  public actionSize: Number;
  public numberOfPlayers: Number;
  public state: GameState;
  public bots: Bot[];

  constructor(numberOfPlayers: Number) {
    this.actionSize = 10;
    this.numberOfPlayers = numberOfPlayers;

    this.bots = [];
    this.state = new GameState();

    this.reset();
  }

  public reset() {
    this.bots = [];
    this.state = new GameState();
    this.state.isSimulationPaused = false;

    for (let i = 0; i < this.numberOfPlayers; i++) {
      const bot = createBot(i);
      this.bots.push(bot);
      this.state.addPlayer(bot.id, bot.id);
    }
  }

  public step(actions: ActionCode[]): Observation {
    const playerMessages = [];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const bot = this.bots[i];
      const player = this.state.players[bot.id];

      if (player.alive) {
        playerMessages.push({
          action: action,
          playerId: bot.id,
          tick: this.state.tick,
          elapsed: 0
        });
      }
    }

    this.state.applyClientMessages(shuffle(playerMessages));

    const state = createSanitizedStateCopyForBot(this.state);
    const rewards = [0, 0, 0, 0];
    const done = !this.state.isPlaying();

    return { state, rewards, done };
  }
}

function createBot(id: Number) {
  return {
    id: `bot-${id}`,
    action: 'stay' as ActionCode
  };
}
