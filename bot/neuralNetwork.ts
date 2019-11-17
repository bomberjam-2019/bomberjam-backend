import * as tf from '@tensorflow/tfjs-node';

export class NeuralNetwork {
  model: tf.Sequential;

  constructor(inputNodes: number, hiddenNodes: number, outputNodes: number) {
    this.model = tf.sequential();

    const hidden = tf.layers.dense({
      inputShape: [inputNodes],
      units: hiddenNodes,
      activation: 'sigmoid'
    });
    this.model.add(hidden);

    const output = tf.layers.dense({
      units: outputNodes,
      activation: 'softmax'
    });
    this.model.add(output);
  }

  mutate(rate: number) {
    tf.tidy(() => {
      const weights = this.model.getWeights();
      const mutatedWeights = [];
      for (let i = 0; i < weights.length; i++) {
        let tensor = weights[i];
        let shape = weights[i].shape;
        let values = tensor.dataSync().slice();
        for (let j = 0; j < values.length; j++) {
          if (Math.round(Math.random()) < rate) {
            let w = values[j];

            values[j] = w + this.gaussianRand();
          }
        }
        let newTensor = tf.tensor(values, shape);
        mutatedWeights[i] = newTensor;
      }
      this.model.setWeights(mutatedWeights);
    });
  }

  private gaussianRand() {
    var rand = 0;

    for (var i = 0; i < 6; i += 1) {
      rand += Math.random();
    }

    return rand / 6;
  }
}
