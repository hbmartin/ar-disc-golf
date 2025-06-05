<script lang="ts">
import Game from "./lib/Game.svelte";
import Home from "./lib/Home.svelte";

const routes = {
	"/": Home,
	"/game/:id": Game,
};
</script>

<Router {routes} />


