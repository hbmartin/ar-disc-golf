import { beforeEach, describe, expect, it } from "vitest";
import {
	clearCurrentGame,
	completeHole,
	createGame,
	formatScoreVsPar,
	getCurrentGameId,
	listRoundHistory,
	loadGame,
	recordThrow,
	totalPar,
	totalStrokes,
	undoThrow,
} from "./gameState.ts";
import type { Course } from "./types.ts";

const course: Course = {
	id: "test-course",
	name: "Test Course",
	holes: [
		{
			number: 1,
			par: 3,
			tee: { lat: 37.77, lng: -122.49 },
			basket: { lat: 37.771, lng: -122.491 },
		},
		{
			number: 2,
			par: 4,
			tee: { lat: 37.771, lng: -122.491 },
			basket: { lat: 37.772, lng: -122.492 },
		},
	],
};

beforeEach(() => {
	localStorage.clear();
});

describe("createGame / loadGame", () => {
	it("creates a persisted session with zeroed scores", () => {
		const session = createGame(course);
		expect(session.strokes).toEqual([0, 0]);
		expect(session.currentHoleIndex).toBe(0);
		expect(session.completedAt).toBeNull();
		expect(getCurrentGameId()).toBe(session.id);

		const loaded = loadGame(session.id);
		expect(loaded).toEqual(session);
	});

	it("returns null for unknown or corrupted sessions", () => {
		expect(loadGame("nope")).toBeNull();
		localStorage.setItem("discgolf.game.bad", '{"id":"bad"}');
		expect(loadGame("bad")).toBeNull();
	});
});

describe("throw tracking", () => {
	it("records and undoes throws on the current hole", () => {
		let session = createGame(course);
		session = recordThrow(session);
		session = recordThrow(session);
		expect(session.strokes).toEqual([2, 0]);

		session = undoThrow(session);
		expect(session.strokes).toEqual([1, 0]);

		// Undo never goes below zero
		session = undoThrow(session);
		session = undoThrow(session);
		expect(session.strokes).toEqual([0, 0]);

		// Changes are persisted
		expect(loadGame(session.id)?.strokes).toEqual([0, 0]);
	});
});

describe("completeHole", () => {
	it("advances to the next hole", () => {
		let session = createGame(course);
		session = recordThrow(session);
		session = completeHole(session);
		expect(session.currentHoleIndex).toBe(1);
		expect(session.completedAt).toBeNull();
	});

	it("completes the round on the last hole and records history", () => {
		let session = createGame(course);
		session = recordThrow(session);
		session = completeHole(session);
		session = recordThrow(session);
		session = recordThrow(session);
		session = completeHole(session);

		expect(session.completedAt).not.toBeNull();
		expect(totalStrokes(session)).toBe(3);

		const history = listRoundHistory();
		expect(history).toHaveLength(1);
		expect(history[0]).toMatchObject({
			id: session.id,
			courseName: "Test Course",
			holeCount: 2,
			totalStrokes: 3,
			totalPar: 7,
		});
	});

	it("does not duplicate history when completed twice", () => {
		let session = createGame(course);
		session = completeHole(session);
		session = completeHole(session);
		completeHole(session);
		expect(listRoundHistory()).toHaveLength(1);
	});
});

describe("score helpers", () => {
	it("sums par and strokes", () => {
		expect(totalPar(course)).toBe(7);
		let session = createGame(course);
		session = recordThrow(session);
		expect(totalStrokes(session)).toBe(1);
	});

	it("formats score vs par like a leaderboard", () => {
		expect(formatScoreVsPar(7, 7)).toBe("E");
		expect(formatScoreVsPar(9, 7)).toBe("+2");
		expect(formatScoreVsPar(5, 7)).toBe("-2");
	});
});

describe("clearCurrentGame", () => {
	it("removes the session and current-game pointer", () => {
		const session = createGame(course);
		clearCurrentGame(session.id);
		expect(getCurrentGameId()).toBeNull();
		expect(loadGame(session.id)).toBeNull();
	});
});
