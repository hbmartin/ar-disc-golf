<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { push } from "svelte-spa-router";
import { encodeCourseShare, saveCustomCourse } from "./courses.ts";
import { distanceMeters, formatDistance } from "./geo.ts";
import {
	getMapLibre,
	loadMapLibre,
	type MapLibreMap,
	type MapLibreMarker,
	type MapLibreModule,
} from "./mapLibre.ts";
import type { Course, Hole, LatLng } from "./types.ts";
import { generateId } from "./utils.ts";

let mapContainer: HTMLDivElement;
let map: MapLibreMap | null = null;
let markers: MapLibreMarker[] = [];
let watchId: number | null = null;

let courseName = $state("");
let holes: Hole[] = $state([]);
let pendingTee: LatLng | null = $state(null);
let placementMode: "tee" | "basket" = $state("tee");
let position: LatLng | null = $state(null);
let statusMessage: string | null = $state(null);
let shareCode: string | null = $state(null);
let mapReady = $state(false);

const canSave = $derived(holes.length > 0 && courseName.trim().length > 0);

const invalidateShareCode = (showStatus = true) => {
	if (shareCode && showStatus) {
		statusMessage = "Course changed. Save again to refresh the share code.";
	}
	shareCode = null;
};

const setCourseName = (name: string) => {
	courseName = name;
	invalidateShareCode();
};

const placePoint = (point: LatLng) => {
	invalidateShareCode(false);
	if (placementMode === "tee") {
		pendingTee = point;
		placementMode = "basket";
		statusMessage = `Tee ${holes.length + 1} set — now place its basket.`;
	} else {
		if (!pendingTee) return;
		holes = [
			...holes,
			{ number: holes.length + 1, par: 3, tee: pendingTee, basket: point },
		];
		pendingTee = null;
		placementMode = "tee";
		statusMessage = `Hole ${holes.length} added.`;
	}
	refreshMarkers();
};

const placeAtMyLocation = () => {
	if (position) {
		placePoint(position);
	}
};

const setPar = (index: number, par: number) => {
	invalidateShareCode();
	holes = holes.map((hole, i) => (i === index ? { ...hole, par } : hole));
};

const removeHole = (index: number) => {
	invalidateShareCode();
	holes = holes
		.filter((_, i) => i !== index)
		.map((hole, i) => ({ ...hole, number: i + 1 }));
	refreshMarkers();
};

const undoPendingTee = () => {
	pendingTee = null;
	placementMode = "tee";
	refreshMarkers();
};

const saveCourse = () => {
	const course: Course = {
		id: generateId(),
		name: courseName.trim(),
		holes,
	};
	if (saveCustomCourse(course)) {
		shareCode = encodeCourseShare(course);
		statusMessage = `Saved "${course.name}". Share code below.`;
	} else {
		statusMessage = "Could not save the course (storage unavailable).";
	}
};

const copyShareCode = async () => {
	if (!shareCode) return;
	try {
		await navigator.clipboard.writeText(shareCode);
		statusMessage = "Share code copied to clipboard.";
	} catch {
		statusMessage = "Copy failed — select and copy the code manually.";
	}
};

const getLocationStatusMessage = (error: GeolocationPositionError): string => {
	switch (error.code) {
		case error.PERMISSION_DENIED:
			return "Location access denied. You can still place points by tapping the map.";
		case error.POSITION_UNAVAILABLE:
			return "Location is unavailable. Check location settings or place points on the map.";
		case error.TIMEOUT:
			return "Location request timed out. Walk outside, wait for GPS, or tap the map.";
		default:
			return "Could not get your location. You can still place points by tapping the map.";
	}
};

const refreshMarkers = () => {
	for (const marker of markers) {
		marker.remove();
	}
	markers = [];
	const maplibre = getMapLibre();
	if (!map || !maplibre) return;

	holes.forEach((hole) => {
		const teeEl = document.createElement("div");
		teeEl.className = "creator-marker creator-tee";
		teeEl.textContent = String(hole.number);
		markers.push(
			new maplibre.Marker({ element: teeEl })
				.setLngLat([hole.tee.lng, hole.tee.lat])
				.addTo(map as MapLibreMap),
		);

		const basketEl = document.createElement("div");
		basketEl.className = "creator-marker creator-basket";
		basketEl.textContent = "🎯";
		markers.push(
			new maplibre.Marker({ element: basketEl })
				.setLngLat([hole.basket.lng, hole.basket.lat])
				.addTo(map as MapLibreMap),
		);
	});

	if (pendingTee) {
		const pendingEl = document.createElement("div");
		pendingEl.className = "creator-marker creator-tee pending";
		pendingEl.textContent = String(holes.length + 1);
		markers.push(
			new maplibre.Marker({ element: pendingEl })
				.setLngLat([pendingTee.lng, pendingTee.lat])
				.addTo(map as MapLibreMap),
		);
	}
};

