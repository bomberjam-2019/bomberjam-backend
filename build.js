'use strict';

const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const typescript = require('rollup-plugin-typescript2');
const { terser } = require('rollup-plugin-terser');

const packageDependencies = Object.keys(require(path.resolve(__dirname, 'package.json')).dependencies);
const nodeDependencies = ['http', 'path', 'os', 'fs', 'process'];

const rollupConfig = {
  output: {
    format: 'cjs',
    sourcemap: false
  },
  plugins: [
    typescript({
      typescript: require('typescript'),
      tsconfig: path.resolve(__dirname, 'tsconfig.json'),
      tsconfigOverride: {
        compilerOptions: {
          module: 'es6'
        }
      }
    }),
    terser()
  ],
  external: [...packageDependencies, ...nodeDependencies]
};

const appConfigs = {
  server: {
    input: path.resolve(__dirname, 'src/server/index.ts'),
    output: path.resolve(__dirname, 'dist/server.js')
  },
  client: {
    input: path.resolve(__dirname, 'src/client/index.ts'),
    output: path.resolve(__dirname, 'dist/index.js')
  }
};

async function buildServerAndClient() {
  for (const appName in appConfigs) {
    const appConfig = appConfigs[appName];
    rollupConfig.input = appConfig.input;
    rollupConfig.output.file = appConfig.output;

    const bundle = await rollup.rollup(rollupConfig);
    await bundle.write(rollupConfig.output);
  }
}

function moveClientDefinitions() {
  const inputFilePath = path.resolve(__dirname, 'dist/types.d.ts');
  const outputFilePath = path.resolve(__dirname, 'dist/index.d.ts');

  if (fs.existsSync(inputFilePath)) {
    fs.renameSync(inputFilePath, outputFilePath);
  }
}
function createPackageJsonFile() {
  const inputPackageJson = require(path.resolve(__dirname, 'package.json'));
  const outputPackageJson = {
    name: inputPackageJson.name,
    version: inputPackageJson.version,
    license: inputPackageJson.license,
    main: 'index.js',
    typings: 'index.d.ts',
    files: ['**/*'],
    dependencies: inputPackageJson.dependencies,
    devDependencies: inputPackageJson.devDependencies
  };

  const outputPackageJsonPath = path.resolve(__dirname, 'dist/package.json');
  fs.writeFileSync(outputPackageJsonPath, JSON.stringify(outputPackageJson, null, 2));
}

async function build() {
  moveClientDefinitions();
  createPackageJsonFile();
  await buildServerAndClient();
}

build().catch(console.log);
