import GenerationManager from './generationManager';

(async () => {
  try {
    const generationManager = new GenerationManager(4);

    while (true) {
      await generationManager.runGeneration();
      await generationManager.nextGeneration();
    }
  } catch (e) {
    console.log(e);
  }
})();
