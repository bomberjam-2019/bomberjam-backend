<template>
  <div id="spectate">
    <bomberjam-logo />

    <div class="container-fluid">
      <div class="row">
        <div class="col-12 col-md-10 offset-md-1 col-lg-8 offset-lg-2 col-xl-6 offset-xl-3">
          <h4 class="mb-4">Spectate a game</h4>

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

            <p class="lead text-muted">
              <small>Games without any connected client (player or spectator) will be disposed and therefore not listed here.</small>
            </p>
          </div>

          <back-button />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
table th {
  background-color: rgba(31, 33, 134, 0.4);
}
table td {
  background-color: rgba(154, 152, 248, 0.4);
}

table th,
table.table-striped tbody tr:nth-of-type(even) td {
  background-color: rgba(31, 33, 134, 0.4);
}
</style>

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
      refreshInterval: 0 as number
    };
  },
  async mounted(): Promise<void> {
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
      }, 3000);
    },
    stopAutoRefresh() {
      if (this.refreshInterval > 0) {
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
