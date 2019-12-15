<template>
  <div id="replay">
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
              <h4 class="my-2 my-sm-3">
                <template v-if="replayStarted">
                  {{ filename }}
                </template>
                <template v-else>
                  Loading
                </template>
              </h4>
            </div>

            <div class="col-auto">
              <button type="button" v-on:click.stop.prevent="toggleFullscreen" class="btn btn-primary btn-sm my-2 my-sm-3">
                <template v-if="isFullscreen">
                  Exit Fullscreen
                  <font-awesome-icon icon="compress-arrows-alt" />
                </template>
                <template v-else>
                  Fullscreen
                  <font-awesome-icon icon="expand-arrows-alt" />
                </template>
              </button>
            </div>
          </div>

          <div id="pixi" class="mx-auto"></div>

          <div class="row align-items-center my-2 my-sm-3" v-show="replayStarted">
            <div class="col-8 col-sm-3 col-md-5">
              <input
                type="range"
                id="tick-range"
                class="custom-range align-middle mx-2"
                v-model="selectedStateIdx"
                v-bind:min="minStateIdx"
                v-bind:max="maxStateIdx"
                v-on:change="onSelectedTickChanged"
                v-on:mousedown="tickRangeMouseDown"
                v-on:mouseup="tickRangeMouseUp"
              />
            </div>

            <div class="col-4 col-sm-3 col-md-2">
              <div class="form-inline">
                <label for="tick-range" class="m-0">{{ selectedStateIdx }} / {{ maxStateIdx }}</label>
              </div>
            </div>

            <div class="col-12 col-sm-6 col-md-5">
              <div class="text-center text-sm-right mt-2 mt-sm-0">
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
            </div>
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
import { SUDDEN_DEATH_COUNTDOWN, IGameState } from '../../../types';
import { IReplayGameController, replayGame } from '../game/game';

export default Vue.extend({
  data() {
    return {
      replayStarted: false as boolean,
      filename: '' as string,
      roomId: '' as string,
      states: [] as IGameState[],
      selectedStateIdx: 0 as number,
      minStateIdx: 0 as number,
      maxStateIdx: 10 as number,
      tickDuration: 300 as number,
      busyCounter: 0 as number,
      isFullscreen: false as boolean,
      replayCtrl: null as IReplayGameController | null,
      stateJsonStr: '' as string,
      canChangeRangeValue: true as boolean,
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
  beforeDestroy(): void {
    if (this.replayCtrl) {
      this.replayCtrl.stopViewer();
      this.replayCtrl = null;
    }
  },
  async mounted(): Promise<void> {
    const gamelog = this.$route.params.gamelog;
    const filename = this.$route.params.filename;

    if (typeof filename === 'string' && filename.length > 0 && typeof gamelog === 'string' && gamelog.length > 0) {
      this.filename = filename;
      const states = this.parseStatesFromText(gamelog);
      await this.loadGamelogFile(states);
    } else {
      await this.$router.push({ name: 'home' });
    }
  },
  methods: {
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
    },
    async loadGamelogFile(states: IGameState[]): Promise<void> {
      this.states.length = 0;
      this.states.push(...states);

      this.replayCtrl = await replayGame(this.states, (stateIdx, newState) => {
        if (this.canChangeRangeValue) {
          this.selectedStateIdx = stateIdx;
        }

        this.stateJsonStr = JSON.stringify(newState, null, 2);
      });

      this.roomId = states[0].roomId;
      this.minStateIdx = 0;
      this.maxStateIdx = this.states.length - 1;
      this.replayStarted = true;
      this.isPlaying = true;
    },
    pauseOrResumeGame(): void {
      if (this.isPlaying) {
        this.pauseGame();
      } else {
        this.resumeGame();
      }
    },
    resumeGame(): void {
      if (this.replayCtrl) {
        this.replayCtrl.resumeGame();
        this.isPlaying = true;
      }
    },
    pauseGame(): void {
      if (this.replayCtrl) {
        this.replayCtrl.pauseGame();
        this.isPlaying = false;
      }
    },
    increaseSpeed(): void {
      if (this.replayCtrl) this.replayCtrl.increaseSpeed();
    },
    decreaseSpeed(): void {
      if (this.replayCtrl) this.replayCtrl.decreaseSpeed();
    },
    onSelectedTickChanged(): void {
      if (this.replayCtrl) this.replayCtrl.goToStateIdx(this.selectedStateIdx);
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
    tickRangeMouseDown(): void {
      this.canChangeRangeValue = false;
    },
    tickRangeMouseUp(): void {
      this.canChangeRangeValue = true;
    }
  }
});
</script>
