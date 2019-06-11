import _ from 'lodash';
import { ActionCode, Actions, IGameState } from '../common/interfaces';

export function loop(state: IGameState): ActionCode {
  return _.sample(Object.values(Actions)) as ActionCode;
}
