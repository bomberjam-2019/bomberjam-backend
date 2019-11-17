import { GenerationManager } from './generationManager';

// Setup
const maxIterations = 1050;

const generationManager = new GenerationManager(2);
generationManager.nextGeneration();

console.log('simulation finish');
