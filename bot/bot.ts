import { BomberjamEnv } from '../src/client/bomberjamEnv';
import { AllActions } from '../src/types';

// Setup
const maxIterations = 2000;
const env = new BomberjamEnv(4);

// Play
for (let i = 0; i < maxIterations; i++) {
  // Generate actions
  const actions = [AllActions.Right, AllActions.Right, AllActions.Right, AllActions.Right];

  // Apply the actions
  const { state, rewards, done } = env.step(actions);

  // Do something with the outcome
  console.log(i, done);
}
