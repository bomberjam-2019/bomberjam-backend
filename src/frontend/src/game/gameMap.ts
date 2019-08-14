import { AnimatedSprite, Container, DisplayObject, Sprite, Texture, TilingSprite } from 'pixi.js';
import { TextureRegistry } from './textureRegistry';
import { SoundRegistry } from './soundRegistry';
import { IBomb, IBonus, IGameState, IHasPos, IPlayer } from '../../../types';
import { GameContainer } from './gameContainer';
import { PlayerColor } from './playerColor';
import { IHasState } from '../game/bombermanRenderer';

type SpriteType = 'player' | 'bomb' | 'flame' | 'bonus' | 'block' | 'wall';

export class GameMap extends GameContainer {
  private readonly textures: TextureRegistry;
  private readonly sounds: SoundRegistry;
  private readonly mapContainer: Container;

  private wallSprites: Sprite[] = [];
  private blockSprites: Sprite[] = [];
  private playerSprites: { [playerId: string]: AnimatedSprite } = {};
  private bombSprites: { [bombId: string]: Sprite } = {};
  private bonusesSprites: { [bonusId: string]: Sprite } = {};
  private flameSprites: Sprite[] = [];

  constructor(stateProvider: IHasState, textures: TextureRegistry, sounds: SoundRegistry) {
    super(stateProvider);

    this.textures = textures;
    this.sounds = sounds;
    this.mapContainer = new Container();
  }

  public initialize() {
    const containerSize = {
      width: (this.state.width + 2) * this.textures.tileSize,
      height: (this.state.height + 2) * this.textures.tileSize
    };

    const mapSize = {
      width: this.state.width * this.textures.tileSize,
      height: this.state.height * this.textures.tileSize
    };

    const wallTilingSprite = new TilingSprite(this.textures.wall[0], containerSize.width, containerSize.height);
    wallTilingSprite.tileScale.set(this.textures.spriteRatio, this.textures.spriteRatio);
    this.container.addChild(wallTilingSprite);

    const floorTilingSprite = new TilingSprite(this.textures.floor[0], mapSize.width, mapSize.height);
    floorTilingSprite.tileScale.set(this.textures.spriteRatio, this.textures.spriteRatio);
    this.mapContainer.position.set(this.textures.tileSize, this.textures.tileSize);
    this.mapContainer.addChild(floorTilingSprite);

    this.container.addChild(this.mapContainer);
  }

  onPlayerAdded(playerId: string, player: IPlayer): void {
    this.registerPlayer(playerId, player);
    this.sounds.coin.play();
  }

  onPlayerRemoved(playerId: string, player: IPlayer): void {
    this.unregisterObjectSprite(this.playerSprites, playerId);
    this.sounds.error.play();
  }

  onBombAdded(bombId: string, bomb: IBomb): void {
    this.registerBomb(bombId, bomb);
    this.sounds.bomb.play();
  }

  onBombRemoved(bombId: string, bomb: IBomb): void {
    this.unregisterObjectSprite(this.bombSprites, bombId);
  }

  onBonusAdded(bonusId: string, bonus: IBonus): void {
    this.registerBonus(bonusId, bonus);
  }

  onBonusRemoved(bonusId: string, bonus: IBonus): void {
    this.unregisterObjectSprite(this.bonusesSprites, bonusId);

    // If player got Bonus
    for (const playerId in this.state.players) {
      const player: IPlayer = this.state.players[playerId];
      if (bonus.x === player.x && bonus.y === player.y) {
        this.sounds.powerup.play();
      }
    }
  }

