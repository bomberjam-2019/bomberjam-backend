'use strict';

import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import path from 'path';

const packageDependencies = Object.keys(require(path.resolve(__dirname, 'package.json')).dependencies);
const nodeDependencies = ['http', 'path', 'os', 'fs'];

const appConfigs = {
  server: {
    input: path.resolve(__dirname, 'src/server/index.ts'),
    output: path.resolve(__dirname, 'dist/server.js')
  },
  client: {
    input: path.resolve(__dirname, 'src/client/index.ts'),
    output: path.resolve(__dirname, 'dist/client.js')
  },
  simulator: {
    input: path.resolve(__dirname, 'src/client/simulator.ts'),
    output: path.resolve(__dirname, 'dist/simulator.js')
  }
};

const appName = process.env.APPNAME;
if (typeof appName !== 'string' || !Object.keys(appConfigs).includes(appName))
  throw new Error('Specify one of the following apps to build through the env var APPNAME: ' + Object.keys(appConfigs).join(', '));

const appConfig = appConfigs[appName];

const tsConfigOverride = {
  compilerOptions: {
    module: 'es6'
  }
};

export default {
  input: appConfig.input,
  output: {
    file: appConfig.output,
    format: 'cjs',
    sourcemap: false
  },
  plugins: [
    typescript({
      typescript: require('typescript'),
      tsconfig: path.resolve(__dirname, 'tsconfig.json'),
      tsconfigOverride: tsConfigOverride
    }),
    terser()
  ],
  external: [...packageDependencies, ...nodeDependencies]
};
