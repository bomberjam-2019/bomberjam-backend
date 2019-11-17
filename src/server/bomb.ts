import { Schema, type } from '@colyseus/schema';
import { IBomb } from '../types';

export default class Bomb extends Schema implements IBomb {
  id: string = '';

  @type('string')
  playerId: string = '';

  @type('int8')
  countdown: number = 0;

  @type('int8')
  range: number = 1;

  @type('int8')
  x: number = 0;

  @type('int8')
  y: number = 0;
}
