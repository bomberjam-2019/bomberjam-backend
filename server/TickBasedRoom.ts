import _ from 'lodash';

import { ActionCode, Actions, IClientMessage, IHasTick } from '../common/types';
import { Client, Room } from 'colyseus';

const allActionCodes = new Set<ActionCode>(Object.values(Actions));

export abstract class TickBasedRoom<TState extends IHasTick> extends Room<TState> {
  protected abstract readonly tickDurationMs: number;
  protected abstract readonly maxResponseTimeMs: number;
  protected abstract readonly maxPlayerCount: number;

  // Each time we sent the state to all players, we gather their responses here
  // and apply them just before sending the new state. The fastests messages are
  // applied first.
  private queuedMessages: IClientMessage[] = [];
  private lastStateSentAt: [number, number] = process.hrtime();

  public onInit(options: any): void {
    this.log(`Initializing new room ${this.roomId}: ${JSON.stringify(options)}`);

    this.queuedMessages.length = 0;
    this.onRoomInitializing(options);

    // Simulation interval is not used as the state is computed just before it is sent
    // We might have use it if it was a real-time game or if we were dealing with physics
    this.setSimulationInterval(_.noop, this.tickDurationMs);
    this.setPatchRate(this.tickDurationMs);

    this.lastStateSentAt = process.hrtime();
  }

  protected abstract onRoomInitializing(options: any): void;

  // This method is the one that send the state patch at each tick
  protected broadcastPatch(): boolean {
    this.state.tick++;

    this.queuedMessages.sort((m1, m2) => m1.elapsed - m2.elapsed);
    this.computeState(this.queuedMessages);
    this.queuedMessages.length = 0;
    this.lastStateSentAt = process.hrtime();

    return super.broadcastPatch();
  }

  // apply game logic and player messages here
  protected abstract computeState(messages: IClientMessage[]): void;

  public onMessage(client: Client, message: IClientMessage) {
    if (typeof client !== 'object') return;

    const elapsed: [number, number] = process.hrtime(this.lastStateSentAt);

    message.playerId = client.sessionId;
    message.elapsed = (elapsed[0] * 1e9 + elapsed[1]) / 1e9;

    // only accept messages matching the current tick
    const isCurrentTick = message.tick === this.state.tick;
    if (!isCurrentTick) return;

    const isTooLate = message.elapsed > this.maxResponseTimeMs;
    if (isTooLate) return;

    if (!allActionCodes.has(message.action)) return;

    // only accept one message per player
    const alreadyReceivedMessage = this.queuedMessages.some(m => m.playerId === client.sessionId);
    if (alreadyReceivedMessage) return;

    if (this.isValidMessage(message)) {
      this.log(` - from ${client.sessionId}: ${JSON.stringify(message)}`);
      this.queuedMessages.push(message);
    }
  }

  protected abstract isValidMessage(message: IClientMessage): boolean;

  protected log(text: string) {
    const roomId = this.roomId;
    const tick = _.padStart(!this.state ? '?' : this.state.tick + '', 3, '0');
    console.log(`${roomId} | ${tick} | ${text}`);
  }
}
