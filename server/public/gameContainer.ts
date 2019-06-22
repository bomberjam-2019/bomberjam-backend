import { Container } from "pixi.js";
import { IBomb, IBonus, IGameState, IPlayer } from "../../common/types";

export abstract class GameContainer {
  public readonly state: IGameState;
  public readonly container: Container;

  protected constructor(state: IGameState) {
    this.state = state;
    this.container = new Container();
  }

  public initialize(): void {
  }

  public onStateChanged(prevState: IGameState): void {
  }

  public onPixiFrameUpdated(delta: number): void {
  }

  public onPlayerAdded(playerId: string, player: IPlayer): void {
  }

  public onPlayerRemoved(playerId: string, player: IPlayer): void {
  }

  public onBombAdded(bombId: string, bomb: IBomb): void {
  }

  public onBombRemoved(bombId: string, bomb: IBomb): void {
  }

  public onBonusAdded(bonusId: string, bonus: IBonus): void {
  }

  public onBonusRemoved(bonusId: string, bonus: IBonus): void {
  }
}
