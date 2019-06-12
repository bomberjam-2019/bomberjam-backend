import _ from 'lodash';

import { MAX_PLAYERS, MAX_RESPONSE_TIME_MS, MAX_SPECTATORS, TICK_DURATION_MS } from '../common/constants';
import { Actions, IClientMessage, IJoinRoomOpts, IPlayer } from '../common/types';
import { Client } from 'colyseus';
import { GameState } from './State';
import { TickBasedRoom } from './TickBasedRoom';

export class BombermanRoom extends TickBasedRoom<GameState> {
  protected readonly tickDurationMs: number = TICK_DURATION_MS;
  protected readonly maxResponseTimeMs: number = MAX_RESPONSE_TIME_MS;
  protected readonly maxPlayerCount: number = MAX_PLAYERS;

  protected onRoomInitializing(options: IJoinRoomOpts): void {
    this.autoDispose = true;
    this.maxClients = MAX_PLAYERS + MAX_SPECTATORS;

    this.setState(new GameState());
    this.computeState([]);
  }

  public requestJoin(options: IJoinRoomOpts, isNew?: boolean): number | boolean {
    const isSpectator = options.spectate === true;
    if (isSpectator) {
      if (isNew) return true;
      if (options.roomId === this.roomId) return true;
    }

    // too many players
    const playerCount = Object.keys(this.state.players).length;
    if (playerCount >= this.maxPlayerCount) return false;

    // want to play in a specific room?
    if (typeof options.roomId === 'string' && options.roomId.length > 0) {
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
        this.state.state = 0;
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

      const alivePlayers: IPlayer[] = [];

      for (const playerId in this.state.players) {
        const player = this.state.players[playerId];
        if (player.alive && player.connected) alivePlayers.push(player);
      }

      // game ended: all dead or only one player alive left
      if (alivePlayers.length <= 1) {
        this.state.state = 1;
        this.setPatchRate(60 * 60 * 1000);

        this.log(
          alivePlayers.length === 1
            ? `game ended, winner: ${alivePlayers[0].name} (${alivePlayers[0].id})`
            : 'game ended, all players are dead'
        );
      }
    } else if (this.state.isGameEnded()) {
      // end game cleanup
      for (const bombId in this.state.bombs) delete this.state.bombs[bombId];

      if (this.state.explosions.length > 0) this.state.explosions = '';
    }

    this.log(JSON.stringify(this.state));
  }

  public onDispose() {
    this.log(`disposing room ${this.roomId}`);
  }
}
