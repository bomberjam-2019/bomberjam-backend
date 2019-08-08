import { IResourceDictionary, Texture } from 'pixi.js';
import { Sprites } from './assets';

export class TextureRegistry {
  public readonly floor: Texture;
  public readonly wall: Texture;
  public readonly block: Texture;
  public readonly player: {
    front: Texture[];
    back: Texture[];
    left: Texture[];
    right: Texture[];
  };
  public readonly bomb: Texture[];
  public readonly flame: Texture[];
  public readonly fireBonus: Texture;
  public readonly bombBonus: Texture;
  public readonly tileSize: number = 32;
  public readonly spriteRatio: number;

  constructor(resources: IResourceDictionary) {
    this.floor = resources[Sprites.floor].texture;
    this.wall = resources[Sprites.wall].texture;
    this.block = resources[Sprites.block].texture;
    this.player = {
      front: Sprites.player.front.map(path => resources[path].texture),
      back: Sprites.player.back.map(path => resources[path].texture),
      left: Sprites.player.left.map(path => resources[path].texture),
      right: Sprites.player.right.map(path => resources[path].texture)
    };
    this.bomb = Sprites.bomb.map(path => resources[path].texture);
    this.flame = Sprites.flame.map(path => resources[path].texture);
    this.fireBonus = resources[Sprites.bonuses.fire].texture;
    this.bombBonus = resources[Sprites.bonuses.bomb].texture;

    this.spriteRatio = this.tileSize / this.floor.width;
  }

  destroy() {
    this.floor.destroy(true);
    this.wall.destroy(true);
    this.block.destroy(true);
    this.player.front.forEach(t => t.destroy(true));
    this.player.back.forEach(t => t.destroy(true));
    this.player.left.forEach(t => t.destroy(true));
    this.player.right.forEach(t => t.destroy(true));
    this.bomb.forEach(t => t.destroy(true));
    this.flame.forEach(t => t.destroy(true));
    this.fireBonus.destroy(true);
    this.bombBonus.destroy(true);
  }
}
