import { Sprite } from 'pixi.js';

const AllColors: number[] = [0xff8f8f, 0xffff8a, 0x7aff7a, 0x75c0ff, 0xff78fd];

export class PlayerColor {
  private static players: { [playerId: string]: number } = {};

  public static colorize(playerId: string, player: Sprite): void {
    let color: number;

    if (this.players[playerId]) {
      color = this.players[playerId];
    } else {
      const idx = Object.keys(this.players).length % AllColors.length;
      color = AllColors[idx];
      this.players[playerId] = color;
    }

    player.tint = color;
  }
}
