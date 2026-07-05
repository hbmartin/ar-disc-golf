<script module lang="ts">
const registryKey = "discGolfAFrameComponentsRegistered";
const registry = globalThis as typeof globalThis &
	Record<string, boolean | undefined>;

const registerAFrameComponents = () => {
	if (registry[registryKey]) {
		return;
	}

	registry[registryKey] = true;

	// Register A-Frame components before scene initialization.
	AFRAME.registerComponent("scene-listener", {
		init: function () {
			this.el.addEventListener("loaded", () => {
				window.dispatchEvent(new CustomEvent("ar-camera-loaded"));
			});

			this.el.addEventListener("error", (event) => {
				console.error("AR camera loading error:", event);
				window.dispatchEvent(new CustomEvent("ar-camera-error"));
			});
		},
	});

	// A straight 3D arrow lying flat, pointing toward -Z (A-Frame "forward").
	// Its parent entity is rotated at runtime to aim at the basket.
	AFRAME.registerComponent("direction-arrow", {
		schema: {
			color: { type: "color", default: "#ff3b30" },
		},
		init: function () {
			const material = new THREE.MeshStandardMaterial({
				color: this.data.color,
			});
			const group = new THREE.Group();
			const shaftGeometry = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 12);
			const headGeometry = new THREE.ConeGeometry(0.14, 0.4, 16);

			const shaft = new THREE.Mesh(shaftGeometry, material);
			shaft.rotation.x = Math.PI / 2;
			shaft.position.z = -0.6;
			group.add(shaft);

			const head = new THREE.Mesh(headGeometry, material);
			head.rotation.x = -Math.PI / 2;
			head.position.z = -1.4;
			group.add(head);

			this.geometries = [shaftGeometry, headGeometry];
			this.material = material;
			this.el.setObject3D("mesh", group);
		},
		remove: function () {
			for (const geometry of this.geometries ?? []) {
				geometry.dispose();
			}
			this.material?.dispose();
			this.el.removeObject3D("mesh");
			this.geometries = undefined;
			this.material = undefined;
		},
	});
};
</script>

<script lang="ts">
import { onMount } from "svelte";
import type { ARMode } from "./ar.ts";
import { disarmArJsCameraWatch, stopArJsCamera } from "./arCamera.ts";

const {
	arMode,
	onArrowAnchor,
	onScene,
}: {
	arMode: ARMode;
	onArrowAnchor: (element: HTMLElement | null) => void;
	onScene: (element: HTMLElement | null) => void;
} = $props();

let arrowAnchor: HTMLElement | null = $state(null);
let aframeReady = $state(false);
let sceneEl: HTMLElement | null = $state(null);

onMount(() => {
	let cancelled = false;

	// A watch armed by a previous teardown must not kill this scene's stream.
	disarmArJsCameraWatch();

	import("@ar-js-org/ar.js")
		.then(() => {
			registerAFrameComponents();
			if (!cancelled) {
				aframeReady = true;
			}
		})
		.catch((error) => {
			console.error("Failed to load AR renderer:", error);
			window.dispatchEvent(new CustomEvent("ar-camera-error"));
		});

	return () => {
		cancelled = true;
		stopArJsCamera();
	};
});

$effect(() => {
	onArrowAnchor(arrowAnchor);
	return () => onArrowAnchor(null);
});

$effect(() => {
	onScene(sceneEl);
	return () => onScene(null);
});
</script>

{#if aframeReady}
	<a-scene
		bind:this={sceneEl}
		vr-mode-ui="enabled: false"
		arjs={arMode === "arjs"
			? "sourceType: webcam; facingMode: environment; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
			: undefined}
		webxr={arMode === "webxr"
			? "optionalFeatures: local-floor, hit-test"
			: undefined}
		renderer="logarithmicDepthBuffer: true;"
		embedded
		loading-screen="enabled: false"
		scene-listener
	>
		<a-entity bind:this={arrowAnchor} position="0 -0.4 -1.5">
			<a-entity direction-arrow></a-entity>
		</a-entity>
		<a-entity camera="active: true; fov: 80"></a-entity>
	</a-scene>
{/if}
