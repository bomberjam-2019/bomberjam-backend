import fs from 'fs';
import { simulation } from './simulator';
import { getMachineLearningAgent, getSavedModel, getSavedModelPath } from './utils';

async function main() {
  const agent = getMachineLearningAgent();
  let model = agent.init(getSavedModel());
  for (let i = 1; i <= 10; i++) {
    console.log(`Game ${i} started!`);
    const gameStates = await simulation(model);
    model = agent.train(gameStates);
  }

  console.log('Training done! Saving model to file...');
  fs.writeFile(getSavedModelPath(), model.dump(), handleWriteError);
}

main().catch(err => console.log(`Trainer error: ${err}`));

function handleWriteError(error: Error | null) {
  if (error) {
    throw error;
  }
}
