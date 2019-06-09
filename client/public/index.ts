/// <reference path="../../node_modules/pixi.js/pixi.js.d.ts" />

import { Application, Text, TextStyle } from 'pixi.js';
import { Client } from 'colyseus.js';
import { IGameState } from '../../common/interfaces';

const client = new Client('ws://localhost:4321');
const room = client.join('bomberman');

const app = new Application({
  width: 256,
  height: 256,
  antialias: true,
  backgroundColor: 0xdddddd
});

const tilePixelSize = 32;

room.onJoin.add(() => console.log(`successfully joined room ${room.id}`));
room.onLeave.add(() => console.log(`leaved room ${room.id}`));
room.onError.add((err: any) => console.log(`something wrong happened with room ${room.id}`, err));

let initialized = false;
room.onStateChange.add((state: IGameState) => {
  if (!initialized) {
    app.renderer.resize(state.width * tilePixelSize, state.height * tilePixelSize);
    document.getElementById('pixi')!.appendChild(app.view);
    initialized = true;
  }

  console.log(JSON.stringify(state));
});

client.onClose.add(() => console.log('connection has been closed'));
client.onError.add((err: any) => console.log('something wrong happened with client: ', err));
