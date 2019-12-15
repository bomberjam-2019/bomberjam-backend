import fs from 'fs';
import http from 'http';
import path from 'path';
import express from 'express';

import { APP_NAME, DEFAULT_SERVER_PORT } from '../types';
import { Server } from 'colyseus';
import { BomberjamRoom } from './bomberjamRoom';
import { monitor } from '@colyseus/monitor';
import history from 'connect-history-api-fallback';
import HttpSimulator from './httpSimulator';

const argv: any = require('minimist')(process.argv.slice(2));
const frontendPath = path.resolve(__dirname, argv['frontend'] || 'frontend');
if (!fs.existsSync(frontendPath)) throw new Error('--frontend dir does not exists at ' + frontendPath);

const config = {
  serverName: 'localhost',
  serverPort: DEFAULT_SERVER_PORT
};

const expressApp = express();
const httpServer = http.createServer(expressApp);
const gameServer = new Server({ server: httpServer });

HttpSimulator.setup(expressApp);

// Register your room handlers
gameServer.register(APP_NAME, BomberjamRoom);

// Public frontend
expressApp.use(
  history({
    rewrites: [{ from: /\/games/, to: '/index.html' }]
  })
);

expressApp.use(express.static(frontendPath));

// Register colyseus monitor AFTER registering your room handlers
expressApp.use('/colyseus', monitor(gameServer));

gameServer.listen(config.serverPort);

console.log(`Server is up and running. Open http://${config.serverName}:${config.serverPort} in your browser.`);
