# bomberman-colyseus

First, install npm dependencies with `npm i && cd src && cd frontend && npm i && cd .. && cd ..`.

### Backend and frontend development

- Run the server and the frontend with `npm run start:server`. Visit `http://localhost:4321/admin` to manage the games.

- Run (another) frontend-server only with `npm run start:frontend` so you can live edit the frontend code in `src/frontend`. This result is available at `http://localhost:4322/admin`.

- Compile a minified JavaScript version of the server, the client and the simulator by using `npm run build`. The output will be available in `dist/`.

- Execute the tests with `npm run test`.

### Bot development

- Edit `config.json` to set your player name.

- Edit `bot/bot.js` so it returns an array of one to four bot function.

  - Run `npm run start:client:training` to make your bot functions fight against themselves and see the game in your browser.

  - Run `npm run start:client:simulate` to make your bot functions fight against themselves and dump everything that happened in a `*.gamelog` file. A game server is not needed and the simulation is executed as fast as possible.

- Edit `config.json` then use `npm run start:client:spectate` to spectate a room on another server.

- Edit `config.json` then use `npm run start:client:match` to join a room as a player on another server.
