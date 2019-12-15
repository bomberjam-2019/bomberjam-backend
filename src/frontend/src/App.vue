<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
@font-face {
  font-family: 'Adventure';
  src: url('./assets/fonts/Adventure.eot');
  src: url('./assets/fonts/Adventure.eot?#iefix') format('embedded-opentype'), url('./assets/fonts/Adventure.woff2') format('woff2'),
    url('./assets/fonts/Adventure.woff') format('woff'), url('./assets/fonts/Adventure.ttf') format('truetype'),
    url('./assets/fonts/Adventure.svg#svgFontName') format('svg');
}

html,
body {
  height: 100%;
}

html {
  background: #000 url('./assets/home.jpg') no-repeat fixed right bottom;
  background-size: cover;
}

body {
  background-color: transparent;
}

/* prettier-ignore */
html, body, p, h1, h2, h3, h4, h5, h6, a, button,
table, tr, th, td,
a:hover, a:focus, a:active {
  color: #fff !important;
}

#app {
  min-height: 100%;
  height: 100%;
}

header.logo {
  max-width: 350px;
}

#pixi canvas {
  display: block;
  margin: 0 auto;
  border: 1px solid #111;
  border-radius: 0.3rem;
  width: 100%;
}

.fullscreen {
  width: 95%;
  height: 100%;
  position: absolute;
  top: 0;
  overflow: hidden;
  padding: 0 10px;
}

pre#debug {
  font-size: 70%;
}

.btn-adventure {
  font-family: Adventure, arial, serif;
  color: #fff;
  font-size: 2.5em;
}
</style>
