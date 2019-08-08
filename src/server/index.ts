import http from 'http';
import express from 'express';

import { APP_NAME, DEFAULT_SERVER_PORT } from '../constants';
import { Server } from 'colyseus';
import { BombermanRoom } from './bombermanRoom';
import { monitor } from '@colyseus/monitor';
import history from 'connect-history-api-fallback';
import path from 'path';

const argv: any = require('minimist')(process.argv.slice(2));
const frontendPath = path.resolve(__dirname, argv['frontend']);
console.log(frontendPath + ': ' + frontendPath);

const config = {
  serverName: 'localhost',
  serverPort: DEFAULT_SERVER_PORT
};

const expressApp = express();
const httpServer = http.createServer(expressApp);
const gameServer = new Server({ server: httpServer });

// Register your room handlers
gameServer.register(APP_NAME, BombermanRoom);

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

console.log(`Listening on ws://${config.serverName}:${config.serverPort}`);
