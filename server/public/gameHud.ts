import { GameContainer } from "./gameContainer";
import { TextureRegistry } from "./textureRegistry";
import { IGameState, IHasPos, IPlayer } from "../../common/types";
import { Sprite, Texture } from "pixi.js";

export class GameHud extends GameContainer {
  private readonly textures: TextureRegistry;
  private readonly players: Array<{
    player: IPlayer,
    sprite: Sprite
  }>;

  constructor(state: IGameState, textures: TextureRegistry) {
    super(state);
    this.textures = textures;
    this.players = [];
  }

  initialize(): void {
  }

  onPlayerAdded(playerId: string, player: IPlayer): void {
    const obj = {
      player: player,
      sprite: this.makeStaticSprite(this.textures.player.front[0])
    };

    this.players.push(obj);
    this.container.addChild(obj.sprite);
  }

  private makeStaticSprite(texture: Texture): Sprite {
    const sprite = new Sprite(texture);

    sprite.scale.set(this.textures.spriteRatio, this.textures.spriteRatio);
    sprite.vx = 0;
    sprite.vy = 0;

    return sprite;
  }
}
