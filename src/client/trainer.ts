import fs from 'fs';
import { simulation } from './simulator';
import { getMachineLearningAgents, getSavedModel, getSavedModelPath } from './utils';

async function main() {
  const agents = getMachineLearningAgents();
  agents.forEach(agent => {
    agent.init(getSavedModel());
  });

  for (let i = 1; i <= 10000; i++) {
    console.log(`\nGame ${i} started!`);
    const gameStates = await simulation(agents);
    agents.forEach((agent, i) => {
      agent.train(gameStates, i);
    });
  }

  // TODO dump only the best agent ?
  console.log('Training done! Saving models to file...');
  agents.forEach((agent, i) => {
    fs.writeFile(`${getSavedModelPath()}-${i}`, agent.dump(), handleWriteError);
  });
}

main().catch(err => console.log(`Trainer error: ${err}`));

function handleWriteError(error: Error | null) {
  if (error) {
    throw error;
  }
}
