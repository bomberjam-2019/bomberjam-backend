import { IResourceDictionary, Texture, Spritesheet } from 'pixi.js';
import { Sprites } from './assets';

export class TextureRegistry {
  private readonly spritesheet: Spritesheet;

  public readonly floor: Texture[];
  public readonly wall: Texture[];
  public readonly block: Texture[];
  public readonly player: {
    front: Texture[];
    back: Texture[];
    left: Texture[];
    right: Texture[];
  };
  public readonly bomb: Texture[];
  public readonly flame: Texture[];
  public readonly fireBonus: Texture[];
  public readonly bombBonus: Texture[];
  public readonly tileSize: number = 32;
  public readonly spriteRatio: number;

  constructor(resources: IResourceDictionary) {
    const spritesheet = resources[Sprites.spritesheet].spritesheet;
    if (!spritesheet) throw new Error('Could not load spritesheet ' + Sprites.spritesheet);
    this.spritesheet = spritesheet;

    for (let id in this.spritesheet.textures) {
      if (this.spritesheet.textures.hasOwnProperty(id)) {
        this.spritesheet.textures[id].defaultAnchor.set(0, 0);
      }
    }

    this.floor = this.spritesheet.animations[Sprites.floor];
    this.wall = this.spritesheet.animations[Sprites.wall];
    this.block = this.spritesheet.animations[Sprites.block];
    this.player = {
      front: this.spritesheet.animations[Sprites.player.front],
      back: this.spritesheet.animations[Sprites.player.back],
      left: this.spritesheet.animations[Sprites.player.left],
      right: this.spritesheet.animations[Sprites.player.right]
    };
    this.bomb = this.spritesheet.animations[Sprites.bomb];
    this.flame = this.spritesheet.animations[Sprites.flame];
    this.fireBonus = this.spritesheet.animations[Sprites.bonuses.flame];
    this.bombBonus = this.spritesheet.animations[Sprites.bonuses.bomb];

    this.spriteRatio = this.tileSize / this.floor[0].width;
  }

  destroy() {
    this.floor.forEach(t => t.destroy(true));
    this.wall.forEach(t => t.destroy(true));
    this.block.forEach(t => t.destroy(true));
    this.player.front.forEach(t => t.destroy(true));
    this.player.back.forEach(t => t.destroy(true));
    this.player.left.forEach(t => t.destroy(true));
    this.player.right.forEach(t => t.destroy(true));
    this.bomb.forEach(t => t.destroy(true));
    this.flame.forEach(t => t.destroy(true));
    this.fireBonus.forEach(t => t.destroy(true));
    this.bombBonus.forEach(t => t.destroy(true));

    this.spritesheet.destroy(true);
  }
}
