<template>
  <div class="game">
    <div v-bind:class="{ container: !isFullscreen, fullscreen: isFullscreen }">
      <div class="row align-items-center">
        <div class="col-auto mr-auto">
          <h2 class="my-4">Viewing game {{ roomId }}</h2>
        </div>

        <div class="col-auto">
          <button type="button" v-on:click.stop.prevent="toggleFullscreen" class="btn btn-primary btn-sm m-2 mr-3">
            <template v-if="isFullscreen">
              Exit Fullscreen <font-awesome-icon icon="compress-arrows-alt" />
            </template>
            <template v-else>
              Fullscreen <font-awesome-icon icon="expand-arrows-alt" />
            </template>
          </button>
        </div>
      </div>

      <div id="pixi" class="mx-auto"></div>

      <div class="container">
        <div v-show="isRoomOwner" class="text-center m-2">
          <button v-on:click.stop.prevent="resumeGame" v-bind:disabled="isBusy" class="btn btn-primary btn-sm m-2 mr-2">
            <font-awesome-icon icon="play" />
          </button>

          <button v-on:click.stop.prevent="pauseGame" v-bind:disabled="isBusy" class="btn btn-primary btn-sm m-2 mr-2">
            <font-awesome-icon icon="pause" />
          </button>

          <button v-on:click.stop.prevent="decreaseSpeed" v-bind:disabled="isBusy" class="btn btn-primary btn-sm m-2 mr-2">
            Speed -
          </button>

          <button v-on:click.stop.prevent="increaseSpeed" v-bind:disabled="isBusy" class="btn btn-primary btn-sm m-2 mr-2">
            Speed +
          </button>
        </div>
      </div>
    </div>
    <div class="container">
      <section class="jumbotron p-4 m-2">
        <pre id="debug" class="m-0">{{ stateJsonStr }}</pre>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as screenfull from 'screenfull';
import { IJoinRoomOpts } from '../../../types';
import { ILiveGameController, showGame } from '../game/game';

export default Vue.extend({
  data() {
    return {
      roomId: '' as string,
      isRoomOwner: false as boolean,
      busyCounter: 0 as number,
      gameViewerCtrl: null as ILiveGameController | null,
      isFullscreen: false as boolean,
      stateJsonStr: '' as string
    };
  },
  computed: {
    isBusy: function(): boolean {
      return this.busyCounter > 0;
    }
  },
  created: function() {
    if (screenfull && screenfull.enabled) {
      screenfull.on('change', () => {
        this.isFullscreen = screenfull && screenfull.isFullscreen;
      });
    }
  },
  async mounted(): Promise<void> {
    const roomId = this.$route.params.roomId as string;
    const shufflePlayersParam = this.$route.params.shufflePlayers as string;

    try {
      const joinOpts: IJoinRoomOpts = {
        spectate: true
      };

      if (typeof roomId !== 'string' || roomId.indexOf('new') >= 0) {
        joinOpts.createNewRoom = true;
        const parts = roomId.split('-');
        if (parts.length === 2 && !Number.isNaN(Number(parts[1]))) {
          joinOpts.tickDurationMs = Number(parts[1]);
        }
      } else {
        joinOpts.roomId = roomId;
      }

      if (typeof shufflePlayersParam === 'string') {
        joinOpts.shufflePlayers = shufflePlayersParam.toLowerCase() == 'true';
      }

      const originalRoomId = roomId;
      this.gameViewerCtrl = await showGame(joinOpts, (newState, isRoomOwner) => {
        if (!this.isRoomOwner && isRoomOwner) this.isRoomOwner = isRoomOwner;
        this.stateJsonStr = JSON.stringify(newState, null, 2);
      });

      this.roomId = this.gameViewerCtrl.roomId;

      if (originalRoomId !== this.roomId) {
        this.$router.push({ name: 'game', params: { roomId: this.roomId } });
        return;
      }

      this.busyCounter = 0;
    } catch (err) {
      console.log(err);
    }
  },
  beforeDestroy(): void {
    if (this.gameViewerCtrl) {
      this.gameViewerCtrl.stopViewer();
      this.gameViewerCtrl = null;
    }
  },
  methods: {
    resumeGame(): void {
      if (!this.isBusy) {
        if (this.gameViewerCtrl) {
          this.busyCounter++;
          this.gameViewerCtrl.resumeGame();
          setTimeout(() => this.busyCounter--, 300);
        }
      }
    },
    pauseGame(): void {
      if (!this.isBusy) {
        if (this.gameViewerCtrl) {
          this.busyCounter++;
          this.gameViewerCtrl.pauseGame();
          setTimeout(() => this.busyCounter--, 300);
        }
      }
    },
    increaseSpeed(): void {
      if (!this.isBusy) {
        if (this.gameViewerCtrl) {
          this.busyCounter++;
          this.gameViewerCtrl.increaseSpeed();
          setTimeout(() => this.busyCounter--, 300);
        }
      }
    },
    decreaseSpeed(): void {
      if (!this.isBusy) {
        if (this.gameViewerCtrl) {
          this.busyCounter++;
          this.gameViewerCtrl.decreaseSpeed();
          setTimeout(() => this.busyCounter--, 300);
        }
      }
    },
    toggleFullscreen(): void {
      if (screenfull && screenfull.enabled) {
        screenfull.toggle();
      }
    }
  }
});
</script>
