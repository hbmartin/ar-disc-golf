<script module>
// import "aframe";
import "@ar-js-org/ar.js";

// Register A-Frame components before scene initialization
AFRAME.registerComponent("scene-listener", {
	init: function () {
		console.log("Scene listener component initialized");

		this.el.addEventListener("loaded", () => {
			console.log("AR camera loaded successfully");
			// Update camera loading state
			const event = new CustomEvent("ar-camera-loaded");
			window.dispatchEvent(event);
		});

		this.el.addEventListener("error", (event) => {
			console.error("AR camera loading error:", event);
			// Update camera error state
			const errorEvent = new CustomEvent("ar-camera-error");
			window.dispatchEvent(errorEvent);
		});
	},
});

AFRAME.registerComponent("curved-arrow", {
	schema: {
		color: { type: "color", default: "#FF0000" },
		radius: { type: "number", default: 1 },
		tube: { type: "number", default: 0.02 },
		radialSegments: { type: "int", default: 8 },
		tubularSegments: { type: "int", default: 64 },
		arc: { type: "number", default: Math.PI },
	},
	init: function () {
		const data = this.data;
		const curve = new THREE.QuadraticBezierCurve3(
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(0, data.radius, -data.radius),
			new THREE.Vector3(data.radius, 0, -2 * data.radius),
		);

		const geometry = new THREE.TubeGeometry(
			curve,
			data.tubularSegments,
			data.tube,
			data.radialSegments,
			false,
		);

		const material = new THREE.MeshStandardMaterial({ color: data.color });
		const mesh = new THREE.Mesh(geometry, material);

		this.el.setObject3D("mesh", mesh);

		const arrowHeadGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
		const arrowHeadMaterial = new THREE.MeshStandardMaterial({
			color: data.color,
		});
		const arrowHead = new THREE.Mesh(arrowHeadGeometry, arrowHeadMaterial);

		// Position the arrowhead at the end of the curve
		const endPoint = curve.getPoint(1);
		arrowHead.position.copy(endPoint);

		// Align the arrowhead with the direction of the curve
		const tangent = curve.getTangent(1).normalize();
		arrowHead.quaternion.setFromUnitVectors(
			new THREE.Vector3(0, 1, 0),
			tangent,
		);

		this.el.setObject3D("arrowhead", arrowHead);
	},
});
</script>

<script lang="ts">
import maplibregl from "maplibre-gl";
import { onDestroy, onMount } from "svelte";
import "maplibre-gl/dist/maplibre-gl.css";

const { onBack, gameId }: { onBack: () => void; gameId: string } = $props();

let mapContainer: HTMLDivElement;
let arScene: HTMLElement;
let map: maplibregl.Map;
let userMarker: maplibregl.Marker | null = null;
let watchId: number | null = null;
let currentPosition: { lat: number; lng: number } | null = $state(null);
let locationError: string | null = $state(null);
let isLoading = $state(true);
let isDeviceUpright = $state(false);
let orientationPermissionRequested = $state(false);
let cameraLoading = $state(true);
let cameraError = $state(false);


const initializeMap = (lat: number, lng: number) => {
	if (!mapContainer) return;

	map = new maplibregl.Map({
		container: mapContainer,
		style: "https://tiles.openfreemap.org/styles/liberty",
		center: [lng, lat],
		zoom: 16,
		pitch: 0,
		bearing: 0,
	});

	map.on("load", () => {
		console.log("Map loaded");
		isLoading = false;

		// Add user location marker
		userMarker = new maplibregl.Marker({
			color: "#4facfe",
			scale: 1.2,
		})
			.setLngLat([lng, lat])
			.addTo(map);

		// Add navigation controls
		map.addControl(new maplibregl.NavigationControl(), "top-right");

		// Add geolocate control
		const geolocateControl = new maplibregl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true,
			},
			trackUserLocation: true,
		});

		map.addControl(geolocateControl, "top-right");
	});

	map.on("error", (e) => {
		console.error("Map error:", e);
		locationError =
			"Failed to load map. Please check your internet connection.";
		isLoading = false;
	});
};

const updateUserPosition = (lat: number, lng: number) => {
	currentPosition = { lat, lng };

	if (userMarker && map) {
		userMarker.setLngLat([lng, lat]);

		// Smoothly animate to new position
		map.easeTo({
			center: [lng, lat],
			duration: 1000,
		});
	}
};

