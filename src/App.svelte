<script lang="ts">
import Router from "svelte-spa-router";
import Game from "./lib/Game.svelte";
import Home from "./lib/Home.svelte";

const routes = {
	"/": Home,
	"/game/:id": Game,
};
</script>

<Router {routes} />