const initializeMap = async (center: LatLng, zoom: number) => {
	if (map || !mapContainer) return;
	let loadedMapLibre: MapLibreModule;
	try {
		loadedMapLibre = await loadMapLibre();
	} catch (error) {
		console.error("Failed to load map renderer:", error);
		statusMessage =
			"Map rendering failed to load. Check your connection and reload the page.";
		return;
	}
	if (map || !mapContainer) return;
	map = new loadedMapLibre.Map({
		container: mapContainer,
		style: "https://tiles.openfreemap.org/styles/liberty",
		center: [center.lng, center.lat],
		zoom,
	});
	map.on("load", () => {
		mapReady = true;
	});
	map.on("click", (e) => {
		placePoint({ lat: e.lngLat.lat, lng: e.lngLat.lng });
	});
	map.addControl(
		new loadedMapLibre.GeolocateControl({
			positionOptions: { enableHighAccuracy: true },
			trackUserLocation: true,
		}),
		"top-right",
	);
};

onMount(() => {
	if (!navigator.geolocation) {
		// No GPS: still usable — pan the world map and tap to place points
		statusMessage =
			"GPS is not available in this browser. Place points by tapping the map.";
		void initializeMap({ lat: 20, lng: 0 }, 2);
		return;
	}
	navigator.geolocation.getCurrentPosition(
		(pos) => {
			position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
			void initializeMap(position, 17);
		},
		(error) => {
			statusMessage = getLocationStatusMessage(error);
			void initializeMap({ lat: 20, lng: 0 }, 2);
		},
		{ enableHighAccuracy: true, timeout: 10000 },
	);
	watchId = navigator.geolocation.watchPosition(
		(pos) => {
			position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
		},
		(error) => {
			console.warn("Position watch error:", error);
		},
		{ enableHighAccuracy: true },
	);
});

onDestroy(() => {
	if (watchId !== null) {
		navigator.geolocation.clearWatch(watchId);
	}
	map?.remove();
});
</script>

