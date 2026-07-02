import type { LatLng } from "./types.ts";

const EARTH_RADIUS_M = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

/** Great-circle distance between two points in meters (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
	const dLat = toRadians(b.lat - a.lat);
	const dLng = toRadians(b.lng - a.lng);
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h =
		sinLat * sinLat +
		Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinLng * sinLng;
	return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `from` to `to` in degrees clockwise from north, [0, 360). */
export function bearingDegrees(from: LatLng, to: LatLng): number {
	const fromLat = toRadians(from.lat);
	const toLat = toRadians(to.lat);
	const dLng = toRadians(to.lng - from.lng);
	const y = Math.sin(dLng) * Math.cos(toLat);
	const x =
		Math.cos(fromLat) * Math.sin(toLat) -
		Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLng);
	return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

/** Normalize an angle in degrees to [0, 360). */
export function normalizeDegrees(degrees: number): number {
	return ((degrees % 360) + 360) % 360;
}

/**
 * Rotation to apply to an arrow so it points toward a target bearing,
 * given the direction the device is currently facing. Result in [0, 360).
 */
export function relativeBearing(
	bearingToTarget: number,
	deviceHeading: number,
): number {
	return normalizeDegrees(bearingToTarget - deviceHeading);
}

/** Point reached by traveling `distance` meters from `origin` on `bearing` degrees. */
export function destinationPoint(
	origin: LatLng,
	bearing: number,
	distance: number,
): LatLng {
	const angular = distance / EARTH_RADIUS_M;
	const bearingRad = toRadians(bearing);
	const lat1 = toRadians(origin.lat);
	const lng1 = toRadians(origin.lng);
	const lat2 = Math.asin(
		Math.sin(lat1) * Math.cos(angular) +
			Math.cos(lat1) * Math.sin(angular) * Math.cos(bearingRad),
	);
	const lng2 =
		lng1 +
		Math.atan2(
			Math.sin(bearingRad) * Math.sin(angular) * Math.cos(lat1),
			Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
		);
	return { lat: toDegrees(lat2), lng: toDegrees(lng2) };
}

/**
 * GeoJSON polygon ring approximating a circle around `center`.
 * Returns [lng, lat] pairs, closed (first point repeated last).
 */
export function circleRing(
	center: LatLng,
	radiusMeters: number,
	segments = 64,
): [number, number][] {
	const ring: [number, number][] = [];
	for (let i = 0; i <= segments; i++) {
		const point = destinationPoint(center, (i * 360) / segments, radiusMeters);
		ring.push([point.lng, point.lat]);
	}
	return ring;
}

/** Whether `point` is within `radiusMeters` of `center`. */
export function isWithinRadius(
	point: LatLng,
	center: LatLng,
	radiusMeters: number,
): boolean {
	return distanceMeters(point, center) <= radiusMeters;
}

/** Human-readable distance: "42 m" or "1.2 km". */
export function formatDistance(meters: number): string {
	if (meters < 1000) {
		return `${Math.round(meters)} m`;
	}
	return `${(meters / 1000).toFixed(1)} km`;
}
