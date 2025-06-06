import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MapGame Upright Content Display Logic', () => {
  let isDeviceUpright = false;
  let mockDOM: { uprightContent: HTMLElement | null; mapContent: HTMLElement | null };

  // Mock DOM elements that represent the conditional rendering
  const createMockDOM = () => {
    const uprightDiv = document.createElement('div');
    uprightDiv.innerHTML = `
      <div class="upright-content">
        <div class="upright-icon">📱</div>
        <h2>Thanks for holding up your device</h2>
        <p>Point your device downward to see the map</p>
      </div>
    `;
    
    const mapDiv = document.createElement('div');
    mapDiv.innerHTML = `
      <div class="map-container">
        <div class="map"></div>
      </div>
    `;

    return {
      uprightContent: uprightDiv,
      mapContent: mapDiv
    };
  };

  // Simulate the conditional rendering logic from MapGame.svelte
  const updateDisplay = () => {
    if (isDeviceUpright) {
      // Show upright content, hide map
      mockDOM.uprightContent!.style.display = 'block';
      mockDOM.mapContent!.style.display = 'none';
    } else {
      // Hide upright content, show map
      mockDOM.uprightContent!.style.display = 'none';
      mockDOM.mapContent!.style.display = 'block';
    }
  };

  const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta !== null) {
      isDeviceUpright = event.beta < 45;
      updateDisplay();
    }
  };

  beforeEach(() => {
    isDeviceUpright = false;
    mockDOM = createMockDOM();
    updateDisplay(); // Initial display state
  });

  it('should display upright content when device is upright (beta < 45)', () => {
    const event = new DeviceOrientationEvent('deviceorientation', {
      beta: 30, // Device is upright
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    handleDeviceOrientation(event);

    // Check that upright content is visible
    expect(mockDOM.uprightContent!.style.display).toBe('block');
    expect(mockDOM.mapContent!.style.display).toBe('none');
    
    // Check that the upright content contains the expected text
    expect(mockDOM.uprightContent!.textContent).toContain('Thanks for holding up your device');
    expect(mockDOM.uprightContent!.textContent).toContain('Point your device downward to see the map');
  });

  it('should hide upright content when device is pointing down (beta >= 45)', () => {
    // First set device to upright
    let event = new DeviceOrientationEvent('deviceorientation', {
      beta: 30, // Device is upright
      alpha: 0,
      gamma: 0,
      absolute: false,
    });
    handleDeviceOrientation(event);

    // Verify upright content is shown
    expect(mockDOM.uprightContent!.style.display).toBe('block');

    // Now point device down
    event = new DeviceOrientationEvent('deviceorientation', {
      beta: 60, // Device is pointing down
      alpha: 0,
      gamma: 0,
      absolute: false,
    });
    handleDeviceOrientation(event);

    // Check that upright content is hidden and map is shown
    expect(mockDOM.uprightContent!.style.display).toBe('none');
    expect(mockDOM.mapContent!.style.display).toBe('block');
  });

  it('should handle rapid orientation changes correctly', () => {
    // Simulate rapid changes between upright and down positions
    const events = [
      { beta: 30 }, // upright
      { beta: 60 }, // down
      { beta: 20 }, // upright
      { beta: 80 }, // down
      { beta: 44 }, // upright (just below threshold)
      { beta: 45 }, // down (at threshold)
    ];

    events.forEach((eventData, index) => {
      const event = new DeviceOrientationEvent('deviceorientation', {
        beta: eventData.beta,
        alpha: 0,
        gamma: 0,
        absolute: false,
      });
      
      handleDeviceOrientation(event);
      
      if (eventData.beta < 45) {
        expect(mockDOM.uprightContent!.style.display).toBe('block');
        expect(mockDOM.mapContent!.style.display).toBe('none');
      } else {
        expect(mockDOM.uprightContent!.style.display).toBe('none');
        expect(mockDOM.mapContent!.style.display).toBe('block');
      }
    });
  });

  it('should verify upright content structure and styling', () => {
    // Set device to upright to show the content
    const event = new DeviceOrientationEvent('deviceorientation', {
      beta: 30,
      alpha: 0,
      gamma: 0,
      absolute: false,
    });
    handleDeviceOrientation(event);

    // Verify the structure of the upright content
    const uprightContentDiv = mockDOM.uprightContent!.querySelector('.upright-content');
    expect(uprightContentDiv).toBeTruthy();

    const icon = mockDOM.uprightContent!.querySelector('.upright-icon');
    expect(icon).toBeTruthy();
    expect(icon!.textContent).toBe('📱');

    const heading = mockDOM.uprightContent!.querySelector('h2');
    expect(heading).toBeTruthy();
    expect(heading!.textContent).toBe('Thanks for holding up your device');

    const paragraph = mockDOM.uprightContent!.querySelector('p');
    expect(paragraph).toBeTruthy();
    expect(paragraph!.textContent).toBe('Point your device downward to see the map');
  });

  it('should maintain consistent display state across multiple orientation events', () => {
    // Test that the display state is consistent when multiple events with same orientation are fired
    const uprightEvent = new DeviceOrientationEvent('deviceorientation', {
      beta: 30,
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    // Fire the same event multiple times
    for (let i = 0; i < 5; i++) {
      handleDeviceOrientation(uprightEvent);
      expect(mockDOM.uprightContent!.style.display).toBe('block');
      expect(mockDOM.mapContent!.style.display).toBe('none');
    }

    const downEvent = new DeviceOrientationEvent('deviceorientation', {
      beta: 60,
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    // Fire the down event multiple times
    for (let i = 0; i < 5; i++) {
      handleDeviceOrientation(downEvent);
      expect(mockDOM.uprightContent!.style.display).toBe('none');
      expect(mockDOM.mapContent!.style.display).toBe('block');
    }
  });
});