  public onStateChanged(prevState: IGameState) {
    for (const playerId in this.playerSprites) {
      const oldPlayer = prevState.players[playerId];
      const newPlayer = this.state.players[playerId];

      if (oldPlayer && newPlayer) {
        if (newPlayer.x > oldPlayer.x) {
          this.unregisterObjectSprite(this.playerSprites, playerId);
          this.registerPlayer(playerId, oldPlayer, 'right');
        } else if (newPlayer.x < oldPlayer.x) {
          this.unregisterObjectSprite(this.playerSprites, playerId);
          this.registerPlayer(playerId, oldPlayer, 'left');
        } else if (newPlayer.y > oldPlayer.y) {
          this.unregisterObjectSprite(this.playerSprites, playerId);
          this.registerPlayer(playerId, oldPlayer, 'front');
        } else if (newPlayer.y < oldPlayer.y) {
          this.unregisterObjectSprite(this.playerSprites, playerId);
          this.registerPlayer(playerId, oldPlayer, 'back');
        } else {
          this.playerSprites[playerId].stop();
        }

        const sprite: Sprite = this.playerSprites[playerId];

        // On replay mode, you can skip multiple ticks so we don't want to animate players in that case
        const diffTickCount = Math.abs(this.state.tick - prevState.tick);
        if (diffTickCount === 1) {
          sprite.x = oldPlayer.x * this.textures.tileSize;
          sprite.y = oldPlayer.y * this.textures.tileSize;

          sprite.vx = oldPlayer.x === newPlayer.x ? 0 : newPlayer.x - oldPlayer.x > 0 ? this.textures.tileSize : -this.textures.tileSize;
          sprite.vy = oldPlayer.y === newPlayer.y ? 0 : newPlayer.y - oldPlayer.y > 0 ? this.textures.tileSize : -this.textures.tileSize;
        } else {
          sprite.x = newPlayer.x * this.textures.tileSize;
          sprite.y = newPlayer.y * this.textures.tileSize;

          sprite.vx = 0;
          sprite.vy = 0;
        }

        if (this.state.state === 1) {
          sprite.vx = 0;
          sprite.vy = 0;
        }
      }
    }

    // Game started
    if (prevState.state === -1 && this.state.state === 0) {
      this.sounds.waiting.stop();
      this.sounds.level.play();
    }
    // Game ended
    else if (prevState.state === 0 && this.state.state === 1) {
      this.sounds.level.stop();
      this.sounds.victory.play();
    }
    // Game was ended but the replay started the game again
    else if (prevState.state === 1 && this.state.state === 0) {
      this.sounds.victory.stop();
      this.sounds.level.play();
    }

    // Hide bombs that just exploded
    for (const bombId in this.state.bombs) {
      const bomb: IBomb = this.state.bombs[bombId];
      const bombSprite: Sprite = this.bombSprites[bombId];

      if (bomb.countdown <= 0 && bombSprite) {
        bombSprite.visible = false;
        this.sounds.explosion.play();
      }
    }

    // Hide dead players
    for (const playerId in this.state.players) {
      const player: IPlayer = this.state.players[playerId];
      const playerSprite: Sprite = this.playerSprites[playerId];

      if (playerSprite) {
        if (!player.alive && !player.hasWon) {
          playerSprite.visible = false;

          if (prevState.players[playerId].alive !== player.alive) {
            this.sounds.death.play();
          }
        } else {
          playerSprite.visible = true;
        }
      }
    }

    this.displayFlames();

    let previousWallCount = this.wallSprites.length;
    this.displayWallsAndBlocks();

    // New wall has dropped.
    if (previousWallCount !== this.wallSprites.length) {
      this.sounds.stomp.play();
    }

    // z-ordering
    this.fixZOrdering();
  }

  private fixZOrdering(): void {
    this.mapContainer.children.sort((s1: DisplayObject, s2: DisplayObject) => {
      const y1 = Math.floor(s1.y / this.textures.tileSize);
      const y2 = Math.floor(s2.y / this.textures.tileSize);
      return y1 - y2;
    });
  }

  public onPixiFrameUpdated(delta: number): void {
    if (typeof this.state.tickDuration !== 'number' || this.state.tickDuration <= 0)
      throw new Error('Expected positive state tick duration');

    const progress = delta / this.state.tickDuration;

    for (const playerId in this.playerSprites) {
      const sprite: Sprite = this.playerSprites[playerId];

      sprite.x += sprite.vx * progress;
      sprite.y += sprite.vy * progress;
    }
  }

  private registerPlayer(playerId: string, player: IPlayer, orientation: 'left' | 'right' | 'front' | 'back' = 'front'): void {
    let textures: Texture[] = this.textures.player.front;
    if (orientation === 'left') textures = this.textures.player.left;
    else if (orientation === 'right') textures = this.textures.player.right;
    else if (orientation === 'front') textures = this.textures.player.front;
    else if (orientation === 'back') textures = this.textures.player.back;

    const sprite = this.makeAnimatedSprite(textures, player, 'player', false);
    sprite.anchor.set(0, 0.5);
    PlayerColor.colorize(playerId, sprite);
    this.playerSprites[playerId] = sprite;
    this.mapContainer.addChild(sprite);
    this.sounds.footsteps.play();
  }

