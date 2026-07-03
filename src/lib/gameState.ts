import { isValidCourse } from "./courses.ts";
import { readJson, removeKey, writeJson } from "./storage.ts";
import type { Course, GameSession, RoundSummary } from "./types.ts";
import { generateId } from "./utils.ts";

const GAME_KEY_PREFIX = "discgolf.game.";
const CURRENT_GAME_KEY = "discgolf.currentGameId";
const ROUND_HISTORY_KEY = "discgolf.roundHistory";
const MAX_HISTORY = 50;

export function createGame(course: Course): GameSession {
	const previousId = getCurrentGameId();
	const session: GameSession = {
		id: generateId(),
		course,
		currentHoleIndex: 0,
		strokes: course.holes.map(() => 0),
		startedAt: Date.now(),
		completedAt: null,
	};
	if (saveGame(session) && writeJson(CURRENT_GAME_KEY, session.id)) {
		if (previousId && previousId !== session.id) {
			removeKey(GAME_KEY_PREFIX + previousId);
		}
	}
	return session;
}

export function saveGame(session: GameSession): boolean {
	return writeJson(GAME_KEY_PREFIX + session.id, session);
}

function isValidSession(value: unknown): value is GameSession {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const session = value as Record<string, unknown>;
	const course = session.course;
	const currentHoleIndex = session.currentHoleIndex;
	const strokes = session.strokes;
	const startedAt = session.startedAt;
	const completedAt = session.completedAt;
	return (
		typeof session.id === "string" &&
		isValidCourse(course) &&
		typeof currentHoleIndex === "number" &&
		Number.isInteger(currentHoleIndex) &&
		currentHoleIndex >= 0 &&
		currentHoleIndex < course.holes.length &&
		Array.isArray(strokes) &&
		strokes.length === course.holes.length &&
		strokes.every((s) => Number.isInteger(s) && s >= 0) &&
		typeof startedAt === "number" &&
		Number.isFinite(startedAt) &&
		(completedAt === null ||
			(typeof completedAt === "number" && Number.isFinite(completedAt)))
	);
}

export function loadGame(gameId: string): GameSession | null {
	const stored = readJson<unknown>(GAME_KEY_PREFIX + gameId);
	return isValidSession(stored) ? stored : null;
}

export function getCurrentGameId(): string | null {
	return readJson<string>(CURRENT_GAME_KEY);
}

export function clearCurrentGame(gameId: string): void {
	if (getCurrentGameId() === gameId) {
		removeKey(CURRENT_GAME_KEY);
	}
	removeKey(GAME_KEY_PREFIX + gameId);
}

/** Record one throw on the current hole. Returns the updated session. */
export function recordThrow(session: GameSession): GameSession {
	const strokes = [...session.strokes];
	strokes[session.currentHoleIndex] += 1;
	const updated = { ...session, strokes };
	saveGame(updated);
	return updated;
}

/** Remove one throw from the current hole (not below zero). */
export function undoThrow(session: GameSession): GameSession {
	const strokes = [...session.strokes];
	strokes[session.currentHoleIndex] = Math.max(
		0,
		strokes[session.currentHoleIndex] - 1,
	);
	const updated = { ...session, strokes };
	saveGame(updated);
	return updated;
}

/**
 * Finish the current hole: advance to the next, or complete the round on the
 * last hole (recording it in round history).
 */
export function completeHole(session: GameSession): GameSession {
	const isLastHole =
		session.currentHoleIndex >= session.course.holes.length - 1;
	const updated: GameSession = isLastHole
		? { ...session, completedAt: Date.now() }
		: { ...session, currentHoleIndex: session.currentHoleIndex + 1 };
	saveGame(updated);
	if (updated.completedAt !== null) {
		appendRoundHistory(updated);
	}
	return updated;
}

export function totalStrokes(session: GameSession): number {
	return session.strokes.reduce((sum, s) => sum + s, 0);
}

export function totalPar(course: Course): number {
	return course.holes.reduce((sum, hole) => sum + hole.par, 0);
}

export function playedPar(session: GameSession): number {
	return session.course.holes.reduce(
		(sum, hole, index) => sum + (session.strokes[index] > 0 ? hole.par : 0),
		0,
	);
}

/** Score relative to par formatted like a leaderboard: "E", "+2", "-1". */
export function formatScoreVsPar(strokes: number, par: number): string {
	const diff = strokes - par;
	if (diff === 0) {
		return "E";
	}
	return diff > 0 ? `+${diff}` : `${diff}`;
}

function appendRoundHistory(session: GameSession): void {
	if (session.completedAt === null) {
		return;
	}
	const summary: RoundSummary = {
		id: session.id,
		courseName: session.course.name,
		holeCount: session.course.holes.length,
		totalStrokes: totalStrokes(session),
		totalPar: totalPar(session.course),
		startedAt: session.startedAt,
		completedAt: session.completedAt,
	};
	const history = listRoundHistory().filter((r) => r.id !== summary.id);
	history.unshift(summary);
	writeJson(ROUND_HISTORY_KEY, history.slice(0, MAX_HISTORY));
}

export function listRoundHistory(): RoundSummary[] {
	const stored = readJson<RoundSummary[]>(ROUND_HISTORY_KEY);
	return Array.isArray(stored) ? stored : [];
}
