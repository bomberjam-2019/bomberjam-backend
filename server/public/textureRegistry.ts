import { IResourceDictionary, Texture } from 'pixi.js';
import { Sprites } from './assets';

export class TextureRegistry {
  public floor: Texture;
  public wall: Texture;
  public block: Texture;
  public player: {
    front: Texture[];
    back: Texture[];
    left: Texture[];
    right: Texture[];
  };
  public bomb: Texture[];
  public flame: Texture[];
  public fireBonus: Texture;
  public bombBonus: Texture;

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
  }
}
