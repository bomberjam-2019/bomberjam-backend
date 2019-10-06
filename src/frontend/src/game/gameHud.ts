import { GameContainer } from './gameContainer';
import { TextureRegistry } from './textureRegistry';
import { IGameState, IHasState, IPlayer } from '../../../types';
import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';

export class GameHud extends GameContainer {
  private static readonly TextStyle = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 20
  });

  private readonly textures: TextureRegistry;

  constructor(stateProvider: IHasState, textures: TextureRegistry) {
    super(stateProvider);
    this.textures = textures;
  }

  initialize(): void {
    this.refresh();
  }

  onStateChanged(prevState: IGameState): void {
    this.refresh();
  }

  private refresh() {
    this.cleanup();

    let totalScore = 0;
    for (const playerId in this.state.players) {
      this.createPlayerHud(playerId, this.state.players[playerId]);
      totalScore += this.state.players[playerId].score;
    }

    this.reserveSpaceForHud();

    const containerSize = {
      width: (this.state.width + 2) * this.textures.tileSize,
      height: (this.state.height + 2) * this.textures.tileSize
    };

    const playerCount = Object.keys(this.state.players).length;
    const ratios: { [id: string]: number } = {};

    let extraRatios = 0;

    for (const playerId in this.state.players) {
      let ratio = totalScore > 0 ? this.state.players[playerId].score / totalScore : 1 / playerCount;
      if (ratio === 0) {
        ratio = 0.01;
        extraRatios += ratio;
      }

      ratios[playerId] = ratio;
    }

    const container = new Container();
    let lastY = 0;

    for (const playerId in this.state.players) {
      ratios[playerId] = ratios[playerId] - extraRatios / playerCount;

      const something = new Graphics();
      const height = ratios[playerId] * containerSize.height;

      something.beginFill(this.state.players[playerId].color);
      something.drawRect(0, lastY, 10, height);
      something.endFill();

      lastY += height;
      container.addChild(something);
    }

    this.container.addChild(container);
  }

  private cleanup() {
    for (let i = 0; i < this.container.children.length; i++) {
      const childContainer = this.container.children[i] as Container;
      childContainer.destroy({
        children: true
      });
    }

    this.container.removeChildren();
  }

  private createPlayerHud(playerId: string, player: IPlayer): void {
    const container = new Container();

    const playerSprite = this.makeStaticSprite(this.textures.player.front[0]);
    playerSprite.x = 20;
    playerSprite.y = 25;
    playerSprite.tint = player.color;

    const playerNameText = new Text(player.name, GameHud.TextStyle);
    playerNameText.x = playerSprite.x + playerSprite.width + 10;
    playerNameText.y = playerSprite.y + 10;

    const bombSprite = this.makeStaticSprite(this.textures.bomb[0]);
    bombSprite.x = playerNameText.x;
    bombSprite.y = playerNameText.y + playerNameText.height + 5;

    const bombCountText = new Text(player.bombsLeft + '/' + player.maxBombs, GameHud.TextStyle);
    bombCountText.x = bombSprite.x + bombSprite.width + 5;
    bombCountText.y = bombSprite.y;

    const flameSprite = this.makeStaticSprite(this.textures.flame[0]);
    flameSprite.x = bombCountText.x + bombCountText.width + 10;
    flameSprite.y = bombSprite.y;

    const bombRangeText = new Text(player.bombRange.toString(), GameHud.TextStyle);
    bombRangeText.x = flameSprite.x + flameSprite.width + 5;
    bombRangeText.y = bombSprite.y;

    const scoreText = new Text(`- score: ${player.score.toString()}`, GameHud.TextStyle);
    scoreText.x = bombRangeText.x + bombRangeText.width + 5;
    scoreText.y = bombSprite.y;

    const padding = new Graphics();

    padding.beginFill(0xff0000);
    padding.drawRect(Math.max(playerNameText.x + playerNameText.width, bombRangeText.x + bombRangeText.width), playerNameText.y, 50, 10);
    padding.endFill();
    padding.alpha = 0;

    container.addChild(playerSprite, playerNameText, bombSprite, bombCountText, flameSprite, bombRangeText, scoreText, padding);

    container.y = this.container.children.length * (container.height + 25);

    if (!player.alive) {
      container.alpha = 0.5;
    }

    this.container.addChild(container);
  }

  private makeStaticSprite(texture: Texture): Sprite {
    const sprite = new Sprite(texture);

    sprite.scale.set(this.textures.spriteRatio, this.textures.spriteRatio);
    sprite.vx = 0;
    sprite.vy = 0;

    return sprite;
  }

  private reserveSpaceForHud() {
    const container = new Container();
    const padding = new Graphics();

    padding.beginFill(0xff0000);
    padding.drawRect(0, 0, 400, 1);
    padding.endFill();
    padding.alpha = 0;

    container.addChild(padding);

    this.container.addChild(container);
  }
}
