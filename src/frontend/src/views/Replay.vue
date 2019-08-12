<template>
  <div class="replay">
    <div v-bind:class="{ container: !isFullscreen, fullscreen: isFullscreen }">
      <div v-bind:class="{ container: !isFullscreen }">
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
      </div>

      <div class="form-group">
        <label for="file">Example file input</label>
        <input type="file" id="file" ref="fileInput" class="form-control-file" v-on:change="loadGamelogFile" />
      </div>

      <div id="pixi" class="mx-auto"></div>

      <div class="container">
        <div class="text-center m-2">
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
      </div>
    </div>
    <div class="container">
      <section class="jumbotron p-4 m-2">
        <pre id="debug" class="m-0"></pre>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as screenfull from 'screenfull';
import { IGameState } from '../../../types';
import { replayGame } from '../game/game';

export default Vue.extend({
  data() {
    return {
      states: [] as IGameState[],
      busyCounter: 0 as number,
      isFullscreen: false as boolean
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
  async mounted(): Promise<void> {},
  beforeDestroy(): void {},
  methods: {
    async loadGamelogFile(): Promise<void> {
      const input = this.$refs.fileInput as HTMLInputElement;
      if (input && input.files && input.files.length && input.files[0].name.endsWith('.gamelog')) {
        const contents = await this.readFileAsTextAsync(input.files[0]);
        const states = this.parseStatesFromText(contents);

        this.states.length = 0;
        this.states.push(...states);

        await replayGame(this.states);
      }
    },
    resumeGame(): void {},
    pauseGame(): void {},
    increaseSpeed(): void {},
    decreaseSpeed(): void {},
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

      return states;
    }
  }
});
</script>
