import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MapGame DeviceOrientationEvent Logic', () => {
  let isDeviceUpright = false;
  
  // This mimics the handleDeviceOrientation function from MapGame.svelte
  const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta !== null) {
      isDeviceUpright = event.beta < 45;
    }
  };

  beforeEach(() => {
    isDeviceUpright = false;
  });

  it('should set isDeviceUpright to true when beta < 45 (device upright)', () => {
    const event = new DeviceOrientationEvent('deviceorientation', {
      beta: 30,
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    handleDeviceOrientation(event);

    expect(isDeviceUpright).toBe(true);
  });

  it('should set isDeviceUpright to false when beta >= 45 (device pointing down)', () => {
    const event = new DeviceOrientationEvent('deviceorientation', {
      beta: 60,
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    handleDeviceOrientation(event);

    expect(isDeviceUpright).toBe(false);
  });

  it('should set isDeviceUpright to false when beta equals exactly 45', () => {
    const event = new DeviceOrientationEvent('deviceorientation', {
      beta: 45,
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    handleDeviceOrientation(event);

    expect(isDeviceUpright).toBe(false);
  });

  it('should not change isDeviceUpright when beta is null', () => {
    const initialValue = isDeviceUpright;
    
    const event = new DeviceOrientationEvent('deviceorientation', {
      beta: null,
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    handleDeviceOrientation(event);

    expect(isDeviceUpright).toBe(initialValue);
  });

  it('should handle extreme beta values correctly', () => {
    // Test very upright position
    let event = new DeviceOrientationEvent('deviceorientation', {
      beta: -30, // Device tilted backwards
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    handleDeviceOrientation(event);
    expect(isDeviceUpright).toBe(true);

    // Test very downward position
    event = new DeviceOrientationEvent('deviceorientation', {
      beta: 90, // Device pointing straight down
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    handleDeviceOrientation(event);
    expect(isDeviceUpright).toBe(false);
  });

  it('should handle boundary values correctly', () => {
    // Test just below threshold
    let event = new DeviceOrientationEvent('deviceorientation', {
      beta: 44.9,
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    handleDeviceOrientation(event);
    expect(isDeviceUpright).toBe(true);

    // Test just above threshold
    event = new DeviceOrientationEvent('deviceorientation', {
      beta: 45.1,
      alpha: 0,
      gamma: 0,
      absolute: false,
    });

    handleDeviceOrientation(event);
    expect(isDeviceUpright).toBe(false);
  });
});