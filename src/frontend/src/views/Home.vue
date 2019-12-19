<template>
  <div id="home">
    <div class="container-fluid">
      <bomberjam-logo />

      <div class="row">
        <div class="col-12 col-md-10 offset-md-1 col-lg-8 offset-lg-2 col-xl-6 offset-xl-3 mt-5">
          <p>
            <a href="#" v-on:click.stop.prevent="createNewGame" class="btn btn-link btn-adventure">
              New game
            </a>
          </p>

          <p>
            <router-link class="btn btn-link btn-adventure" :to="{ name: 'spectate' }">
              Spectate
            </router-link>
          </p>

          <p>
            <a href="#" v-on:click.stop.prevent="showGamelogFilePicker" class="btn btn-link btn-adventure">
              Load gamelog file
            </a>
          </p>

          <div class="d-none">
            <input type="file" class="custom-file-input" ref="fileInput" v-on:change="loadGamelogFile" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  data() {
    return {
      shufflePlayers: false as boolean
    };
  },
  mounted(): void {},
  beforeDestroy(): void {},
  methods: {
    async createNewGame(): Promise<void> {
      await this.$router.push({ name: 'game', params: { roomId: 'new' } });
    },
    showGamelogFilePicker() {
      const input = this.$refs.fileInput as HTMLInputElement;
      input.click();
    },
    async loadGamelogFile(): Promise<void> {
      const maxUploadSize = 2097152;
      const input = this.$refs.fileInput as HTMLInputElement;

      if (input.files && input.files.length && input.files[0].name.endsWith('.gamelog')) {
        const file = input.files[0];
        console.log(file);
        if (!file.size || file.size > maxUploadSize) {
          alert(`Invalid file or file size is too big. Maximum size supported: ${maxUploadSize} bytes`);
          return;
        }

        const gamelog = await this.readFileAsTextAsync(file);
        await this.$router.push({ name: 'replay', params: { gamelog: gamelog, filename: file.name } });
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
    }
  }
});
</script>
