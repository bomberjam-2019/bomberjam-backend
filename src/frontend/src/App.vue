<template>
  <div id="app">
    <header>
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
          <span class="navbar-brand">
            Bomberjam
          </span>

          <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarToggler">
            <span class="navbar-toggler-icon"></span>
          </button>

          <div class="collapse navbar-collapse" id="navbarToggler">
            <ul class="navbar-nav mr-auto mt-2 mt-lg-0">
              <li class="nav-item">
                <router-link class="nav-link" :to="{ name: 'admin' }">
                  Administration
                </router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" :to="{ name: 'replay' }">
                  Replay
                </router-link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>

    <router-view />
  </div>
</template>
