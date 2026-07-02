import { describe, expect, it } from "vitest";
import {
	bearingDegrees,
	circleRing,
	destinationPoint,
	distanceMeters,
	formatDistance,
	isWithinRadius,
	normalizeDegrees,
	relativeBearing,
} from "./geo.ts";

const SF = { lat: 37.7749, lng: -122.4194 };

describe("distanceMeters", () => {
	it("returns 0 for identical points", () => {
		expect(distanceMeters(SF, SF)).toBe(0);
	});

	it("computes a known distance (SF to LA ~559 km)", () => {
		const la = { lat: 34.0522, lng: -118.2437 };
		const d = distanceMeters(SF, la);
		expect(d).toBeGreaterThan(550_000);
		expect(d).toBeLessThan(570_000);
	});

	it("is accurate at disc-golf scale (~111 m per 0.001 deg lat)", () => {
		const d = distanceMeters(SF, { lat: SF.lat + 0.001, lng: SF.lng });
		expect(d).toBeGreaterThan(110);
		expect(d).toBeLessThan(112);
	});

	it("is symmetric", () => {
		const b = { lat: 37.78, lng: -122.41 };
		expect(distanceMeters(SF, b)).toBeCloseTo(distanceMeters(b, SF), 6);
	});
});

describe("bearingDegrees", () => {
	it("points north", () => {
		expect(bearingDegrees(SF, { lat: SF.lat + 0.01, lng: SF.lng })).toBeCloseTo(
			0,
			0,
		);
	});

	it("points east", () => {
		expect(bearingDegrees(SF, { lat: SF.lat, lng: SF.lng + 0.01 })).toBeCloseTo(
			90,
			0,
		);
	});

	it("points south", () => {
		expect(bearingDegrees(SF, { lat: SF.lat - 0.01, lng: SF.lng })).toBeCloseTo(
			180,
			0,
		);
	});

	it("points west", () => {
		expect(bearingDegrees(SF, { lat: SF.lat, lng: SF.lng - 0.01 })).toBeCloseTo(
			270,
			0,
		);
	});
});

describe("normalizeDegrees", () => {
	it("wraps negatives into [0, 360)", () => {
		expect(normalizeDegrees(-90)).toBe(270);
		expect(normalizeDegrees(-360)).toBe(0);
	});

	it("wraps values above 360", () => {
		expect(normalizeDegrees(450)).toBe(90);
		expect(normalizeDegrees(360)).toBe(0);
	});
});

describe("relativeBearing", () => {
	it("is 0 when facing the target", () => {
		expect(relativeBearing(45, 45)).toBe(0);
	});

	it("wraps across north", () => {
		// Target at 10°, facing 350° → turn 20° right
		expect(relativeBearing(10, 350)).toBe(20);
	});

	it("returns left turns as large clockwise angles", () => {
		expect(relativeBearing(350, 10)).toBe(340);
	});
});

describe("destinationPoint", () => {
	it("round-trips with distance and bearing", () => {
		const dest = destinationPoint(SF, 45, 100);
		expect(distanceMeters(SF, dest)).toBeCloseTo(100, 0);
		expect(bearingDegrees(SF, dest)).toBeCloseTo(45, 0);
	});
});

describe("circleRing", () => {
	it("produces a closed ring of segments+1 points at the right radius", () => {
		const ring = circleRing(SF, 50, 32);
		expect(ring).toHaveLength(33);
		expect(ring[0]).toEqual(ring[32]);
		for (const [lng, lat] of ring.slice(0, 32)) {
			expect(distanceMeters(SF, { lat, lng })).toBeCloseTo(50, 0);
		}
	});
});

describe("isWithinRadius", () => {
	it("detects arrival at the basket", () => {
		const basket = destinationPoint(SF, 90, 8);
		expect(isWithinRadius(SF, basket, 10)).toBe(true);
		expect(isWithinRadius(SF, basket, 5)).toBe(false);
	});
});

describe("formatDistance", () => {
	it("uses meters under 1 km", () => {
		expect(formatDistance(42.4)).toBe("42 m");
		expect(formatDistance(999)).toBe("999 m");
	});

	it("uses kilometers at and above 1 km", () => {
		expect(formatDistance(1000)).toBe("1.0 km");
		expect(formatDistance(1234)).toBe("1.2 km");
	});
});
