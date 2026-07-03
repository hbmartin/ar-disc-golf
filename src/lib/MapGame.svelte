<script module>
import "@ar-js-org/ar.js";

// Register A-Frame components before scene initialization
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
		const material = new THREE.MeshStandardMaterial({ color: this.data.color });
		const group = new THREE.Group();

		const shaft = new THREE.Mesh(
			new THREE.CylinderGeometry(0.04, 0.04, 1.2, 12),
			material,
		);
		shaft.rotation.x = Math.PI / 2;
		shaft.position.z = -0.6;
		group.add(shaft);

		const head = new THREE.Mesh(
			new THREE.ConeGeometry(0.14, 0.4, 16),
			material,
		);
		head.rotation.x = -Math.PI / 2;
		head.position.z = -1.4;
		group.add(head);

		this.el.setObject3D("mesh", group);
	},
});
</script>

<script lang="ts">
import maplibregl from "maplibre-gl";
import { onDestroy, onMount } from "svelte";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { type ARMode, detectARMode } from "./ar.ts";
import {
	bearingDegrees,
	circleRing,
	distanceMeters,
	formatDistance,
	isWithinRadius,
	relativeBearing,
} from "./geo.ts";
import {
	completeHole,
	formatScoreVsPar,
	recordThrow,
	totalPar,
	totalStrokes,
	undoThrow,
} from "./gameState.ts";
import {
	compassHeading,
	needsOrientationPermission,
	nextUprightState,
	requestOrientationPermission,
} from "./orientation.ts";
import Scorecard from "./Scorecard.svelte";
import type { GameSession, LatLng } from "./types.ts";
import { acquireWakeLock } from "./wakeLock.ts";

/** Arriving within this many meters of the basket counts as reaching it. */
const BASKET_ARRIVAL_RADIUS_M = 10;
const DISTANCE_RING_RADII_M = [10, 25, 50];

const {
	onBack,
	session: initialSession,
}: {
	onBack: () => void;
	session: GameSession;
} = $props();

const getInitialSession = () => initialSession;
let session = $state(getInitialSession());

let mapContainer: HTMLDivElement;
let arrowAnchor: HTMLElement | null = $state(null);
let arSceneEl: HTMLElement | null = $state(null);
let map: maplibregl.Map | null = null;
let userMarker: maplibregl.Marker | null = null;
let holeMarkers: maplibregl.Marker[] = [];
let watchId: number | null = null;
let releaseWakeLock: (() => void) | null = null;
let orientationEnabled = false;
const cleanup = new AbortController();

let position: LatLng | null = $state(null);
let accuracy: number | null = $state(null);
let orientationHeading: number | null = $state(null);
let gpsHeading: number | null = $state(null);
let isDeviceUpright = $state(false);
let arMode: ARMode | null = $state(null);
let cameraLoading = $state(true);
let cameraError = $state(false);
let locationError: string | null = $state(null);
let demoMode = $state(false);
let isLoading = $state(true);
let mapReady = $state(false);
let mapIssue: string | null = $state(null);
let showScorecard = $state(false);

const currentHole = $derived(session.course.holes[session.currentHoleIndex]);
const roundComplete = $derived(session.completedAt !== null);
const currentStrokes = $derived(session.strokes[session.currentHoleIndex]);
const showAR = $derived(isDeviceUpright && !roundComplete && !showScorecard);
const heading = $derived(orientationHeading ?? gpsHeading);
const distanceToBasket = $derived(
	position ? distanceMeters(position, currentHole.basket) : null,
);
const nearBasket = $derived(
	position !== null &&
		!roundComplete &&
		isWithinRadius(position, currentHole.basket, BASKET_ARRIVAL_RADIUS_M),
);
const arrowRotation = $derived(
	position && heading !== null
		? relativeBearing(bearingDegrees(position, currentHole.basket), heading)
		: null,
);

// ---------------------------------------------------------------- map layers

