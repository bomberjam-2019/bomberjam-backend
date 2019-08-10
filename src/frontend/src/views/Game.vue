<template>
  <div class="game">
    <div class="container">
      <h2 class="my-4">Viewing game {{ roomId }}</h2>

      <section class="jumbotron text-center p-4 m-2">
        <div id="pixi" class="mx-auto"></div>
      </section>

      <div v-show="isRoomOwner" class="text-center m-2">
        <button v-on:click.stop.prevent="resumeGame" v-bind:disabled="isBusy" class="btn btn-primary btn-sm m-2 mr-3">
          Play
        </button>

        <button v-on:click.stop.prevent="pauseGame" v-bind:disabled="isBusy" class="btn btn-primary btn-sm m-2 mr-3">
          Pause
        </button>

        <button v-on:click.stop.prevent="increaseSpeed" v-bind:disabled="isBusy" class="btn btn-primary btn-sm m-2 mr-3">
          Increase speed
        </button>

        <button v-on:click.stop.prevent="decreaseSpeed" v-bind:disabled="isBusy" class="btn btn-primary btn-sm m-2 mr-3">
          Decrease speed
        </button>
      </div>

      <section class="jumbotron p-4 m-2">
        <pre id="debug" class="m-0"></pre>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { IGameViewerController, showGame } from '../game/game';
import { IJoinRoomOpts } from '../../../types';

export default Vue.extend({
  data() {
    return {
      roomId: '' as string,
      isRoomOwner: false as boolean,
      busyCounter: 0 as number,
      gameViewerCtrl: null as IGameViewerController | null
    };
  },
  computed: {
    isBusy: function(): boolean {
      return this.busyCounter > 0;
    }
  },
  async mounted(): Promise<void> {
    const roomId = this.$route.params.roomId as string;

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

      const originalRoomId = roomId;
      this.gameViewerCtrl = await showGame(joinOpts, isOwner => {
        if (!this.isRoomOwner && isOwner) this.isRoomOwner = isOwner;
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
    }
  }
});
</script>