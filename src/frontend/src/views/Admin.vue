<template>
  <div class="home">
    <section class="jumbotron text-center">
      <div class="container">
        <h2 class="jumbotron-heading">Current games</h2>
        <p class="lead text-muted">
          Games without any connected client (player or spectator) will be disposed and therefore not listed here.
        </p>

        <form class="form-inline justify-content-center">
          <div class="form-group">
            <label for="tickDurationMs">Tick duration (ms)</label>
            <input v-model="tickDurationMs" type="number" class="form-control m-2" size="5" maxlength="4" id="tickDurationMs" />
          </div>

          <div class="form-group">
            <label for="shufflePlayers">Shuffle starting positions</label>
            <input v-model="shufflePlayers" type="checkbox" class="form-control m-2" id="shufflePlayers" />
          </div>

          <a href="#" v-on:click.stop.prevent="createNewGame" class="btn btn-primary m-2 mr-3">Create new game</a>

          <a href="#" v-on:click.stop.prevent="refreshRooms" class="btn btn-link m-2 ml-3">Refresh game list</a>
        </form>
      </div>
    </section>

    <div class="container">
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Players</th>
              <th scope="col">Tick</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="room in rooms" v-bind:key="room.roomId">
              <td>
                <router-link class="btn btn-primary btn-sm" :to="{ name: 'game', params: { roomId: room.roomId } }">{{
                  room.roomId
                }}</router-link>
              </td>
              <td>{{ room.playerNames }}</td>
              <td>{{ room.tick }}</td>
              <td>{{ room.state }}</td>
            </tr>
            <tr v-show="rooms.length === 0">
              <td colspan="4">No games found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { listRooms } from '../game/game';

interface IVueRoomMetadata {
  roomId: string;
  tick: number;
  state: string;
  playerNames: string;
}

export default Vue.extend({
  data() {
    return {
      rooms: [] as IVueRoomMetadata[],
      refreshInterval: 0 as number,
      tickDurationMs: '' as string,
      shufflePlayers: false as boolean
    };
  },
  async mounted(): Promise<void> {
    this.tickDurationMs = '500';
    this.shufflePlayers = false;
    await this.refreshRooms();
    this.startAutoRefresh();
  },
  beforeDestroy(): void {
    this.stopAutoRefresh();
  },
  methods: {
    startAutoRefresh(): void {
      this.refreshInterval = window.setInterval(() => {
        this.refreshRooms();
      }, 5000);
    },
    stopAutoRefresh() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = 0;
      }
    },
    async refreshRooms(): Promise<void> {
      try {
        const rooms = await listRooms();
        const availableRooms: IVueRoomMetadata[] = rooms.map(r => ({
          roomId: r.roomId,
          tick: r.tick,
          state: this.getStateName(r.state),
          playerNames: r.players.length > 0 ? r.players.join(', ') : 'No players yet'
        }));

        this.rooms.length = 0;
        this.rooms.push(...availableRooms);
      } catch (err) {
        console.log(err);
        this.stopAutoRefresh();
      }
    },
    createNewGame() {
      let roomId = 'new';
      if (!Number.isNaN(Number(this.tickDurationMs))) {
        const tickDurationMs: number = Math.ceil(Number(this.tickDurationMs));
        if (tickDurationMs > 0) roomId += '-' + tickDurationMs;
      }

      this.$router.push({ name: 'game', params: { roomId: roomId, shufflePlayers: this.shufflePlayers.toString() } });
    },
    getStateName(state: -1 | 0 | 1): string {
      switch (state) {
        case -1:
          return 'Waiting for players';
        case 0:
          return 'Playing';
        case 1:
          return 'Finished';
        default:
          return 'Unknown';
      }
    }
  }
});
</script>
