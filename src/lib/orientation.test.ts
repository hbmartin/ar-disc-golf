import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AR_ENTER_BETA,
	AR_EXIT_BETA,
	compassHeading,
	needsOrientationPermission,
	nextUprightState,
	requestOrientationPermission,
} from "./orientation.ts";

describe("nextUprightState (hysteresis)", () => {
	it("enters AR only above the enter threshold", () => {
		expect(nextUprightState(AR_ENTER_BETA - 1, false)).toBe(false);
		expect(nextUprightState(AR_ENTER_BETA, false)).toBe(false);
		expect(nextUprightState(AR_ENTER_BETA + 1, false)).toBe(true);
	});

	it("exits AR only below the exit threshold", () => {
		expect(nextUprightState(AR_EXIT_BETA + 1, true)).toBe(true);
		expect(nextUprightState(AR_EXIT_BETA, true)).toBe(true);
		expect(nextUprightState(AR_EXIT_BETA - 1, true)).toBe(false);
	});

	it("does not flicker in the dead zone between thresholds", () => {
		const midway = (AR_ENTER_BETA + AR_EXIT_BETA) / 2;
		expect(nextUprightState(midway, false)).toBe(false);
		expect(nextUprightState(midway, true)).toBe(true);
	});

	it("keeps current state when beta is null", () => {
		expect(nextUprightState(null, true)).toBe(true);
		expect(nextUprightState(null, false)).toBe(false);
	});

	it("handles extreme tilts", () => {
		expect(nextUprightState(90, false)).toBe(true);
		expect(nextUprightState(-30, true)).toBe(false);
	});
});

describe("compassHeading", () => {
	it("prefers webkitCompassHeading when present", () => {
		expect(compassHeading({ alpha: 100, webkitCompassHeading: 42 })).toBe(42);
	});

	it("derives heading from absolute alpha (counterclockwise) otherwise", () => {
		expect(compassHeading({ alpha: 90, absolute: true })).toBe(270);
		expect(compassHeading({ alpha: 0, absolute: true })).toBe(0);
	});

	it("ignores relative alpha readings", () => {
		expect(compassHeading({ alpha: 90, absolute: false })).toBeNull();
		expect(compassHeading({ alpha: 90 })).toBeNull();
	});

	it("returns null when no data is available", () => {
		expect(compassHeading({ alpha: null })).toBeNull();
	});

	it("ignores NaN webkitCompassHeading", () => {
		expect(
			compassHeading({
				alpha: 90,
				absolute: true,
				webkitCompassHeading: Number.NaN,
			}),
		).toBe(270);
	});
});

describe("requestOrientationPermission", () => {
	interface OrientationStatic {
		requestPermission?: () => Promise<"granted" | "denied">;
	}
	const orientationStatic =
		DeviceOrientationEvent as unknown as OrientationStatic;

	afterEach(() => {
		orientationStatic.requestPermission = undefined;
	});

	it("reports no permission needed on non-iOS platforms", () => {
		expect(needsOrientationPermission()).toBe(false);
	});

	it("reports permission needed when requestPermission is present", () => {
		orientationStatic.requestPermission = vi.fn().mockResolvedValue("granted");
		expect(needsOrientationPermission()).toBe(true);
	});

	it("resolves true without prompting on non-iOS platforms", async () => {
		await expect(requestOrientationPermission()).resolves.toBe(true);
	});

	it("resolves true when iOS grants permission", async () => {
		orientationStatic.requestPermission = vi.fn().mockResolvedValue("granted");
		await expect(requestOrientationPermission()).resolves.toBe(true);
		expect(orientationStatic.requestPermission).toHaveBeenCalled();
	});

	it("resolves false when iOS denies permission", async () => {
		orientationStatic.requestPermission = vi.fn().mockResolvedValue("denied");
		await expect(requestOrientationPermission()).resolves.toBe(false);
	});

	it("resolves false when the prompt throws", async () => {
		orientationStatic.requestPermission = vi
			.fn()
			.mockRejectedValue(new Error("not allowed"));
		await expect(requestOrientationPermission()).resolves.toBe(false);
	});
});
