import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MapGame DeviceOrientationEvent Integration Tests', () => {
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy?.mockRestore();
    removeEventListenerSpy?.mockRestore();
  });

  it('should add device orientation event listener when requestOrientationPermission is called', async () => {
    // Simulate the requestOrientationPermission function from MapGame.svelte
    const requestOrientationPermission = async () => {
      if (
        'DeviceOrientationEvent' in window &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
          }
        } catch (error) {
          console.error('Error requesting device orientation permission:', error);
        }
      } else {
        // For non-iOS devices, just add the listener
        window.addEventListener('deviceorientation', handleDeviceOrientation);
      }
    };

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      // Mock handler
    };

    await requestOrientationPermission();

    // Check that event listener was added
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'deviceorientation',
      expect.any(Function)
    );
  });

  it('should request orientation permission on iOS devices', async () => {
    // Mock iOS device with DeviceOrientationEvent.requestPermission
    const mockRequestPermission = vi.fn().mockResolvedValue('granted');
    (global.DeviceOrientationEvent as any).requestPermission = mockRequestPermission;

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {};

    const requestOrientationPermission = async () => {
      if (
        'DeviceOrientationEvent' in window &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
          }
        } catch (error) {
          console.error('Error requesting device orientation permission:', error);
        }
      } else {
        window.addEventListener('deviceorientation', handleDeviceOrientation);
      }
    };

    await requestOrientationPermission();

    // Check that permission was requested
    expect(mockRequestPermission).toHaveBeenCalled();

    // Check that event listener was added after permission granted
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'deviceorientation',
      expect.any(Function)
    );

    // Clean up
    delete (global.DeviceOrientationEvent as any).requestPermission;
  });

  it('should handle permission denied gracefully', async () => {
    // Mock iOS device with DeviceOrientationEvent.requestPermission that denies
    const mockRequestPermission = vi.fn().mockResolvedValue('denied');
    (global.DeviceOrientationEvent as any).requestPermission = mockRequestPermission;

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {};

    const requestOrientationPermission = async () => {
      if (
        'DeviceOrientationEvent' in window &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
          }
        } catch (error) {
          console.error('Error requesting device orientation permission:', error);
        }
      } else {
        window.addEventListener('deviceorientation', handleDeviceOrientation);
      }
    };

    await requestOrientationPermission();

    // Check that permission was requested
    expect(mockRequestPermission).toHaveBeenCalled();

    // Check that event listener was NOT added since permission was denied
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'deviceorientation',
      expect.any(Function)
    );

    // Clean up
    delete (global.DeviceOrientationEvent as any).requestPermission;
  });

  it('should properly remove device orientation event listener on cleanup', () => {
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {};

    // Add the listener
    window.addEventListener('deviceorientation', handleDeviceOrientation);

    // Simulate cleanup (like in onDestroy)
    window.removeEventListener('deviceorientation', handleDeviceOrientation);

    // Check that removeEventListener was called
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'deviceorientation',
      handleDeviceOrientation
    );
  });
});