export interface LatLng {
	lat: number;
	lng: number;
}

export interface Hole {
	number: number;
	par: number;
	tee: LatLng;
	basket: LatLng;
}

export interface Course {
	id: string;
	name: string;
	description?: string;
	holes: Hole[];
	/** True for courses bundled with the app, false for user-created ones. */
	builtIn?: boolean;
}

export interface GameSession {
	id: string;
	/** Snapshot of the course so the game survives course edits/deletion. */
	course: Course;
	currentHoleIndex: number;
	/** Strokes per hole, parallel to course.holes. 0 = not started. */
	strokes: number[];
	startedAt: number;
	completedAt: number | null;
}

export interface RoundSummary {
	id: string;
	courseName: string;
	holeCount: number;
	totalStrokes: number;
	totalPar: number;
	startedAt: number;
	completedAt: number;
}
