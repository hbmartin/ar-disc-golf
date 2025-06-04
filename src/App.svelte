<script lang="ts">
  import Router from 'svelte-spa-router'
  import Home from './lib/Home.svelte'
  import Game from './lib/Game.svelte'

  const routes = {
    '/': Home,
    '/game/:id': Game
  };
</script>

<Router {routes} />