const holeLinesGeoJson = (): FeatureCollection => ({
	type: "FeatureCollection",
	features: session.course.holes.map((hole, i) => ({
		type: "Feature",
		properties: { current: i === session.currentHoleIndex },
		geometry: {
			type: "LineString",
			coordinates: [
				[hole.tee.lng, hole.tee.lat],
				[hole.basket.lng, hole.basket.lat],
			],
		},
	})),
});

const distanceRingsGeoJson = (): FeatureCollection => ({
	type: "FeatureCollection",
	features: DISTANCE_RING_RADII_M.map((radius) => ({
		type: "Feature",
		properties: { radius },
		geometry: {
			type: "LineString",
			coordinates: circleRing(currentHole.basket, radius),
		},
	})),
});

const accuracyGeoJson = (): FeatureCollection => ({
	type: "FeatureCollection",
	features:
		position !== null && accuracy !== null
			? [
					{
						type: "Feature",
						properties: {},
						geometry: {
							type: "Polygon",
							coordinates: [circleRing(position, accuracy)],
						},
					},
				]
			: [],
});

const setSourceData = (id: string, data: FeatureCollection) => {
	const source = map?.getSource(id) as maplibregl.GeoJSONSource | undefined;
	source?.setData(data);
};

const buildHoleMarkers = () => {
	for (const marker of holeMarkers) {
		marker.remove();
	}
	holeMarkers = [];
	if (!map) return;

	session.course.holes.forEach((hole, i) => {
		const isCurrent = i === session.currentHoleIndex;

		const teeEl = document.createElement("div");
		teeEl.className = `hole-marker tee-marker${isCurrent ? " current" : ""}`;
		teeEl.textContent = String(hole.number);
		teeEl.title = `Hole ${hole.number} tee`;
		holeMarkers.push(
			new maplibregl.Marker({ element: teeEl })
				.setLngLat([hole.tee.lng, hole.tee.lat])
				.addTo(map as maplibregl.Map),
		);

		const basketEl = document.createElement("div");
		basketEl.className = `hole-marker basket-marker${isCurrent ? " current" : ""}`;
		basketEl.textContent = "🎯";
		basketEl.title = `Hole ${hole.number} basket`;
		holeMarkers.push(
			new maplibregl.Marker({ element: basketEl })
				.setLngLat([hole.basket.lng, hole.basket.lat])
				.addTo(map as maplibregl.Map),
		);
	});
};

const initializeMap = (center: LatLng) => {
	if (!mapContainer || map) return;

	map = new maplibregl.Map({
		container: mapContainer,
		style: "https://tiles.openfreemap.org/styles/liberty",
		center: [center.lng, center.lat],
		zoom: 16,
	});

	map.on("load", () => {
		isLoading = false;
		if (!map) return;

		map.addSource("hole-lines", { type: "geojson", data: holeLinesGeoJson() });
		map.addLayer({
			id: "hole-lines",
			type: "line",
			source: "hole-lines",
			paint: {
				"line-color": [
					"case",
					["get", "current"],
					"#e53e3e",
					"rgba(102, 126, 234, 0.5)",
				],
				"line-width": ["case", ["get", "current"], 4, 2],
				"line-dasharray": [2, 2],
			},
		});

		map.addSource("distance-rings", {
			type: "geojson",
			data: distanceRingsGeoJson(),
		});
		map.addLayer({
			id: "distance-rings",
			type: "line",
			source: "distance-rings",
			paint: {
				"line-color": "rgba(229, 62, 62, 0.6)",
				"line-width": 1.5,
				"line-dasharray": [1, 2],
			},
		});

		map.addSource("accuracy", { type: "geojson", data: accuracyGeoJson() });
		map.addLayer({
			id: "accuracy",
			type: "fill",
			source: "accuracy",
			paint: {
				"fill-color": "rgba(79, 172, 254, 0.15)",
				"fill-outline-color": "rgba(79, 172, 254, 0.5)",
			},
		});

		userMarker = new maplibregl.Marker({ color: "#4facfe", scale: 1.2 })
			.setLngLat([center.lng, center.lat])
			.addTo(map);

		map.addControl(
			new maplibregl.GeolocateControl({
				positionOptions: { enableHighAccuracy: true },
				trackUserLocation: true,
			}),
			"top-right",
		);

		buildHoleMarkers();
		fitToCurrentHole();
		mapReady = true;
	});

	// Tile/style failures shouldn't block the game — the GPS logic and AR view
	// keep working, so surface a dismissible banner instead of an overlay.
	map.on("error", (e) => {
		console.error("Map error:", e);
		isLoading = false;
		mapIssue =
			"Some map data failed to load. Check your connection — your round is unaffected.";
	});

	map.on("click", (e) => {
		enableOrientation();
		if (demoMode) {
			updateUserPosition({ lat: e.lngLat.lat, lng: e.lngLat.lng }, 5);
		}
	});
};

