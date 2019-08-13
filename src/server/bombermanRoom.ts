import { GameActionCode, GameActions, IClientMessage, IJoinRoomOpts, IPlayer, IRoomMetadata } from '../types';
import { MAX_PLAYERS, MAX_RESPONSE_TIME_MS, MAX_SPECTATORS, TICK_DURATION_MS } from '../constants';

import { Client } from 'colyseus';
import { GameState } from './state';
import { TickBasedRoom } from './tickBasedRoom';
import _ from 'lodash';

const allGameActions = new Set<string>(Object.values(GameActions));

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

    if (options.shufflePlayers === true) {
      state.shuffleStartPositions();
    }

    state.roomId = this.roomId;
    if (options.training) state.isSimulationPaused = false;
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

    // game already started
    if (this.state.state >= 0) return false;

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
      if (this.state.ownerId.length === 0) {
        this.state.ownerId = client.sessionId;
      }
    } else {
      const playerCount = Object.keys(this.state.players).length;
      const name = typeof options.name === 'string' && options.name.length > 0 ? options.name : `Player${playerCount + 1}`;

      this.log(` - client ${name} (${client.sessionId}) joined as player`);
      this.state.addPlayer(client.sessionId, name);
    }
  }

  public onLeave(client: Client, consented: boolean) {
    let player = this.state.players[client.sessionId];
    if (!player) {
      if (client.sessionId === this.state.ownerId) {
        this.state.ownerId = '';
      }
    } else {
      player.connected = false;
      this.state.killPlayer(player);
    }
  }

  public onMessage(client: Client, message: IClientMessage) {
    if (typeof message === 'string') {
      this.applyGameAction(message);
    } else {
      super.onMessage(client, message);
    }
  }

  public applyGameAction(str: string) {
    console.log(str);

    if (!allGameActions.has(str)) return;
    const action = str as GameActionCode;

    switch (action) {
      case 'increaseSpeed':
        this.increaseSpeed();
        break;
      case 'decreaseSpeed':
        this.decreaseSpeed();
        break;
      case 'resumeGame':
        this.resumeGame();
        break;
      case 'pauseGame':
        this.pauseGame();
        break;
    }
  }

  private increaseSpeed() {
    this.tickDurationMs = Math.max(10, this.tickDurationMs - 100);
    this.maxResponseTimeMs = this.tickDurationMs;
    this.setSimulationInterval(_.noop, this.tickDurationMs);
    this.setPatchRate(this.tickDurationMs);
  }

  private decreaseSpeed() {
    this.tickDurationMs = this.tickDurationMs + 100;
    this.maxResponseTimeMs = this.tickDurationMs;
    this.setSimulationInterval(_.noop, this.tickDurationMs);
    this.setPatchRate(this.tickDurationMs);
  }

  private resumeGame() {
    if (this.state.isWaitingForPlayers()) {
      this.state.startGame();
    }

    if (this.state.isPlaying()) {
      this.state.isSimulationPaused = false;
    }
  }

  private pauseGame() {
    if (this.state.isPlaying()) {
      this.state.isSimulationPaused = true;
    }
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
    this.state.applyClientMessages(queuedMessages);
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
