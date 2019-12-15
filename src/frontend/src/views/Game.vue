<template>
  <div id="game">
    <bomberjam-logo v-show="!isFullscreen" />

    <div v-bind:class="{ 'container-fluid': !isFullscreen, fullscreen: isFullscreen }">
      <div class="row">
        <div
          v-bind:class="{
            'col-12 col-md-10 offset-md-1 col-lg-8 offset-lg-2 col-xl-6 offset-xl-3': !isFullscreen,
            'col-10 offset-1': isFullscreen
          }"
        >
          <div class="row align-items-center">
            <div class="col-auto mr-auto">
              <h4 class="my-2 my-sm-3">Viewing game {{ roomId }}</h4>
            </div>

            <div class="col-auto">
              <button type="button" v-on:click.stop.prevent="toggleFullscreen" class="btn btn-primary btn-sm my-2 my-sm-3">
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

          <div v-show="isRoomOwner" class="text-right my-2 my-sm-3">
            <button v-on:click.stop.prevent="pauseOrResumeGame" v-bind:disabled="isBusy" class="btn btn-primary btn-sm mx-1">
              <template v-if="isPlaying">
                <font-awesome-icon icon="pause" />
              </template>
              <template v-else>
                <font-awesome-icon icon="play" />
              </template>
            </button>

            <button v-on:click.stop.prevent="decreaseSpeed" v-bind:disabled="isBusy" class="btn btn-primary btn-sm mx-1">
              Slower
            </button>

            <button v-on:click.stop.prevent="increaseSpeed" v-bind:disabled="isBusy" class="btn btn-primary btn-sm mx-1">
              Faster
            </button>
          </div>

          <section class="jumbotron p-4 d-none">
            <pre id="debug" class="m-0">{{ stateJsonStr }}</pre>
          </section>

          <back-button v-show="!isFullscreen" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as screenfull from 'screenfull';
import { IGameState, IJoinRoomOpts } from '../../../types';
import { ILiveGameController, showGame } from '../game/game';

export default Vue.extend({
  data() {
    return {
      roomId: '' as string,
      isRoomOwner: false as boolean,
      busyCounter: 0 as number,
      gameViewerCtrl: null as ILiveGameController | null,
      isFullscreen: false as boolean,
      stateJsonStr: '' as string,
      isPlaying: false as boolean
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

    try {
      const joinOpts: IJoinRoomOpts = {
        spectate: true
      };

      if (typeof roomId !== 'string' || roomId === 'new') {
        joinOpts.createNewRoom = true;
      } else {
        joinOpts.roomId = roomId;
      }

      const originalRoomId = roomId;
      this.gameViewerCtrl = await showGame(joinOpts, (newState, isRoomOwner) => {
        if (!this.isRoomOwner && isRoomOwner) this.isRoomOwner = isRoomOwner;
        this.isPlaying = !newState.isSimulationPaused;
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
    pauseOrResumeGame(): void {
      if (this.isPlaying) {
        this.pauseGame();
      } else {
        this.resumeGame();
      }
    },
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
          this.isPlaying = false;
          setTimeout(() => this.busyCounter--, 300);
        }
      }
    },
    increaseSpeed(): void {
      if (!this.isBusy) {
        if (this.gameViewerCtrl) {
          this.busyCounter++;
          this.gameViewerCtrl.increaseSpeed();
          this.isPlaying = true;
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