const fitToCurrentHole = () => {
	if (!map) return;
	const bounds = new maplibregl.LngLatBounds();
	bounds.extend([currentHole.tee.lng, currentHole.tee.lat]);
	bounds.extend([currentHole.basket.lng, currentHole.basket.lat]);
	if (position) {
		bounds.extend([position.lng, position.lat]);
	}
	map.fitBounds(bounds, { padding: 80, maxZoom: 18, duration: 800 });
};

// ------------------------------------------------------------- geolocation

const updateUserPosition = (point: LatLng, positionAccuracy?: number) => {
	position = point;
	if (positionAccuracy !== undefined) {
		accuracy = positionAccuracy;
	}
	userMarker?.setLngLat([point.lng, point.lat]);
	setSourceData("accuracy", accuracyGeoJson());
};

const getLocationErrorMessage = (error: GeolocationPositionError): string => {
	switch (error.code) {
		case error.PERMISSION_DENIED:
			return "Location access denied. Enable location permissions, or continue in demo mode.";
		case error.POSITION_UNAVAILABLE:
			return "Location is unavailable. Check your device's location settings, or continue in demo mode.";
		case error.TIMEOUT:
			return "Location request timed out. Try again, or continue in demo mode.";
		default:
			return "An unknown error occurred while retrieving location.";
	}
};

const clearLocationWatch = () => {
	if (watchId !== null) {
		navigator.geolocation.clearWatch(watchId);
		watchId = null;
	}
};

const startLocationTracking = () => {
	if (!navigator.geolocation) {
		locationError =
			"Geolocation is not supported by this browser. You can still explore in demo mode.";
		isLoading = false;
		return;
	}

	const options: PositionOptions = {
		enableHighAccuracy: true,
		timeout: 10000,
		maximumAge: 0,
	};

	clearLocationWatch();

	navigator.geolocation.getCurrentPosition(
		(pos) => {
			const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
			locationError = null;
			initializeMap(point);
			updateUserPosition(point, pos.coords.accuracy);
		},
		(error) => {
			console.error("Geolocation error:", error);
			locationError = getLocationErrorMessage(error);
			isLoading = false;
		},
		options,
	);

	watchId = navigator.geolocation.watchPosition(
		(pos) => {
			if (demoMode) return;
			const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
			if (!map) {
				locationError = null;
				initializeMap(point);
			}
			updateUserPosition(point, pos.coords.accuracy);
			if (pos.coords.heading !== null && !Number.isNaN(pos.coords.heading)) {
				gpsHeading = pos.coords.heading;
			}
		},
		(error) => {
			// Transient watch errors are logged but don't interrupt play
			console.error("Position watch error:", error);
		},
		options,
	);
};

const retryLocation = () => {
	locationError = null;
	isLoading = true;
	startLocationTracking();
};

/** Explicit demo mode: start at the current tee and move by tapping the map. */
const enterDemoMode = () => {
	demoMode = true;
	locationError = null;
	isLoading = false;
	initializeMap(currentHole.tee);
	updateUserPosition(currentHole.tee, 5);
};

