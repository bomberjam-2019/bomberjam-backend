<template>
  <div class="replay">
    <div v-bind:class="{ container: !isFullscreen, fullscreen: isFullscreen }">
      <div class="row align-items-center">
        <div class="col-auto mr-auto">
          <h2 class="my-4">Replay a gamelog file</h2>
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

      <div class="form-group">
        <div class="custom-file my-4" v-show="!replayStarted">
          <input type="file" class="custom-file-input" id="file" ref="fileInput" v-on:change="loadGamelogFile" />
          <label class="custom-file-label" for="file">Choose *.gamelog file</label>
        </div>
      </div>

      <div id="pixi" class="mx-auto"></div>

      <div class="row my-4" v-show="replayStarted">
        <div class="col-sm-5">
          <input
            type="range"
            class="custom-range mx-2"
            v-model="selectedTick"
            v-bind:min="minTick"
            v-bind:max="maxTick"
            v-on:change="onSelectedTickChanged"
          />
        </div>

        <div class="col-sm-3">
          <div class="form-inline">
            <input type="text" class="form-control form-control-sm mr-2" v-model="selectedTick" style="width:55px" readonly />
            /
            <input type="text" class="form-control form-control-sm ml-2" v-model="maxTick" style="width:55px" readonly />
          </div>
        </div>

        <div class="col-sm-4">
          <div class="text-right">
            <button v-on:click.stop.prevent="resumeGame" v-bind:disabled="isBusy" class="btn btn-primary btn-sm mx-2">
              <font-awesome-icon icon="play" />
            </button>

            <button v-on:click.stop.prevent="pauseGame" v-bind:disabled="isBusy" class="btn btn-primary btn-sm mx-2">
              <font-awesome-icon icon="pause" />
            </button>

            <button v-on:click.stop.prevent="decreaseSpeed" v-bind:disabled="isBusy" class="btn btn-primary btn-sm mx-2">
              Speed -
            </button>

            <button v-on:click.stop.prevent="increaseSpeed" v-bind:disabled="isBusy" class="btn btn-primary btn-sm mx-2">
              Speed +
            </button>
          </div>
        </div>
      </div>

      <section class="jumbotron p-4" v-show="replayStarted">
        <pre id="debug" class="m-0"></pre>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as screenfull from 'screenfull';
import { IGameState } from '../../../types';
import { IReplayGameController, replayGame } from '../game/game';
import { SUDDEN_DEATH_COUNTDOWN } from '../../../constants';

export default Vue.extend({
  data() {
    return {
      replayStarted: false as boolean,
      states: [] as IGameState[],
      selectedTick: 0 as number,
      minTick: 0 as number,
      maxTick: 10 as number,
      tickDuration: 300 as number,
      busyCounter: 0 as number,
      isFullscreen: false as boolean,
      replayCtrl: null as IReplayGameController | null
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
  beforeDestroy(): void {
    if (this.replayCtrl) {
      this.replayCtrl.stopViewer();
      this.replayCtrl = null;
    }
  },
  methods: {
    async loadGamelogFile(): Promise<void> {
      const input = this.$refs.fileInput as HTMLInputElement;
      if (input && input.files && input.files.length && input.files[0].name.endsWith('.gamelog')) {
        const contents = await this.readFileAsTextAsync(input.files[0]);
        const states = this.parseStatesFromText(contents);

        this.states.length = 0;
        this.states.push(...states);

        this.replayCtrl = await replayGame(this.states, tick => {
          this.selectedTick = tick;
        });
        this.maxTick = this.states.length - 1;
        this.replayStarted = true;
      }
    },
    resumeGame(): void {
      if (this.replayCtrl) this.replayCtrl.resumeGame();
    },
    pauseGame(): void {
      if (this.replayCtrl) this.replayCtrl.pauseGame();
    },
    increaseSpeed(): void {
      if (this.replayCtrl) this.replayCtrl.increaseSpeed();
    },
    decreaseSpeed(): void {
      if (this.replayCtrl) this.replayCtrl.decreaseSpeed();
    },
    onSelectedTickChanged(): void {
      if (this.replayCtrl) this.replayCtrl.goToTick(this.selectedTick);
    },
    toggleFullscreen(): void {
      if (screenfull && screenfull.enabled) {
        screenfull.toggle();
      }
    },
    async readFileAsTextAsync(fileInfo: File): Promise<string> {
      return new Promise((resolve, reject) => {
        try {
          const reader = new FileReader();

          reader.onload = () => {
            if (reader.readyState === FileReader.DONE && typeof reader.result === 'string') {
              resolve(reader.result);
            }
          };

          reader.readAsText(fileInfo);
        } catch (err) {
          reject(err);
        }
      });
    },
    parseStatesFromText(text: string): IGameState[] {
      const lines = text.split(/\r?\n/);
      const states: IGameState[] = [];

      for (const line of lines) {
        if (line.length > 0) {
          const obj = JSON.parse(line);
          if (obj.state) states.push(obj.state);
        }
      }

      if (states.length === 0) throw new Error('Empty state file');

      if (states.length >= SUDDEN_DEATH_COUNTDOWN + 300) throw new Error('Gamelog file too big');

      return states;
    }
  }
});
</script>