const startLocationTracking = () => {
	if (!navigator.geolocation) {
		// Use demo location for testing
		console.log("Geolocation not supported, using demo location");
		const demoLat = 37.7749; // San Francisco
		const demoLng = -122.4194;
		initializeMap(demoLat, demoLng);
		updateUserPosition(demoLat, demoLng);
		return;
	}

	const options: PositionOptions = {
		enableHighAccuracy: true,
		timeout: 10000,
		maximumAge: 0,
	};

	// Get initial position
	navigator.geolocation.getCurrentPosition(
		(position) => {
			const { latitude, longitude } = position.coords;
			initializeMap(latitude, longitude);
			updateUserPosition(latitude, longitude);
		},
		(error) => {
			console.error("Geolocation error:", error);
			// Use demo location when geolocation fails
			console.log("Using demo location due to geolocation error");
			const demoLat = 37.7749; // San Francisco
			const demoLng = -122.4194;
			initializeMap(demoLat, demoLng);
			updateUserPosition(demoLat, demoLng);
		},
		options,
	);

	// Watch position for real-time updates (only if geolocation is available)
	watchId = navigator.geolocation.watchPosition(
		(position) => {
			const { latitude, longitude } = position.coords;
			updateUserPosition(latitude, longitude);
		},
		(error) => {
			console.error("Position watch error:", error);
			// Don't show error for watch position failures, just log them
		},
		options,
	);
};

const getLocationErrorMessage = (error: GeolocationPositionError): string => {
	switch (error.code) {
		case error.PERMISSION_DENIED:
			return "Location access denied. Please enable location permissions to use the map.";
		case error.POSITION_UNAVAILABLE:
			return "Location information is unavailable. Please check your device's location settings.";
		case error.TIMEOUT:
			return "Location request timed out. Please try again.";
		default:
			return "An unknown error occurred while retrieving location.";
	}
};

const retryLocation = () => {
	locationError = null;
	isLoading = true;
	startLocationTracking();
};

const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
	// Check if the device is pointing downward (beta > 45 degrees)
	// Beta represents front-to-back tilt: 90 is pointing straight down, 0 is flat, -90 is pointing up
	if (event.beta !== null) {
		const wasUpright = isDeviceUpright;
		isDeviceUpright = event.beta > 45;

		console.log('Device orientation changed:', isDeviceUpright);

		if (isDeviceUpright) {
			mapContainer.style.display = "none";
			arScene.style.display = "block";
			document.getElementById('arjs-video').style.display = 'block';
		} else {
			mapContainer.style.display = "block";
			arScene.style.display = "none";
			document.getElementById('arjs-video').style.display = 'none';
		}

		// Reset camera states when switching to AR view
		if (!wasUpright && isDeviceUpright) {
			cameraLoading = true;
			cameraError = false;
			// Set timeout to handle cases where camera events don't fire
			setTimeout(() => {
				if (cameraLoading) {
					cameraLoading = false;
				}
			}, 3000);
		}
	}
};

const requestOrientationPermission = async () => {
  console.log("requestOrientationPermission")
	if (
		"DeviceOrientationEvent" in window &&
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		typeof (DeviceOrientationEvent as any).requestPermission === "function"
	) {
		try {
			const permission =
				await // biome-ignore lint/suspicious/noExplicitAny: <explanation>
				(DeviceOrientationEvent as any).requestPermission();
			if (permission === "granted") {
				window.addEventListener("deviceorientation", handleDeviceOrientation);
			}
		} catch (error) {
			console.error("Error requesting device orientation permission:", error);
		}
	} else {
		// For non-iOS devices, just add the listener
		window.addEventListener("deviceorientation", handleDeviceOrientation);
	}
};

const handleMapClick = () => {
	// Request orientation permission on first user interaction (iOS only)
	if (
		!orientationPermissionRequested &&
		"DeviceOrientationEvent" in window &&
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		typeof (DeviceOrientationEvent as any).requestPermission === "function"
	) {
		orientationPermissionRequested = true;
		requestOrientationPermission();
	}
};

onMount(() => {
	startLocationTracking();
	// For non-iOS devices, add orientation listener immediately
	if (
		"DeviceOrientationEvent" in window &&
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		typeof (DeviceOrientationEvent as any).requestPermission !== "function"
	) {
		window.addEventListener("deviceorientation", handleDeviceOrientation);
	}

	// Add AR event listeners
	window.addEventListener('ar-camera-loaded', () => {
		cameraLoading = false;
		cameraError = false;
	});

	window.addEventListener('ar-camera-error', () => {
		cameraLoading = false;
		cameraError = true;
	});

	// Disable browser scrolling
	document.body.style.overflow = "hidden";
});