// ------------------------------------------------------------- orientation

const onOrientation = (event: DeviceOrientationEvent) => {
	isDeviceUpright = nextUprightState(event.beta, isDeviceUpright);
	const h = compassHeading(event);
	if (h !== null) {
		orientationHeading = h;
	}
};

const enableOrientation = async () => {
	if (orientationEnabled) return;
	const granted = await requestOrientationPermission();
	if (!granted) return;
	orientationEnabled = true;
	window.addEventListener("deviceorientation", onOrientation, {
		signal: cleanup.signal,
	});
	// Chrome on Android delivers compass data on the "absolute" variant
	window.addEventListener(
		"deviceorientationabsolute",
		onOrientation as EventListener,
		{ signal: cleanup.signal },
	);
};

// -------------------------------------------------------------------- game

const throwDisc = () => {
	enableOrientation();
	session = recordThrow(session);
};

const undoLastThrow = () => {
	session = undoThrow(session);
};

const finishHole = () => {
	session = completeHole(session);
	if (!session.completedAt) {
		fitToCurrentHole();
	}
};

const enterAR = () => {
	interface ARCapableScene extends HTMLElement {
		enterAR?: () => void;
	}
	(arSceneEl as ARCapableScene | null)?.enterAR?.();
};

// ----------------------------------------------------------------- effects

// AR.js appends its <video> to <body>; drive its visibility from game state
$effect(() => {
	document.body.classList.toggle("ar-video-visible", showAR);
});

// Aim the AR arrow at the basket as heading/position change
$effect(() => {
	if (arrowAnchor && arrowRotation !== null) {
		arrowAnchor.setAttribute("rotation", `0 ${-arrowRotation} 0`);
	}
});

// Refresh hole overlays when the current hole changes
$effect(() => {
	if (!mapReady) return;
	setSourceData("hole-lines", holeLinesGeoJson());
	setSourceData("distance-rings", distanceRingsGeoJson());
	buildHoleMarkers();
});

// The AR.js camera can fail to emit load events; stop showing the spinner
// after a grace period whenever the AR view becomes active.
$effect(() => {
	if (!(showAR && arMode === "arjs" && cameraLoading)) return;
	const timer = setTimeout(() => {
		cameraLoading = false;
	}, 3000);
	return () => clearTimeout(timer);
});

onMount(() => {
	startLocationTracking();
	detectARMode().then((mode) => {
		arMode = mode;
	});
	acquireWakeLock().then((release) => {
		releaseWakeLock = release;
	});

	// Platforms without an explicit permission prompt can listen immediately
	if (!needsOrientationPermission()) {
		enableOrientation();
	}

	window.addEventListener(
		"ar-camera-loaded",
		() => {
			cameraLoading = false;
			cameraError = false;
		},
		{ signal: cleanup.signal },
	);
	window.addEventListener(
		"ar-camera-error",
		() => {
			cameraLoading = false;
			cameraError = true;
		},
		{ signal: cleanup.signal },
	);

	document.body.style.overflow = "hidden";
});

onDestroy(() => {
	cleanup.abort();
	clearLocationWatch();
	map?.remove();
	releaseWakeLock?.();
	document.getElementById("arjs-video")?.remove();
	document.body.classList.remove("ar-video-visible");
	document.body.style.overflow = "";
});
</script>

