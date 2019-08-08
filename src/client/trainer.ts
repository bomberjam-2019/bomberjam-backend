import { simulation } from './simulator';

async function main() {
  for (let i = 1; i <= 10; i++) {
    console.log(`Game ${i} started!`);
    await simulation();
  }
}

main().catch(err => console.log(`Trainer error: ${err}`));
