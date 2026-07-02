<script lang="ts">
import Router from "svelte-spa-router";
import CourseCreator from "./lib/CourseCreator.svelte";
import Game from "./lib/Game.svelte";
import Home from "./lib/Home.svelte";

const routes = {
	"/": Home,
	"/game/:id": Game,
	"/create": CourseCreator,
};
</script>

<Router {routes} />
