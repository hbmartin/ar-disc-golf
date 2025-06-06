<script lang="ts">
import { onMount } from "svelte";

interface LocationData {
	latitude: number;
	longitude: number;
	accuracy: number;
	timestamp: number;
}

interface LocationError {
	code: number;
	message: string;
}

let location: LocationData | null = $state(null);
let error: LocationError | null = $state(null);
let loading: boolean = $state(false);
let permissionStatus: string = $state("unknown");

const getLocationErrorMessage = (error: GeolocationPositionError): string => {
	switch (error.code) {
		case error.PERMISSION_DENIED:
			return "Location access denied. Please enable location permissions in your browser settings.";
		case error.POSITION_UNAVAILABLE:
			return "Location information is unavailable. Please check your device's location settings.";
		case error.TIMEOUT:
			return "Location request timed out. Please try again.";
		default:
			return "An unknown error occurred while retrieving location.";
	}
};

const getCurrentLocation = (): Promise<LocationData> => {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject({
				code: -1,
				message: "Geolocation is not supported by this browser.",
			});
			return;
		}

		const options: PositionOptions = {
			enableHighAccuracy: true,
			timeout: 10000,
			maximumAge: 60000, // Cache for 1 minute
		};

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const locationData: LocationData = {
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					accuracy: position.coords.accuracy,
					timestamp: position.timestamp,
				};
				resolve(locationData);
			},
			(positionError) => {
				reject({
					code: positionError.code,
					message: getLocationErrorMessage(positionError),
				});
			},
			options,
		);
	});
};

const checkPermissionStatus = async () => {
	if ("permissions" in navigator) {
		try {
			const permission = await navigator.permissions.query({
				name: "geolocation",
			});
			permissionStatus = permission.state;

			permission.addEventListener("change", () => {
				permissionStatus = permission.state;
				if (permission.state === "granted" && !location) {
					requestLocation();
				}
			});
		} catch (_err) {
			console.warn("Permission API not fully supported");
		}
	}
};

const requestLocation = async () => {
	loading = true;
	error = null;

	try {
		const locationData = await getCurrentLocation();
		location = locationData;
		permissionStatus = "granted";
	} catch (err) {
		error = err as LocationError;
		if (error.code === 1) {
			// PERMISSION_DENIED
			permissionStatus = "denied";
		}
	} finally {
		loading = false;
	}
};

const retryLocation = () => {
	error = null;
	requestLocation();
};

onMount(() => {
	checkPermissionStatus();
	requestLocation();
});

// Export reactive values and functions for parent components
export {
	location,
	error,
	loading,
	permissionStatus,
	requestLocation,
	retryLocation,
};
</script>

<div class="location-service">
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Getting your location...</p>
		</div>
	{:else if error}
		<div class="error">
			<div class="error-icon">⚠️</div>
			<h3>Location Error</h3>
			<p>{error.message}</p>
			{#if error.code === 1}
				<p class="permission-help">
					To use location features, please:
					<br />1. Click the location icon in your browser's address bar
					<br />2. Select "Allow" for location access
					<br />3. Refresh the page or click retry below
				</p>
			{/if}
			<button onclick={retryLocation} class="retry-btn"> Try Again </button>
		</div>
	{:else if location}
		<div class="location-info">
			<div class="location-icon">📍</div>
			<h3>Your Location</h3>
			<div class="coordinates">
				<div class="coord-item">
					<span class="label">Latitude:</span>
					<span class="value">{location.latitude.toFixed(6)}</span>
				</div>
				<div class="coord-item">
					<span class="label">Longitude:</span>
					<span class="value">{location.longitude.toFixed(6)}</span>
				</div>
				<div class="coord-item">
					<span class="label">Accuracy:</span>
					<span class="value">±{Math.round(location.accuracy)}m</span>
				</div>
				<div class="coord-item">
					<span class="label">Updated:</span>
					<span class="value"
						>{new Date(location.timestamp).toLocaleTimeString()}</span
					>
				</div>
			</div>
			<button onclick={retryLocation} class="refresh-btn">
				Refresh Location
			</button>
		</div>
	{/if}
</div>

<style>
.location-service {
	max-width: 400px;
	margin: 0 auto;
	padding: 20px;
	border-radius: 12px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.loading {
	text-align: center;
	padding: 20px;
}

.spinner {
	width: 40px;
	height: 40px;
	border: 4px solid rgba(255, 255, 255, 0.3);
	border-top: 4px solid white;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin: 0 auto 15px;
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.error {
	text-align: center;
	padding: 20px;
}

.error-icon {
	font-size: 48px;
	margin-bottom: 15px;
}

.error h3 {
	margin: 0 0 15px 0;
	font-size: 1.5em;
}

.error p {
	margin: 0 0 15px 0;
	line-height: 1.5;
}

.permission-help {
	background: rgba(255, 255, 255, 0.1);
	padding: 15px;
	border-radius: 8px;
	font-size: 0.9em;
	text-align: left;
}

.location-info {
	text-align: center;
}

.location-icon {
	font-size: 48px;
	margin-bottom: 15px;
}

.location-info h3 {
	margin: 0 0 20px 0;
	font-size: 1.5em;
}

.coordinates {
	background: rgba(255, 255, 255, 0.1);
	border-radius: 8px;
	padding: 20px;
	margin-bottom: 20px;
}

.coord-item {
	display: flex;
	justify-content: space-between;
	margin-bottom: 10px;
	padding: 5px 0;
}

.coord-item:last-child {
	margin-bottom: 0;
}

.label {
	font-weight: 600;
	opacity: 0.9;
}

.value {
	font-family: "Courier New", monospace;
	font-weight: 500;
}

.retry-btn,
.refresh-btn {
	background: rgba(255, 255, 255, 0.2);
	border: 2px solid rgba(255, 255, 255, 0.3);
	color: white;
	padding: 12px 24px;
	border-radius: 25px;
	cursor: pointer;
	font-size: 1em;
	font-weight: 600;
	transition: all 0.3s ease;
}

.retry-btn:hover,
.refresh-btn:hover {
	background: rgba(255, 255, 255, 0.3);
	border-color: rgba(255, 255, 255, 0.5);
	transform: translateY(-2px);
}

.retry-btn:active,
.refresh-btn:active {
	transform: translateY(0);
}
</style>