<div class="creator">
	<header class="creator-header">
		<button class="back-btn" onclick={() => push("/")}> ← Back </button>
		<h1>✏️ Course Creator</h1>
		<div></div>
	</header>

	<div class="creator-body">
		<div class="creator-map-wrap">
			<div bind:this={mapContainer} class="creator-map"></div>
			{#if mapReady}
				<div class="placement-hint">
					{placementMode === "tee"
						? `Tap the map to place the tee for hole ${holes.length + 1}`
						: `Now tap to place the basket for hole ${holes.length + 1}`}
				</div>
			{/if}
		</div>

		<div class="creator-panel">
			<div class="panel-row">
				<button
					class="gps-btn"
					onclick={placeAtMyLocation}
					disabled={!position}
					title={position ? "" : "Waiting for GPS fix"}
				>
					📍 {placementMode === "tee" ? "Tee" : "Basket"} at my location
				</button>
				{#if pendingTee}
					<button class="small-btn" onclick={undoPendingTee}>Cancel tee</button>
				{/if}
			</div>

			{#if statusMessage}
				<p class="status-message">{statusMessage}</p>
			{/if}

			{#if holes.length > 0}
				<ul class="hole-list">
					{#each holes as hole, i (hole.number)}
						<li>
							<span class="hole-label">
								Hole {hole.number} ·
								{formatDistance(distanceMeters(hole.tee, hole.basket))}
							</span>
							<label class="par-label">
								Par
								<select
									value={hole.par}
									onchange={(e) => setPar(i, Number(e.currentTarget.value))}
								>
									{#each [2, 3, 4, 5] as par (par)}
										<option value={par}>{par}</option>
									{/each}
								</select>
							</label>
							<button class="small-btn" onclick={() => removeHole(i)}>🗑</button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty-note">
					No holes yet. Walk to a tee (or tap the map) and place points.
				</p>
			{/if}

			<div class="save-row">
				<input
					type="text"
					placeholder="Course name"
					value={courseName}
					oninput={(e) => setCourseName(e.currentTarget.value)}
					maxlength="60"
				/>
				<button class="save-btn" onclick={saveCourse} disabled={!canSave}>
					💾 Save course
				</button>
			</div>

			{#if shareCode}
				<div class="share-box">
					<p>Share code (import it on another device):</p>
					<code>{shareCode}</code>
					<button class="small-btn" onclick={copyShareCode}>Copy</button>
					<button class="small-btn" onclick={() => push("/")}>Done</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
.creator {
	height: 100vh;
	width: 100vw;
	display: flex;
	flex-direction: column;
}

.creator-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 20px;
	padding-top: max(12px, env(safe-area-inset-top));
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	z-index: 1000;
}

.creator-header h1 {
	margin: 0;
	font-size: 1.3em;
}

.back-btn {
	background: rgba(255, 255, 255, 0.2);
	border: 2px solid rgba(255, 255, 255, 0.3);
	color: white;
	padding: 8px 16px;
	border-radius: 20px;
	cursor: pointer;
	font-weight: 600;
}

.creator-body {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.creator-map-wrap {
	flex: 1;
	position: relative;
	min-height: 40vh;
}

.creator-map {
	width: 100%;
	height: 100%;
}

.placement-hint {
	position: absolute;
	top: 12px;
	left: 50%;
	transform: translateX(-50%);
	background: rgba(0, 0, 0, 0.75);
	color: white;
	padding: 8px 16px;
	border-radius: 18px;
	font-size: 0.85em;
	font-weight: 600;
	z-index: 500;
	white-space: nowrap;
	max-width: 92%;
	overflow: hidden;
	text-overflow: ellipsis;
}

.creator-panel {
	background: white;
	padding: 15px;
	padding-bottom: max(15px, env(safe-area-inset-bottom));
	overflow-y: auto;
	max-height: 45vh;
	color: #2d3748;
	border-top: 1px solid #e2e8f0;
}

.panel-row {
	display: flex;
	gap: 10px;
	align-items: center;
}

.gps-btn {
	flex: 1;
	background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
	border: none;
	color: white;
	padding: 12px;
	border-radius: 12px;
	font-weight: 700;
	cursor: pointer;
}

.gps-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.small-btn {
	background: #edf2f7;
	border: none;
	color: #4a5568;
	padding: 8px 14px;
	border-radius: 10px;
	font-weight: 600;
	cursor: pointer;
}

.status-message {
	margin: 10px 0 0 0;
	color: #38a169;
	font-size: 0.9em;
	font-weight: 600;
}

.hole-list {
	list-style: none;
	margin: 12px 0 0 0;
	padding: 0;
}

.hole-list li {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 0;
	border-bottom: 1px solid #e2e8f0;
}

.hole-label {
	flex: 1;
	font-weight: 600;
}

.par-label {
	font-size: 0.9em;
	color: #4a5568;
}

.par-label select {
	margin-left: 6px;
	padding: 4px 8px;
	border-radius: 8px;
	border: 1px solid #cbd5e0;
}

.empty-note {
	color: #718096;
	margin: 12px 0 0 0;
}

.save-row {
	display: flex;
	gap: 10px;
	margin-top: 15px;
}

.save-row input {
	flex: 1;
	padding: 10px 14px;
	border: 2px solid #e2e8f0;
	border-radius: 10px;
	font-size: 0.95em;
}

.save-btn {
	background: #38a169;
	color: white;
	border: none;
	border-radius: 10px;
	padding: 10px 18px;
	font-weight: 700;
	cursor: pointer;
}

.save-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.share-box {
	margin-top: 15px;
	background: #f7fafc;
	border: 1px solid #e2e8f0;
	border-radius: 10px;
	padding: 12px;
}

.share-box p {
	margin: 0 0 8px 0;
	font-size: 0.9em;
	color: #4a5568;
}

.share-box code {
	display: block;
	word-break: break-all;
	font-size: 0.75em;
	background: white;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	padding: 8px;
	margin-bottom: 10px;
	max-height: 90px;
	overflow-y: auto;
}

:global(.creator-marker) {
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 700;
}

:global(.creator-tee) {
	width: 26px;
	height: 26px;
	background: #667eea;
	color: white;
	border-radius: 50%;
	border: 2px solid white;
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

:global(.creator-tee.pending) {
	background: #ed8936;
}

:global(.creator-basket) {
	font-size: 20px;
}

@media (min-width: 900px) {
	.creator-body {
		flex-direction: row;
	}

	.creator-panel {
		width: 380px;
		max-height: none;
		border-top: none;
		border-left: 1px solid #e2e8f0;
	}
}
</style>
