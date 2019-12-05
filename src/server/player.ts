import { Schema, type } from '@colyseus/schema';
import { DEFAULT_BOMB_RANGE, IPlayer } from '../types';

export default class Player extends Schema implements IPlayer {
  @type('string')
  id: string = '';

  @type('string')
  name: string = '';

  @type('boolean')
  connected: boolean = true;

  @type('int8')
  x: number = 0;

  @type('int8')
  y: number = 0;

  @type('int8')
  bombsLeft: number = 1;

  @type('int8')
  maxBombs: number = 1;

  @type('int8')
  bombRange: number = DEFAULT_BOMB_RANGE;

  @type('boolean')
  alive: boolean = true;

  @type('int8')
  respawning: number = 0;

  @type('int16')
  score: number = 0;

  @type('int32')
  color: number = 0xffffff;

  @type('boolean')
  hasWon: boolean = false;

  mustRespawn: boolean = false;

  public addScore(deltaScore: number): void {
    this.score += deltaScore;
    if (this.score < 0) this.score = 0;
  }
}
