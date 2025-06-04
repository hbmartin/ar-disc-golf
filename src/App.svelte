<script lang="ts">
  import LocationService from './lib/LocationService.svelte'
  
  let locationServiceRef: LocationService;
  let showLocationDetails = $state(false);
</script>

<main>
  <header>
    <h1>🥏 AR Disc Golf</h1>
    <p class="subtitle">Augmented Reality Disc Golf Experience</p>
  </header>

  <div class="content">
    <section class="location-section">
      <h2>📍 Your Location</h2>
      <LocationService bind:this={locationServiceRef} />
      
      <div class="location-actions">
        <button 
          onclick={() => showLocationDetails = !showLocationDetails}
          class="toggle-details-btn"
        >
          {showLocationDetails ? 'Hide' : 'Show'} Location Details
        </button>
      </div>

      {#if showLocationDetails && locationServiceRef?.location}
        <div class="location-details">
          <h3>Detailed Location Information</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Decimal Degrees:</span>
              <span class="detail-value">
                {locationServiceRef.location.latitude.toFixed(8)}, {locationServiceRef.location.longitude.toFixed(8)}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">GPS Accuracy:</span>
              <span class="detail-value">±{Math.round(locationServiceRef.location.accuracy)} meters</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Timestamp:</span>
              <span class="detail-value">{new Date(locationServiceRef.location.timestamp).toLocaleString()}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Maps Link:</span>
              <a 
                href={`https://www.google.com/maps?q=${locationServiceRef.location.latitude},${locationServiceRef.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                class="maps-link"
              >
                View on Google Maps
              </a>
            </div>
          </div>
        </div>
      {/if}
    </section>

    <section class="ar-section">
      <h2>🎯 AR Features</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">📱</div>
          <h3>AR Camera</h3>
          <p>Use your device camera to view augmented reality disc golf targets and obstacles.</p>
          <button class="feature-btn" disabled>Coming Soon</button>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🎯</div>
          <h3>Target Tracking</h3>
          <p>Track your throws and measure distances to targets using GPS and AR technology.</p>
          <button class="feature-btn" disabled>Coming Soon</button>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>Score Tracking</h3>
          <p>Keep track of your scores and improve your disc golf game with detailed analytics.</p>
          <button class="feature-btn" disabled>Coming Soon</button>
        </div>
      </div>
    </section>

    <section class="info-section">
      <h2>ℹ️ About Location Services</h2>
      <div class="info-content">
        <p>
          This app uses your device's GPS to provide location-based features for disc golf. 
          Your location data is only used locally and is not stored or transmitted to any servers.
        </p>
        <ul>
          <li>📍 Accurate positioning for AR features</li>
          <li>📏 Distance measurements to targets</li>
          <li>🗺️ Course mapping and navigation</li>
          <li>🔒 Privacy-focused - data stays on your device</li>
        </ul>
      </div>
    </section>
  </div>
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  header {
    text-align: center;
    margin-bottom: 40px;
    padding: 40px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    color: white;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }

  header h1 {
    margin: 0 0 10px 0;
    font-size: 3em;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .subtitle {
    margin: 0;
    font-size: 1.2em;
    opacity: 0.9;
    font-weight: 300;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  section {
    background: white;
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid #e1e5e9;
  }

  section h2 {
    margin: 0 0 25px 0;
    font-size: 1.8em;
    color: #2d3748;
    font-weight: 600;
  }

  .location-actions {
    margin-top: 20px;
    text-align: center;
  }

  .toggle-details-btn {
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

  .toggle-details-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
  }

  .location-details {
    margin-top: 25px;
    background: #f8fafc;
    border-radius: 12px;
    padding: 25px;
    border: 1px solid #e2e8f0;
  }

  .location-details h3 {
    margin: 0 0 20px 0;
    color: #2d3748;
    font-size: 1.3em;
  }

  .detail-grid {
    display: grid;
    gap: 15px;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .detail-item:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-weight: 600;
    color: #4a5568;
  }

  .detail-value {
    font-family: 'Courier New', monospace;
    color: #2d3748;
    font-weight: 500;
  }

  .maps-link {
    color: #4299e1;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s ease;
  }

  .maps-link:hover {
    color: #3182ce;
    text-decoration: underline;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 25px;
  }

  .feature-card {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    border-radius: 16px;
    padding: 30px;
    text-align: center;
    color: white;
    transition: transform 0.3s ease;
    box-shadow: 0 8px 25px rgba(240, 147, 251, 0.3);
  }

  .feature-card:hover {
    transform: translateY(-5px);
  }

  .feature-icon {
    font-size: 3em;
    margin-bottom: 15px;
  }

  .feature-card h3 {
    margin: 0 0 15px 0;
    font-size: 1.4em;
    font-weight: 600;
  }

  .feature-card p {
    margin: 0 0 20px 0;
    line-height: 1.6;
    opacity: 0.9;
  }

  .feature-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    cursor: not-allowed;
    font-weight: 600;
    opacity: 0.7;
  }

  .info-content p {
    margin: 0 0 20px 0;
    line-height: 1.7;
    color: #4a5568;
    font-size: 1.1em;
  }

  .info-content ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .info-content li {
    padding: 10px 0;
    color: #4a5568;
    font-size: 1.05em;
    border-bottom: 1px solid #e2e8f0;
  }

  .info-content li:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    main {
      padding: 15px;
    }

    header h1 {
      font-size: 2.2em;
    }

    .subtitle {
      font-size: 1em;
    }

    section {
      padding: 20px;
    }

    .feature-grid {
      grid-template-columns: 1fr;
    }

    .detail-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
    }
  }
</style>
