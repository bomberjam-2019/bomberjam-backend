import * as tf from '@tensorflow/tfjs-node';

(async () => {
  try {
    const model = await tf.loadLayersModel('file://./best-bot/model.json');

    for (const layer of model.layers) {
      console.log(layer.id);

      console.log('weights');
      console.log(layer.getWeights()[0].print());

      console.log('bias');
      console.log(layer.getWeights()[1].print());
    }
  } catch (e) {
    console.log(e);
  }
})();