<div class="map-game">
	<header class="map-header">
		<button class="back-btn" onclick={onBack}> ← Back </button>
		<div class="header-center">
			<h1>Hole {currentHole.number}/{session.course.holes.length}</h1>
			<span class="score-chip">
				{formatScoreVsPar(totalStrokes(session), totalPar(session.course))}
			</span>
		</div>
		<div class="status">
			{#if demoMode}
				<span class="demo-indicator">Demo</span>
			{:else if position}
				<span class="location-indicator">📍 Live</span>
			{/if}
		</div>
	</header>

	{#if mapIssue}
		<div class="map-issue" role="status">
			<span>{mapIssue}</span>
			<button class="dismiss-btn" onclick={() => (mapIssue = null)}>✕</button>
		</div>
	{/if}

	<div class="map-container" class:ar-active={showAR}>
		{#if isLoading}
			<div class="loading-overlay">
				<div class="spinner"></div>
				<p>Loading map and getting your location...</p>
			</div>
		{/if}

		<div class="camera-view">
			{#if cameraError && arMode === "arjs"}
				<div class="camera-error">
					<div class="error-icon">📷</div>
					<p>Camera access denied or unavailable</p>
				</div>
			{/if}
			{#if arMode === "webxr"}
				<div class="webxr-prompt">
					<p>WebXR is supported on this device</p>
					<button class="primary-btn" onclick={enterAR}>Enter AR</button>
				</div>
			{/if}
			{#if arMode !== null}
				<a-scene
					bind:this={arSceneEl}
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
			<div class="ar-hud">
				{#if distanceToBasket !== null}
					<div class="ar-distance">
						🎯 {formatDistance(distanceToBasket)}
						{#if arrowRotation === null}
							<span class="ar-hint">— move or enable compass to aim arrow</span>
						{/if}
					</div>
				{:else}
					<div class="ar-distance">Waiting for GPS…</div>
				{/if}
			</div>
		</div>

		{#if locationError}
			<div class="error-overlay">
				<div class="error-content">
					<div class="error-icon">⚠️</div>
					<h3>Location Error</h3>
					<p>{locationError}</p>
					<div class="error-actions">
						<button onclick={retryLocation} class="retry-btn">Try Again</button>
						<button onclick={enterDemoMode} class="demo-btn">
							Continue in demo mode
						</button>
					</div>
				</div>
			</div>
		{/if}

		<div bind:this={mapContainer} class="map"></div>

		{#if nearBasket}
			<div class="arrival-banner" role="status">
				🎯 You've reached the basket — finish the hole once you've holed out.
			</div>
		{/if}

		{#if demoMode && mapReady}
			<div class="demo-banner" role="status">
				Demo mode: tap the map to move around the course.
			</div>
		{/if}
	</div>

	{#if !roundComplete}
		<div class="hud">
			<div class="hud-info">
				<span class="hud-hole">Par {currentHole.par}</span>
				<span class="hud-distance">
					{distanceToBasket !== null
						? `${formatDistance(distanceToBasket)} to basket`
						: "No GPS fix"}
				</span>
				<span class="hud-strokes">
					{currentStrokes} throw{currentStrokes === 1 ? "" : "s"}
				</span>
			</div>
			<div class="hud-actions">
				<button
					class="undo-btn"
					onclick={undoLastThrow}
					disabled={currentStrokes === 0}
				>
					Undo
				</button>
				<button class="throw-btn" onclick={throwDisc}>🥏 Throw</button>
				<button
					class="finish-btn"
					class:highlight={nearBasket}
					onclick={finishHole}
					disabled={currentStrokes === 0}
				>
					{session.currentHoleIndex === session.course.holes.length - 1
						? "Finish round ✔"
						: "Finish hole ✔"}
				</button>
				<button
					class="scorecard-btn"
					onclick={() => (showScorecard = !showScorecard)}
				>
					📋
				</button>
			</div>
		</div>
	{/if}

	{#if showScorecard && !roundComplete}
		<div class="scorecard-overlay">
			<div class="scorecard-panel">
				<div class="scorecard-header">
					<h2>Scorecard</h2>
					<button
						class="dismiss-btn dark"
						onclick={() => (showScorecard = false)}
					>
						✕
					</button>
				</div>
				<Scorecard {session} />
			</div>
		</div>
	{/if}

	{#if roundComplete}
		<div class="scorecard-overlay">
			<div class="scorecard-panel">
				<h2>🏁 Round complete!</h2>
				<p class="final-score">
					{totalStrokes(session)} throws ·
					{formatScoreVsPar(totalStrokes(session), totalPar(session.course))}
					vs par on {session.course.name}
				</p>
				<Scorecard {session} />
				<button class="primary-btn done-btn" onclick={onBack}
					>Back to Home</button
				>
			</div>
		</div>
	{/if}
</div>

<style>
.map-game {
	height: 100vh;
	width: 100vw;
	display: flex;
	flex-direction: column;
	background: transparent;
}

.map-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 20px;
	padding-top: max(12px, env(safe-area-inset-top));
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	z-index: 1000;
}

.header-center {
	display: flex;
	align-items: center;
	gap: 10px;
}

.back-btn {
	background: rgba(255, 255, 255, 0.2);
	border: 2px solid rgba(255, 255, 255, 0.3);
	color: white;
	padding: 8px 16px;
	border-radius: 20px;
	cursor: pointer;
	font-size: 0.9em;
	font-weight: 600;
	transition: all 0.3s ease;
}

.back-btn:hover {
	background: rgba(255, 255, 255, 0.3);
	border-color: rgba(255, 255, 255, 0.5);
}

.map-header h1 {
	margin: 0;
	font-size: 1.3em;
	font-weight: 700;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.score-chip {
	background: rgba(255, 255, 255, 0.25);
	padding: 4px 10px;
	border-radius: 12px;
	font-weight: 700;
	font-size: 0.9em;
}

.status {
	display: flex;
	align-items: center;
}

.location-indicator {
	background: rgba(76, 175, 80, 0.9);
	padding: 4px 12px;
	border-radius: 15px;
	font-size: 0.8em;
	font-weight: 600;
	animation: pulse 2s infinite;
}

.demo-indicator {
	background: rgba(237, 137, 54, 0.95);
	padding: 4px 12px;
	border-radius: 15px;
	font-size: 0.8em;
	font-weight: 600;
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.7;
	}
}

.map-issue {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	background: #fefcbf;
	color: #744210;
	padding: 8px 16px;
	font-size: 0.9em;
	z-index: 1000;
}

.dismiss-btn {
	background: transparent;
	border: none;
	color: inherit;
	cursor: pointer;
	font-size: 1em;
	padding: 4px 8px;
}

.map-container {
	flex: 1;
	position: relative;
	overflow: hidden;
}

.map {
	width: 100%;
	height: 100%;
}

.camera-view {
	position: absolute;
	inset: 0;
	background: transparent;
	z-index: 900;
	display: none;
}

.map-container.ar-active .camera-view {
	display: block;
}

.map-container.ar-active .map {
	visibility: hidden;
}

.ar-hud {
	position: absolute;
	top: 15px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 950;
}

.ar-distance {
	background: rgba(0, 0, 0, 0.7);
	color: white;
	padding: 10px 18px;
	border-radius: 20px;
	font-size: 1.1em;
	font-weight: 700;
	white-space: nowrap;
}

.ar-hint {
	font-weight: 400;
	font-size: 0.75em;
	opacity: 0.8;
}

.webxr-prompt {
	position: absolute;
	bottom: 30px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 950;
	background: rgba(0, 0, 0, 0.7);
	color: white;
	padding: 12px 18px;
	border-radius: 12px;
	text-align: center;
}

.webxr-prompt p {
	margin: 0 0 8px 0;
	font-size: 0.85em;
}

.loading-overlay,
.camera-error {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background: rgba(0, 0, 0, 0.8);
	color: white;
	padding: 20px;
	border-radius: 12px;
	text-align: center;
	z-index: 2000;
}

.spinner {
	width: 50px;
	height: 50px;
	border: 4px solid #e2e8f0;
	border-top: 4px solid #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin: 0 auto 20px;
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.error-overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.4);
	z-index: 2000;
}

.error-content {
	text-align: center;
	background: white;
	padding: 40px;
	border-radius: 16px;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
	max-width: 400px;
	margin: 20px;
}

.error-icon {
	font-size: 48px;
	margin-bottom: 15px;
}

.error-content h3 {
	margin: 0 0 15px 0;
	color: #e53e3e;
	font-size: 1.5em;
}

.error-content p {
	margin: 0 0 20px 0;
	color: #4a5568;
	line-height: 1.5;
}

.error-actions {
	display: flex;
	flex-direction: column;
	gap: 10px;
	align-items: center;
}

.retry-btn,
.primary-btn {
	background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
	border: none;
	color: white;
	padding: 12px 24px;
	border-radius: 25px;
	cursor: pointer;
	font-size: 1em;
	font-weight: 600;
	box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
}

.demo-btn {
	background: transparent;
	border: 2px solid #ed8936;
	color: #ed8936;
	padding: 10px 22px;
	border-radius: 25px;
	cursor: pointer;
	font-size: 0.95em;
	font-weight: 600;
}

.arrival-banner,
.demo-banner {
	position: absolute;
	bottom: 15px;
	left: 50%;
	transform: translateX(-50%);
	background: rgba(56, 161, 105, 0.95);
	color: white;
	padding: 10px 18px;
	border-radius: 20px;
	font-weight: 600;
	font-size: 0.9em;
	z-index: 950;
	white-space: nowrap;
	max-width: 90%;
}

.demo-banner {
	background: rgba(237, 137, 54, 0.95);
}

.hud {
	background: white;
	border-top: 1px solid #e2e8f0;
	padding: 10px 15px;
	padding-bottom: max(10px, env(safe-area-inset-bottom));
	z-index: 1100;
}

.hud-info {
	display: flex;
	justify-content: space-between;
	color: #4a5568;
	font-size: 0.85em;
	font-weight: 600;
	margin-bottom: 8px;
}

.hud-actions {
	display: flex;
	gap: 8px;
	align-items: stretch;
}

.throw-btn {
	flex: 2;
	background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
	border: none;
	color: white;
	padding: 14px;
	border-radius: 14px;
	font-size: 1.1em;
	font-weight: 700;
	cursor: pointer;
	box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
}

.finish-btn {
	flex: 2;
	background: white;
	border: 2px solid #38a169;
	color: #38a169;
	padding: 14px;
	border-radius: 14px;
	font-size: 0.95em;
	font-weight: 700;
	cursor: pointer;
}

.finish-btn.highlight {
	background: #38a169;
	color: white;
	animation: pulse 1.5s infinite;
}

.finish-btn:disabled,
.undo-btn:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.undo-btn,
.scorecard-btn {
	flex: 1;
	background: #edf2f7;
	border: none;
	color: #4a5568;
	border-radius: 14px;
	font-weight: 600;
	cursor: pointer;
	padding: 14px 6px;
}

.scorecard-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 3000;
	padding: 20px;
}

.scorecard-panel {
	background: white;
	border-radius: 16px;
	padding: 25px;
	max-width: 500px;
	width: 100%;
	max-height: 85vh;
	overflow-y: auto;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.scorecard-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.scorecard-panel h2 {
	margin: 0 0 15px 0;
	color: #2d3748;
}

.dismiss-btn.dark {
	color: #4a5568;
	font-size: 1.2em;
}

.final-score {
	color: #4a5568;
	margin: 0 0 15px 0;
}

.done-btn {
	margin-top: 20px;
	width: 100%;
}

/* Tee/basket markers are plain DOM elements handed to maplibre */
:global(.hole-marker) {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	font-weight: 700;
	cursor: default;
}

:global(.tee-marker) {
	width: 26px;
	height: 26px;
	background: #667eea;
	color: white;
	border: 2px solid white;
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
	opacity: 0.7;
}

:global(.basket-marker) {
	font-size: 20px;
	opacity: 0.6;
}

:global(.hole-marker.current) {
	opacity: 1;
	transform: scale(1.2);
}

:global(.tee-marker.current) {
	background: #e53e3e;
}

/* Ensure map controls are accessible on mobile */
:global(.maplibregl-ctrl-group button) {
	min-width: 44px !important;
	min-height: 44px !important;
}
</style>
