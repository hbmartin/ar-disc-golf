<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';

  export let onBack: () => void;

  let mapContainer: HTMLDivElement;
  let map: maplibregl.Map;
  let userMarker: maplibregl.Marker | null = null;
  let watchId: number | null = null;
  let currentPosition: { lat: number; lng: number } | null = null;
  let locationError: string | null = null;
  let isLoading = true;

  const initializeMap = (lat: number, lng: number) => {
    if (!mapContainer) return;

    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [lng, lat],
      zoom: 16,
      pitch: 0,
      bearing: 0
    });

    map.on('load', () => {
      isLoading = false;

      // Add user location marker
      userMarker = new maplibregl.Marker({
        color: '#4facfe',
        scale: 1.2
      })
        .setLngLat([lng, lat])
        .addTo(map);

      // Add navigation controls
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Add geolocate control
      const geolocateControl = new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });

      map.addControl(geolocateControl, 'top-right');
    });

    map.on('error', (e) => {
      console.error('Map error:', e);
      locationError = 'Failed to load map. Please check your internet connection.';
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
        duration: 1000
      });
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      // Use demo location for testing
      console.log('Geolocation not supported, using demo location');
      const demoLat = 37.7749; // San Francisco
      const demoLng = -122.4194;
      initializeMap(demoLat, demoLng);
      updateUserPosition(demoLat, demoLng);
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        initializeMap(latitude, longitude);
        updateUserPosition(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Use demo location when geolocation fails
        console.log('Using demo location due to geolocation error');
        const demoLat = 37.7749; // San Francisco
        const demoLng = -122.4194;
        initializeMap(demoLat, demoLng);
        updateUserPosition(demoLat, demoLng);
      },
      options
    );

    // Watch position for real-time updates (only if geolocation is available)
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateUserPosition(latitude, longitude);
      },
      (error) => {
        console.error('Position watch error:', error);
        // Don't show error for watch position failures, just log them
      },
      options
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

  onMount(() => {
    startLocationTracking();
  });

  onDestroy(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    if (map) {
      map.remove();
    }
  });
</script>

<div class="map-game">
  <header class="map-header">
    <button class="back-btn" onclick={onBack}>
      ← Back
    </button>
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

    {#if locationError}
      <div class="error-overlay">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <h3>Location Error</h3>
          <p>{locationError}</p>
          <button onclick={retryLocation} class="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    {/if}

    <div bind:this={mapContainer} class="map"></div>
  </div>

  <div class="game-info">
    <div class="info-card">
      <h3>🎮 Game Features</h3>
      <ul>
        <li>📍 Real-time location tracking</li>
        <li>🏔️ OpenStreetMap terrain tiles</li>
        <li>🗺️ Interactive map navigation</li>
        <li>🎯 Target placement (coming soon)</li>
        <li>📊 Score tracking (coming soon)</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .map-game {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
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
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
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

  .loading-overlay, .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
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
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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

  .game-info {
    background: white;
    border-top: 1px solid #e2e8f0;
    padding: 20px;
  }

  .info-card {
    max-width: 600px;
    margin: 0 auto;
  }

  .info-card h3 {
    margin: 0 0 15px 0;
    color: #2d3748;
    font-size: 1.2em;
    font-weight: 600;
  }

  .info-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .info-card li {
    padding: 8px 0;
    color: #4a5568;
    font-size: 0.95em;
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

    .error-content {
      padding: 30px 20px;
      margin: 15px;
    }

    .game-info {
      padding: 15px;
    }

    .info-card ul {
      grid-template-columns: 1fr;
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
