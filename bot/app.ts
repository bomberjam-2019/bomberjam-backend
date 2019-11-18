import GenerationManager from './generationManager';

(async () => {
  try {
    const generationManager = new GenerationManager(2);

    while (true) {
      await generationManager.runGeneration();
      generationManager.nextGeneration();
    }
  } catch (e) {
    console.log(e);
  }
})();
