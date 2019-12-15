<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-6 col-sm-5 col-md-4 offset-md-1 col-lg-3 offset-lg-2 col-xl-3 offset-xl-3">
        <header class="text-left text-sm-center my-4 logo">
          <router-link :to="{ name: 'home' }">
            <img class="img-fluid mx-3" src="../assets/logo.png" alt="BomberJam" />
          </router-link>
        </header>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({});
</script>
