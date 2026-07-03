import { beforeEach, describe, expect, it } from "vitest";
import {
	BUILT_IN_COURSES,
	createDemoCourse,
	decodeCourseShare,
	deleteCustomCourse,
	encodeCourseShare,
	getCourseById,
	isValidCourse,
	listCustomCourses,
	saveCustomCourse,
} from "./courses.ts";
import { distanceMeters } from "./geo.ts";
import type { Course } from "./types.ts";

const sampleCourse: Course = {
	id: "test-course",
	name: "Test Course",
	holes: [
		{
			number: 1,
			par: 3,
			tee: { lat: 37.77, lng: -122.49 },
			basket: { lat: 37.771, lng: -122.491 },
		},
	],
};

beforeEach(() => {
	localStorage.clear();
});

describe("BUILT_IN_COURSES", () => {
	it("are all valid courses with plausible hole lengths", () => {
		for (const course of BUILT_IN_COURSES) {
			expect(isValidCourse(course)).toBe(true);
			for (const hole of course.holes) {
				const length = distanceMeters(hole.tee, hole.basket);
				expect(length).toBeGreaterThan(20);
				expect(length).toBeLessThan(300);
			}
		}
	});
});

describe("createDemoCourse", () => {
	it("generates a valid course near the given center", () => {
		const center = { lat: 51.5074, lng: -0.1278 };
		const course = createDemoCourse(center);
		expect(isValidCourse(course)).toBe(true);
		expect(course.holes.length).toBeGreaterThanOrEqual(3);
		for (const hole of course.holes) {
			expect(distanceMeters(center, hole.tee)).toBeLessThan(200);
			expect(distanceMeters(center, hole.basket)).toBeLessThan(200);
			expect(distanceMeters(hole.tee, hole.basket)).toBeGreaterThan(10);
		}
	});
});

describe("isValidCourse", () => {
	it("accepts a well-formed course", () => {
		expect(isValidCourse(sampleCourse)).toBe(true);
	});

	it("rejects malformed values", () => {
		expect(isValidCourse(null)).toBe(false);
		expect(isValidCourse("course")).toBe(false);
		expect(isValidCourse({ ...sampleCourse, holes: [] })).toBe(false);
		expect(isValidCourse({ ...sampleCourse, name: "" })).toBe(false);
		expect(
			isValidCourse({
				...sampleCourse,
				holes: [{ number: 1, par: 3, tee: { lat: 91, lng: 0 } }],
			}),
		).toBe(false);
	});

	it("rejects non-finite, fractional, and duplicate hole values", () => {
		expect(
			isValidCourse({
				...sampleCourse,
				holes: [{ ...sampleCourse.holes[0], par: Number.POSITIVE_INFINITY }],
			}),
		).toBe(false);
		expect(
			isValidCourse({
				...sampleCourse,
				holes: [{ ...sampleCourse.holes[0], number: 1.5 }],
			}),
		).toBe(false);
		expect(
			isValidCourse({
				...sampleCourse,
				holes: [
					sampleCourse.holes[0],
					{
						...sampleCourse.holes[0],
						par: 4,
					},
				],
			}),
		).toBe(false);
	});
});

describe("custom course storage", () => {
	it("saves, lists, and deletes courses", () => {
		expect(listCustomCourses()).toEqual([]);
		saveCustomCourse(sampleCourse);
		expect(listCustomCourses()).toHaveLength(1);
		expect(getCourseById("test-course")?.name).toBe("Test Course");

		deleteCustomCourse("test-course");
		expect(listCustomCourses()).toEqual([]);
		expect(getCourseById("test-course")).toBeNull();
	});

	it("replaces a course with the same id instead of duplicating", () => {
		saveCustomCourse(sampleCourse);
		saveCustomCourse({ ...sampleCourse, name: "Renamed" });
		const courses = listCustomCourses();
		expect(courses).toHaveLength(1);
		expect(courses[0].name).toBe("Renamed");
	});

	it("ignores corrupted stored data", () => {
		localStorage.setItem("discgolf.customCourses", "not json");
		expect(listCustomCourses()).toEqual([]);
		localStorage.setItem("discgolf.customCourses", JSON.stringify([{}, 1]));
		expect(listCustomCourses()).toEqual([]);
	});
});

describe("course sharing", () => {
	it("round-trips a course through encode/decode", () => {
		const code = encodeCourseShare(sampleCourse);
		expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
		const decoded = decodeCourseShare(code);
		expect(decoded).not.toBeNull();
		expect(decoded?.name).toBe(sampleCourse.name);
		expect(decoded?.holes).toEqual(sampleCourse.holes);
		// Imported courses get a fresh id to avoid collisions
		expect(decoded?.id).not.toBe(sampleCourse.id);
	});

	it("round-trips large course share payloads without argument spreading", () => {
		const largeCourse: Course = {
			...sampleCourse,
			name: "Large ".repeat(20_000),
		};

		const decoded = decodeCourseShare(encodeCourseShare(largeCourse));

		expect(decoded?.name).toBe(largeCourse.name);
	});

	it("decodes share codes after restoring stripped padding", () => {
		const base64 = btoa(JSON.stringify(sampleCourse));
		const unpaddedUrlCode = base64
			.replaceAll("+", "-")
			.replaceAll("/", "_")
			.replace(/=+$/, "");

		expect(decodeCourseShare(unpaddedUrlCode)?.name).toBe(sampleCourse.name);
	});

	it("returns null for garbage input", () => {
		expect(decodeCourseShare("not a code!!!")).toBeNull();
		expect(decodeCourseShare("")).toBeNull();
		expect(decodeCourseShare(btoa('{"id":"x"}'))).toBeNull();
	});
});
