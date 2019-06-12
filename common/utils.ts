import { IGameState } from './types';

export function replaceCharAt(text: string, idx: number, newChar: string): string {
  return text.substr(0, idx) + newChar + text.substr(idx + 1);
}

export function splitStringIntoChunks(text: string, chunkSize: number): string[] {
  const chunkCount = Math.ceil(text.length / chunkSize);
  const chunks = new Array(chunkCount);

  for (let i = 0, j = 0; i < chunkCount; ++i, j += chunkSize) {
    chunks[i] = text.substr(j, chunkSize);
  }

  return chunks;
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function drawAsciiGame(state: IGameState) {
  let tiles = state.tiles;

  for (const bombId in state.bombs) {
    const bomb = state.bombs[bombId];
    const idx = bomb.y * state.width + bomb.x;
    if (bomb.countdown > 0) tiles = replaceCharAt(tiles, idx, 'σ');
  }

  for (const playerId in state.players) {
    const player = state.players[playerId];
    const idx = player.y * state.width + player.x;

    if (player.alive) tiles = replaceCharAt(tiles, idx, '☺');
  }

  const explosionsPositions = state.explosions.split(';').filter(e => e.length > 0);
  for (const explosionPosStr of explosionsPositions) {
    const explosionPos = explosionPosStr.split(':');
    const idx = Number(explosionPos[1]) * state.width + Number(explosionPos[0]);
    tiles = replaceCharAt(tiles, idx, '*');
  }

  tiles = tiles.replace(/\./g, ' ');
  tiles = tiles.replace(/\+/g, '░');
  tiles = tiles.replace(/#/g, '█');

  const eol = process.platform === 'win32' ? '\r\n' : '\n';
  const map = splitStringIntoChunks(tiles, state.width).join(eol);

  console.log('========');
  console.log(JSON.stringify(state));
  console.log(map);
}
