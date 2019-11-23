import * as tf from '@tensorflow/tfjs-node';

export class NeuralNetwork {
  private inputNodes: number;
  private hiddenNodes: number;
  private outputNodes: number;
  model: tf.Sequential;

  constructor(inputNodes: number, hiddenNodes: number, outputNodes: number, model?: tf.Sequential) {
    this.inputNodes = inputNodes;
    this.hiddenNodes = hiddenNodes;
    this.outputNodes = outputNodes;

    if (model) {
      this.model = model;
    } else {
      this.model = this.createModel();
    }
  }

  copy(): NeuralNetwork {
    const modelCopy = this.createModel();
    const weights = this.model.getWeights();
    const weightCopies = [];
    for (let i = 0; i < weights.length; i++) {
      weightCopies[i] = weights[i].clone();
    }
    modelCopy.setWeights(weightCopies);
    return new NeuralNetwork(this.inputNodes, this.hiddenNodes, this.outputNodes, modelCopy);
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
          if (Math.random() < rate) {
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

  createModel(): tf.Sequential {
    const model = tf.sequential();

    const hidden = tf.layers.dense({
      inputShape: [this.inputNodes],
      units: this.hiddenNodes,
      activation: 'sigmoid'
    });
    model.add(hidden);

    const output = tf.layers.dense({
      units: this.outputNodes,
      activation: 'softmax'
    });
    model.add(output);

    return model;
  }

  private gaussianRand() {
    var rand = 0;

    for (var i = 0; i < 6; i += 1) {
      rand += Math.random() - 0.5;
    }

    return rand / 6;
  }
}