onDestroy(() => {
	if (watchId !== null) {
		navigator.geolocation.clearWatch(watchId);
	}
	if (map) {
		map.remove();
	}
	window.removeEventListener("deviceorientation", handleDeviceOrientation);
	window.removeEventListener('ar-camera-loaded', () => {});
	window.removeEventListener('ar-camera-error', () => {});
	// Re-enable browser scrolling
	document.body.style.overflow = "";
});
</script>

<div class="map-game">
	<header class="map-header">
		<button class="back-btn" onclick={onBack}> ← Back </button>
		<h1>🎯 Disc Golf Terrain Map</h1>
		<div class="status">
			{#if currentPosition}
				<span class="location-indicator">📍 Live</span>
			{/if}
		</div>
	</header>

	<div class="map-container">
		{#if isLoading}
			<div class="loading-overlay">
				<div class="spinner"></div>
				<p>Loading map and getting your location...</p>
			</div>
		{/if}
		<!-- {#if isDeviceUpright} -->
		<div class="camera-view">
			{#if cameraLoading && !cameraError}
				<div class="camera-loading">
					<div class="spinner"></div>
					<p>Starting camera...</p>
				</div>
			{/if}
			{#if cameraError}
				<div class="camera-error">
					<div class="error-icon">📷</div>
					<p>Camera access denied or unavailable</p>
				</div>
			{/if}
			<a-scene
				bind:this={arScene}
				vr-mode-ui="enabled: false"
				arjs="sourceType: webcam; facingMode: environment; debugUIEnabled: true; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
				renderer="logarithmicDepthBuffer: true;"
				embedded
				loading-screen="enabled: false"
				scene-listener
				onclick={handleMapClick}
			>
  <a-entity curved-arrow position="0 0 -3"></a-entity>

				<a-entity camera="active: true; fov: 80"></a-entity>
			</a-scene>
		</div>
		<!-- {/if} -->
		{#if locationError}
			<div class="error-overlay">
				<div class="error-content">
					<div class="error-icon">⚠️</div>
					<h3>Location Error</h3>
					<p>{locationError}</p>
					<button onclick={retryLocation} class="retry-btn"> Try Again </button>
				</div>
			</div>
		{/if}
		<div bind:this={mapContainer} class="map" onclick={handleMapClick}></div>
	</div>
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
	padding: 15px 20px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	z-index: 1000;
}
:global {
#arjs-video {
    z-index: 999 !important;
}
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
	transform: translateY(-1px);
}

.map-header h1 {
	margin: 0;
	font-size: 1.5em;
	font-weight: 700;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.7;
	}
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
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(255, 255, 255, 0.95);
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.camera-view {
	background: transparent;
}

.loading-overlay,
.error-overlay,
.camera-loading,
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

.camera-loading p,
.camera-error p {
	margin: 10px 0 0 0;
	font-size: 0.9em;
}

.loading-overlay {
	flex-direction: column;
	text-align: center;
}

.spinner {
	width: 50px;
	height: 50px;
	border: 4px solid #e2e8f0;
	border-top: 4px solid #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin-bottom: 20px;
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.loading-overlay p {
	margin: 0;
	color: #4a5568;
	font-size: 1.1em;
	font-weight: 500;
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

.retry-btn {
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

.retry-btn:hover {
	transform: translateY(-2px);
	box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
}

.upright-content {
	text-align: center;
	background: white;
	padding: 40px;
	border-radius: 16px;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
	max-width: 400px;
	margin: 20px;
}

.upright-icon {
	font-size: 64px;
	margin-bottom: 20px;
}

.upright-content h2 {
	margin: 0 0 15px 0;
	color: #667eea;
	font-size: 1.8em;
	font-weight: 700;
}

.upright-content p {
	margin: 0;
	color: #4a5568;
	font-size: 1.1em;
	line-height: 1.5;
}

/* Mobile optimizations */
@media (max-width: 768px) {
	.map-header {
		padding: 12px 15px;
	}

	.map-header h1 {
		font-size: 1.2em;
	}

	.back-btn {
		padding: 6px 12px;
		font-size: 0.8em;
	}

	.location-indicator {
		font-size: 0.7em;
		padding: 3px 8px;
	}

	.error-content,
	.upright-content {
		padding: 30px 20px;
		margin: 15px;
	}

	.upright-content h2 {
		font-size: 1.5em;
	}

	.upright-icon {
		font-size: 48px;
	}
}

/* Ensure map controls are accessible on mobile */
:global(.maplibregl-ctrl-group) {
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;
}

:global(.maplibregl-ctrl-group button) {
	min-width: 44px !important;
	min-height: 44px !important;
}
</style>
