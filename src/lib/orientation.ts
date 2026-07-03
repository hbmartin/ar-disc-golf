/**
 * Device-orientation helpers: AR/map view switching with hysteresis,
 * compass heading extraction, and the iOS permission dance.
 */

/** Tilt (beta, degrees) above which we enter AR view. */
export const AR_ENTER_BETA = 55;
/** Tilt (beta, degrees) below which we exit AR view. */
export const AR_EXIT_BETA = 35;

/**
 * Next value of the "device upright / AR active" flag with hysteresis:
 * enter AR only above AR_ENTER_BETA, leave only below AR_EXIT_BETA, so the
 * view doesn't flicker when the device hovers around a single threshold.
 */
export function nextUprightState(
	beta: number | null,
	current: boolean,
): boolean {
	if (beta === null) {
		return current;
	}
	if (current) {
		return beta >= AR_EXIT_BETA;
	}
	return beta > AR_ENTER_BETA;
}

interface CompassOrientationEvent {
	alpha: number | null;
	absolute?: boolean;
	/** iOS Safari only: degrees clockwise from north. */
	webkitCompassHeading?: number;
}

/**
 * Compass heading in degrees clockwise from north, or null if unavailable.
 * Prefers iOS's webkitCompassHeading; falls back to (360 - alpha), which is
 * only trustworthy when the event is absolute.
 */
export function compassHeading(event: CompassOrientationEvent): number | null {
	if (
		typeof event.webkitCompassHeading === "number" &&
		!Number.isNaN(event.webkitCompassHeading)
	) {
		return event.webkitCompassHeading;
	}
	if (event.alpha === null || event.absolute !== true) {
		return null;
	}
	return (360 - event.alpha + 360) % 360;
}

interface OrientationEventStatic {
	requestPermission?: () => Promise<"granted" | "denied">;
}

/** Whether this platform (iOS 13+) requires an explicit orientation permission. */
export function needsOrientationPermission(): boolean {
	return (
		typeof window !== "undefined" &&
		"DeviceOrientationEvent" in window &&
		typeof (DeviceOrientationEvent as unknown as OrientationEventStatic)
			.requestPermission === "function"
	);
}

/**
 * Request device-orientation access. Resolves true when events will fire:
 * either permission was granted or the platform never required it.
 * Must be called from a user gesture on iOS.
 */
export async function requestOrientationPermission(): Promise<boolean> {
	if (!needsOrientationPermission()) {
		return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
	}
	try {
		const requestPermission = (
			DeviceOrientationEvent as unknown as OrientationEventStatic
		).requestPermission;
		const permission = await requestPermission?.();
		return permission === "granted";
	} catch (error) {
		console.error("Error requesting device orientation permission:", error);
		return false;
	}
}
