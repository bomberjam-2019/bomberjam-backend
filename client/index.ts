import { getFourBots, getJoinOptions, sleepAsync } from './utils';
import { jsonClone } from '../common/utils';
import { GameClient } from './gameClient';

async function main(): Promise<void> {
  const bots = getFourBots();
  const joinOpts = getJoinOptions();
  const clients: GameClient[] = [];

  const mainClient = new GameClient(bots[0], joinOpts, false);
  const roomId = await mainClient.runAsync();
  await sleepAsync(500);
  clients.push(mainClient);

  if (joinOpts.training) {
    for (let i = 0; i < 3; i++) {
      const newJoinOpts = jsonClone(joinOpts);
      newJoinOpts.roomId = roomId;
      newJoinOpts.name = `${newJoinOpts.name} (${i + 1})`;
      newJoinOpts.createNewRoom = false;

      const otherClient = new GameClient(bots[i + 1], newJoinOpts, true);
      await otherClient.runAsync();
      await sleepAsync(500);
      clients.push(otherClient);
    }
  }
}

main().catch(err => console.log(err));
