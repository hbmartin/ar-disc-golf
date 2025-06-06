<script lang="ts">
import { push } from "svelte-spa-router";
import MapGame from "./MapGame.svelte";
import { getCurrentGameId } from "./utils.ts";

const { params }: { params: { id: string } } = $props();

const goHome = () => {
	push("/");
};

// Verify that the game ID matches what's stored in localStorage
let isValidGame = $state(false);

// Check validation on mount and when params change
$effect(() => {
	const storedGameId = getCurrentGameId();
	isValidGame = storedGameId === params.id;

	if (!isValidGame) {
		// Small delay to allow the component to render before redirecting
		setTimeout(() => {
			goHome();
		}, 100);
	}
});
</script>

{#if isValidGame}
  <MapGame onBack={goHome} gameId={params.id} />
{:else}
  <div class="invalid-game">
    <h2>Invalid Game Session</h2>
    <p>This game session is not valid. Please start a new game.</p>
    <button onclick={goHome}>Go Home</button>
  </div>
{/if}

<style>
  .invalid-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    text-align: center;
    padding: 20px;
  }

  .invalid-game h2 {
    color: #e53e3e;
    margin-bottom: 15px;
  }

  .invalid-game p {
    color: #4a5568;
    margin-bottom: 20px;
  }

  .invalid-game button {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    border: none;
    color: white;
    padding: 12px 24px;
    border-radius: 25px;
    cursor: pointer;
    font-size: 1em;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
  }

  .invalid-game button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
  }
</style>
