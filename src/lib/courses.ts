import { destinationPoint } from "./geo.ts";
import { readJson, writeJson } from "./storage.ts";
import type { Course, Hole, LatLng } from "./types.ts";
import { generateId } from "./utils.ts";

const CUSTOM_COURSES_KEY = "discgolf.customCourses";

/** Id of the on-the-fly demo course generated at the player's location. */
export const DEMO_COURSE_ID = "demo-here";

export const BUILT_IN_COURSES: Course[] = [
	{
		id: "ggp-sf",
		name: "Golden Gate Park (short 3)",
		description: "Three short holes near the Golden Gate Park course, SF.",
		builtIn: true,
		holes: [
			{
				number: 1,
				par: 3,
				tee: { lat: 37.77143, lng: -122.49468 },
				basket: { lat: 37.77198, lng: -122.49417 },
			},
			{
				number: 2,
				par: 3,
				tee: { lat: 37.77198, lng: -122.49417 },
				basket: { lat: 37.77162, lng: -122.49325 },
			},
			{
				number: 3,
				par: 3,
				tee: { lat: 37.77162, lng: -122.49325 },
				basket: { lat: 37.77105, lng: -122.4939 },
			},
		],
	},
];

/**
 * Generate a playable 3-hole practice course around wherever the player is
 * standing, so the game works anywhere without predefined course data.
 */
export function createDemoCourse(center: LatLng): Course {
	const layout = [
		{ teeBearing: 0, basketBearing: 45, teeDist: 20, basketDist: 80 },
		{ teeBearing: 45, basketBearing: 135, teeDist: 80, basketDist: 90 },
		{ teeBearing: 135, basketBearing: 250, teeDist: 90, basketDist: 60 },
	];
	const holes: Hole[] = layout.map((leg, i) => ({
		number: i + 1,
		par: 3,
		tee: destinationPoint(center, leg.teeBearing, leg.teeDist),
		basket: destinationPoint(center, leg.basketBearing, leg.basketDist),
	}));
	return {
		id: DEMO_COURSE_ID,
		name: "Practice round (right here)",
		description: "Three practice holes generated around your location.",
		builtIn: true,
		holes,
	};
}

function isLatLng(value: unknown): value is LatLng {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const point = value as Record<string, unknown>;
	return (
		typeof point.lat === "number" &&
		Number.isFinite(point.lat) &&
		Math.abs(point.lat) <= 90 &&
		typeof point.lng === "number" &&
		Number.isFinite(point.lng) &&
		Math.abs(point.lng) <= 180
	);
}

function isHole(value: unknown): value is Hole {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const hole = value as Record<string, unknown>;
	return (
		typeof hole.number === "number" &&
		typeof hole.par === "number" &&
		hole.par >= 1 &&
		isLatLng(hole.tee) &&
		isLatLng(hole.basket)
	);
}

export function isValidCourse(value: unknown): value is Course {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const course = value as Record<string, unknown>;
	return (
		typeof course.id === "string" &&
		course.id.length > 0 &&
		typeof course.name === "string" &&
		course.name.length > 0 &&
		Array.isArray(course.holes) &&
		course.holes.length > 0 &&
		course.holes.every(isHole)
	);
}

export function listCustomCourses(): Course[] {
	const stored = readJson<unknown[]>(CUSTOM_COURSES_KEY);
	if (!Array.isArray(stored)) {
		return [];
	}
	return stored.filter(isValidCourse);
}

export function saveCustomCourse(course: Course): boolean {
	const existing = listCustomCourses().filter((c) => c.id !== course.id);
	return writeJson(CUSTOM_COURSES_KEY, [
		...existing,
		{ ...course, builtIn: false },
	]);
}

export function deleteCustomCourse(courseId: string): void {
	writeJson(
		CUSTOM_COURSES_KEY,
		listCustomCourses().filter((c) => c.id !== courseId),
	);
}

export function getCourseById(courseId: string): Course | null {
	return (
		BUILT_IN_COURSES.find((c) => c.id === courseId) ??
		listCustomCourses().find((c) => c.id === courseId) ??
		null
	);
}

/** Encode a course as a compact base64url share code. */
export function encodeCourseShare(course: Course): string {
	const json = JSON.stringify(course);
	const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
	return base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/** Decode a share code back into a course; null if malformed or invalid. */
export function decodeCourseShare(code: string): Course | null {
	try {
		const base64 = code.replaceAll("-", "+").replaceAll("_", "/");
		const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
		const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
		if (!isValidCourse(parsed)) {
			return null;
		}
		// Re-key imported courses so they never collide with existing ids
		return { ...parsed, id: generateId(), builtIn: false };
	} catch {
		return null;
	}
}
