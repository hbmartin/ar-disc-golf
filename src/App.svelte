<script lang="ts">
import Router from "svelte-spa-router";
import wrap from "svelte-spa-router/wrap";

type AsyncRouteComponent = NonNullable<
	Parameters<typeof wrap>[0]["asyncComponent"]
>;

const asyncRoute = (loader: () => Promise<unknown>) =>
	loader as AsyncRouteComponent;

const routes = {
	"/": wrap({ asyncComponent: asyncRoute(() => import("./lib/Home.svelte")) }),
	"/game/:id": wrap({
		asyncComponent: asyncRoute(() => import("./lib/Game.svelte")),
	}),
	"/create": wrap({
		asyncComponent: asyncRoute(() => import("./lib/CourseCreator.svelte")),
	}),
};
</script>

<Router {routes} />