  private registerBomb(bombId: string, bomb: IBomb) {
    if (bomb.countdown >= 0) {
      const sprite = this.makeAnimatedSprite(this.textures.bomb, bomb, 'bomb', true);
      sprite.anchor.set(0.5, 0.5);
      this.bombSprites[bombId] = sprite;
      this.mapContainer.addChild(sprite);
    }
  }

  private registerBonus(bonusId: string, bonus: IBonus) {
    const texture = bonus.type === 'bomb' ? this.textures.bombBonus : this.textures.fireBonus;
    const sprite = this.makeAnimatedSprite(texture, bonus, 'bonus', true);
    sprite.anchor.set(0.5, 0.5);
    this.bonusesSprites[bonusId] = sprite;
    this.mapContainer.addChild(sprite);
  }

  private displayFlames() {
    for (const sprite of this.flameSprites) {
      this.unregisterSprite(sprite);
    }

    this.flameSprites.length = 0;

    if (this.state.explosions) {
      this.state.explosions
        .split(';')
        .filter(str => str.length > 0)
        .forEach(str => {
          const [x, y] = str.split(':').map(Number);

          const sprite = this.makeAnimatedSprite(this.textures.flame, { x: x, y: y }, 'flame', true);
          sprite.anchor.set(0.5, 0.5);
          this.mapContainer.addChild(sprite);
          this.flameSprites.push(sprite);
        });
    }
  }

  private displayWallsAndBlocks() {
    for (const sprite of [...this.wallSprites, ...this.blockSprites]) {
      this.unregisterSprite(sprite);
    }

    this.wallSprites.length = 0;
    this.blockSprites.length = 0;

    for (let x = 0; x < this.state.width; x++) {
      for (let y = 0; y < this.state.height; y++) {
        const idx = y * this.state.width + x;
        const char = this.state.tiles[idx];

        if (char === '+' || char === '#') {
          let sprite: Sprite;
          if (char === '+') {
            sprite = this.makeAnimatedSprite(this.textures.block, { x: x, y: y }, 'block', false);
            this.blockSprites.push(sprite);
          } else {
            sprite = this.makeAnimatedSprite(this.textures.wall, { x: x, y: y }, 'wall', false);
            this.wallSprites.push(sprite);
          }

          this.mapContainer.addChild(sprite);
        }
      }
    }
  }

  private unregisterObjectSprite(sprites: { [k: string]: Sprite }, key: string) {
    const sprite: Sprite = sprites[key];
    if (sprite) {
      this.unregisterSprite(sprite);
      delete sprites[key];
    }
  }

  private unregisterSprite(sprite: Sprite) {
    this.mapContainer.removeChild(sprite);
    sprite.destroy();
  }

  private makeAnimatedSprite(textures: Texture[], pos: IHasPos, type: SpriteType, centered: boolean): AnimatedSprite {
    const sprite = new AnimatedSprite(textures, true);

    if (centered) {
      sprite.position.set(
        pos.x * this.textures.tileSize + this.textures.tileSize / 2.0,
        pos.y * this.textures.tileSize + this.textures.tileSize / 2.0
      );
    } else {
      sprite.position.set(pos.x * this.textures.tileSize, pos.y * this.textures.tileSize);
    }

    sprite.animationSpeed = 0.15;
    sprite.scale.set(this.textures.spriteRatio, this.textures.spriteRatio);
    sprite.vx = 0;
    sprite.vy = 0;
    sprite.type = type;

    sprite.play();

    return sprite;
  }

  public resetPlayerPositions() {
    for (const playerId in this.playerSprites) {
      const player = this.state.players[playerId];
      const sprite: Sprite = this.playerSprites[playerId];

      sprite.x = player.x * this.textures.tileSize;
      sprite.y = player.y * this.textures.tileSize;
      sprite.vx = 0;
      sprite.vy = 0;
    }

    this.fixZOrdering();
  }
}
