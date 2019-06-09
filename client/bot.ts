import _ from 'lodash';
import { IGameState } from '../common/interfaces';

type ExpectedResultDefinition = {
  movement: 'up' | 'down' | 'left' | 'right' | 'stay';
  action: 'bomb' | 'none';
};

const topLeftScenario: { [tick: number]: ExpectedResultDefinition } = {
  2: { movement: 'right', action: 'none' },
  3: { movement: 'stay', action: 'bomb' },
  4: { movement: 'left', action: 'none' },
  5: { movement: 'down', action: 'none' },
  6: { movement: 'stay', action: 'none' },
  7: { movement: 'stay', action: 'none' },
  8: { movement: 'stay', action: 'bomb' },
  9: { movement: 'up', action: 'none' },
  10: { movement: 'right', action: 'none' },
  11: { movement: 'right', action: 'none' },
  12: { movement: 'stay', action: 'none' },
  13: { movement: 'stay', action: 'bomb' },
  14: { movement: 'left', action: 'none' },
  15: { movement: 'left', action: 'none' },
  16: { movement: 'down', action: 'none' },
  17: { movement: 'stay', action: 'none' },
  18: { movement: 'stay', action: 'none' },
  19: { movement: 'up', action: 'none' },
  20: { movement: 'right', action: 'none' },
  21: { movement: 'right', action: 'none' },
  22: { movement: 'down', action: 'none' },
  23: { movement: 'down', action: 'none' },
  24: { movement: 'stay', action: 'bomb' },
  25: { movement: 'up', action: 'none' },
  26: { movement: 'up', action: 'none' },
  27: { movement: 'right', action: 'none' }
};

const allMoves = ['up', 'down', 'left', 'right'];

export function loop(state: IGameState): ExpectedResultDefinition {
  // const plannedResult = plannedResults[state.tick];
  // if (plannedResult) return plannedResult;

  return {
    movement: _.sample(allMoves) as any,
    action: 'none'
  };
}
