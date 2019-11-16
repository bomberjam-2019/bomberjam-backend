import { Schema, type } from '@colyseus/schema';
import { BonusCode, IBonus } from '../types';

export default class Bonus extends Schema implements IBonus {
  id: string = '';

  @type('int8')
  x: number = 0;

  @type('int8')
  y: number = 0;

  @type('string')
  type: BonusCode = 'bomb';
}
