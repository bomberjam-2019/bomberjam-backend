import http from 'http';
import express from 'express';

import { DEFAULT_SERVER_PORT } from '../common/constants';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
import { BombermanRoom } from './Room';

const config = {
  serverName: 'localhost',
  serverPort: DEFAULT_SERVER_PORT
};

const app = express();
const server = http.createServer(app);
const gameServer = new Server({ server });

// register your room handlers
gameServer.register('bomberman', BombermanRoom);

// Register colyseus monitor AFTER registering your room handlers
app.use('/colyseus', monitor(gameServer));

gameServer.listen(config.serverPort);

console.log(`Listening on ws://${config.serverName}:${config.serverPort}`);
