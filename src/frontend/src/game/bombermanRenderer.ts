import { Room } from 'colyseus.js';
import { Application } from 'pixi.js';
import { TextureRegistry } from './textureRegistry';
import { IBomb, IBonus, IGameState, IPlayer } from '../../../types';
import { GameMap } from './gameMap';
import { GameHud } from './gameHud';

export class BombermanRenderer {
  private room: Room<IGameState>;
  private pixiApp: Application;
  private textures: TextureRegistry;
  private prevState: IGameState;

  private readonly map: GameMap;
  private readonly hud: GameHud;

  constructor(room: Room<IGameState>, pixiApp: Application, textures: TextureRegistry) {
    this.room = room;
    this.pixiApp = pixiApp;
    this.textures = textures;

    this.prevState = this.room.state;
    this.map = new GameMap(room.state, textures);
    this.hud = new GameHud(room.state, textures);

    this.initialize();
  }

  public initialize() {
    this.map.initialize();
    this.hud.initialize();

    this.pixiApp.stage.addChild(this.map.container);
    this.pixiApp.stage.addChild(this.hud.container);
    this.hud.container.position.x = this.map.container.width;

    this.registerStateChangeHandlers();

    this.pixiApp.renderer.resize(this.pixiApp.stage.width, this.pixiApp.stage.height);
  }

  public registerStateChangeHandlers() {
    this.addPlayerListeners();
    this.addBombsListeners();
    this.addBonusesListeners();
  }

  private addPlayerListeners() {
    (this.room.state.players as any).onAdd = (player: IPlayer, playerId: string) => {
      this.map.onPlayerAdded(playerId, player);
      this.hud.onPlayerAdded(playerId, player);
    };

    (this.room.state.players as any).onRemove = (player: IPlayer, playerId: string) => {
      this.map.onPlayerRemoved(playerId, player);
      this.hud.onPlayerRemoved(playerId, player);
    };

    for (const playerId in this.room.state.players) {
      this.map.onPlayerAdded(playerId, this.room.state.players[playerId]);
      this.hud.onPlayerAdded(playerId, this.room.state.players[playerId]);
    }
  }

  private addBombsListeners() {
    (this.room.state.bombs as any).onAdd = (bomb: IBomb, bombId: string) => {
      this.map.onBombAdded(bombId, bomb);
      this.hud.onBombAdded(bombId, bomb);
    };

    (this.room.state.bombs as any).onRemove = (bomb: IBomb, bombId: string) => {
      this.map.onBombRemoved(bombId, bomb);
      this.hud.onBombRemoved(bombId, bomb);
    };

    for (const bombId in this.room.state.bombs) {
      this.map.onBombAdded(bombId, this.room.state.bombs[bombId]);
      this.hud.onBombAdded(bombId, this.room.state.bombs[bombId]);
    }
  }

  private addBonusesListeners() {
    (this.room.state.bonuses as any).onAdd = (bonus: IBonus, bonusId: string) => {
      this.map.onBonusAdded(bonusId, bonus);
      this.hud.onBonusAdded(bonusId, bonus);
    };

    (this.room.state.bonuses as any).onRemove = (bonus: IBonus, bonusId: string) => {
      this.map.onBonusRemoved(bonusId, bonus);
      this.hud.onBonusRemoved(bonusId, bonus);
    };

    for (const bonusId in this.room.state.bonuses) {
      this.map.onBonusAdded(bonusId, this.room.state.bonuses[bonusId]);
      this.hud.onBonusAdded(bonusId, this.room.state.bonuses[bonusId]);
    }
  }

  public onStateChanged() {
    this.map.onStateChanged(this.prevState);
    this.hud.onStateChanged(this.prevState);

    this.prevState = JSON.parse(JSON.stringify(this.room.state));
  }

  public onPixiFrameUpdated(delta: number): void {
    this.map.onPixiFrameUpdated(delta);
    this.hud.onPixiFrameUpdated(delta);
  }
}
