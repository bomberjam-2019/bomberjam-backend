import fs from 'fs';
import { simulation } from './simulator';
import { getMachineLearningAgent, getSavedModel, getSavedModelPath } from './utils';

async function main() {
  const agent = getMachineLearningAgent();
  agent.init(getSavedModel());

  for (let i = 1; i <= 1000; i++) {
    console.log(`\nGame ${i} started!`);
    const gameStates = await simulation(agent);
    agent.train(gameStates);
  }

  console.log('Training done! Saving model to file...');
  fs.writeFile(getSavedModelPath(), agent.dump(), handleWriteError);
}

main().catch(err => console.log(`Trainer error: ${err}`));

function handleWriteError(error: Error | null) {
  if (error) {
    throw error;
  }
}
