import _ from 'lodash';

import { MAX_PLAYERS, MAX_RESPONSE_TIME_MS, MAX_SPECTATORS, TICK_DURATION_MS } from '../common/constants';
import { Actions, IClientMessage, IJoinRoomOpts, IPlayer, IRoomMetadata } from '../common/types';
import { Client } from 'colyseus';
import { GameState } from './state';
import { TickBasedRoom } from './tickBasedRoom';

export class BombermanRoom extends TickBasedRoom<GameState> {
  protected readonly maxPlayerCount: number = MAX_PLAYERS;
  protected tickDurationMs: number = TICK_DURATION_MS;
  protected maxResponseTimeMs: number = MAX_RESPONSE_TIME_MS;

  protected onRoomInitializing(options: IJoinRoomOpts): void {
    this.autoDispose = true;
    this.maxClients = MAX_PLAYERS + MAX_SPECTATORS;

    if (typeof options.tickDurationMs === 'number' && options.tickDurationMs > 0) {
      const tickDurationMs = Math.ceil(options.tickDurationMs);
      this.tickDurationMs = tickDurationMs;
      this.maxResponseTimeMs = tickDurationMs;
    }

    const state = new GameState();
    state.roomId = this.roomId;
    this.setState(state);
    this.computeState([]);
  }

  public requestJoin(options: IJoinRoomOpts, isNew?: boolean): number | boolean {
    // requested a new room but this one is not => denied
    if (options.createNewRoom && !isNew) return false;

    const isSpectator = options.spectate === true;
    if (isSpectator) {
      // want to spectate a specific room?
      if (options.roomId) {
        return options.roomId === this.roomId;
      }

      if (isNew) return true;
      return false;
    }

    // too many players
    const playerCount = Object.keys(this.state.players).length;
    if (playerCount >= this.maxPlayerCount) return false;

    // want to play in a specific room?
    if (options.roomId) {
      return options.roomId === this.roomId;
    }

    return true;
  }

  public onJoin(client: Client, options: IJoinRoomOpts) {
    const isSpectator = options.spectate === true;

    if (isSpectator) {
      this.log(` - client ${client.sessionId} joined as spectator`);
    } else {
      const playerCount = Object.keys(this.state.players).length;
      const name = typeof options.name === 'string' && options.name.length > 0 ? options.name : `Player${playerCount + 1}`;

      this.log(` - client ${name} (${client.sessionId}) joined as player`);
      this.state.addPlayer(client.sessionId, name);

      // start game when all players are here
      if (playerCount + 1 >= this.maxPlayerCount) {
        this.state.startGame();

        const playersStr = _.map(this.state.players, (p: IPlayer) => `${p.name} (${p.id})`).join(', ');
        this.log(`game started with players: ${playersStr}`);
      }
    }
  }

  public onLeave(client: Client, consented: boolean) {
    let player = this.state.players[client.sessionId];
    if (!player) return;

    player.connected = false;
    this.state.killPlayer(player);
  }

  public onMessage(client: Client, message: IClientMessage) {
    if (typeof message === 'string') {
      if (message === 'increaseSpeed') {
        this.tickDurationMs = Math.max(10, this.tickDurationMs - 100);
        this.maxResponseTimeMs = this.tickDurationMs;

        this.setSimulationInterval(_.noop, this.tickDurationMs);
        this.setPatchRate(this.tickDurationMs);
      } else if (message === 'decreaseSpeed') {
        this.tickDurationMs = this.tickDurationMs + 100;
        this.maxResponseTimeMs = this.tickDurationMs;

        this.setSimulationInterval(_.noop, this.tickDurationMs);
        this.setPatchRate(this.tickDurationMs);
      }

      return;
    }

    super.onMessage(client, message);
  }

  protected isValidMessage(message: IClientMessage): boolean {
    if (this.state.isPlaying()) {
      const player: IPlayer = this.state.players[message.playerId];
      return player && player.alive && player.connected;
    }

    return false;
  }

  protected computeState(queuedMessages: IClientMessage[]) {
    this.state.tickDuration = this.tickDurationMs;

    if (this.state.isPlaying()) {
      this.state.refresh();

      for (const message of queuedMessages) {
        const player = this.state.players[message.playerId];
        if (player && player.connected && player.alive) {
          if (message.action === Actions.Bomb) {
            this.state.plantBomb(player);
          } else {
            this.state.movePlayer(player, message.action);
          }
        }
      }

      this.state.runBombs();
      this.state.changeStateIfGameEnded();
    } else if (this.state.isGameEnded()) {
      // end game cleanup
      for (const bombId in this.state.bombs) delete this.state.bombs[bombId];

      if (this.state.explosions.length > 0) this.state.explosions = '';
    }

    this.populateMetadata();

    this.log(JSON.stringify(this.state));
  }

  private populateMetadata() {
    const metadata: IRoomMetadata = {
      roomId: this.roomId,
      tick: this.state.tick,
      state: this.state.state,
      players: _.map(this.state.players, (p: IPlayer) => p.name || p.id)
    };

    this.setMetadata(metadata);
  }

  public onDispose() {
    this.log(`disposing room ${this.roomId}`);
  }
}
