<script lang="ts">
import { push } from "svelte-spa-router";
import LocationService from "./LocationService.svelte";
import {
	BUILT_IN_COURSES,
	DEMO_COURSE_ID,
	createDemoCourse,
	decodeCourseShare,
	deleteCustomCourse,
	listCustomCourses,
	saveCustomCourse,
} from "./courses.ts";
import {
	createGame,
	formatScoreVsPar,
	getCurrentGameId,
	listRoundHistory,
	loadGame,
} from "./gameState.ts";
import { distanceMeters, formatDistance } from "./geo.ts";
import { requestOrientationPermission } from "./orientation.ts";
import type { Course } from "./types.ts";

let locationServiceRef: LocationService | undefined = $state();

let customCourses = $state(listCustomCourses());
let selectedCourseId = $state(DEMO_COURSE_ID);
let importCode = $state("");
let importMessage: string | null = $state(null);
let importMessageKind: "success" | "error" | null = $state(null);
let roundHistory = $state(listRoundHistory());

const resumableGame = $derived.by(() => {
	const currentId = getCurrentGameId();
	if (!currentId) return null;
	const session = loadGame(currentId);
	return session && session.completedAt === null ? session : null;
});

const courseLength = (course: Course): number =>
	course.holes.reduce(
		(sum, hole) => sum + distanceMeters(hole.tee, hole.basket),
		0,
	);

const startGame = async () => {
	// Must happen inside the click gesture for iOS to show the prompt
	await requestOrientationPermission();

	let course: Course | null = null;
	if (selectedCourseId === DEMO_COURSE_ID) {
		const here = locationServiceRef?.location;
		course = createDemoCourse(
			here
				? { lat: here.latitude, lng: here.longitude }
				: // No GPS fix: anchor the practice course at the first built-in
					// course's tee so demo mode still has somewhere to play
					BUILT_IN_COURSES[0].holes[0].tee,
		);
	} else {
		course =
			BUILT_IN_COURSES.find((c) => c.id === selectedCourseId) ??
			customCourses.find((c) => c.id === selectedCourseId) ??
			null;
	}
	if (!course) return;

	const session = createGame(course);
	push(`/game/${session.id}`);
};

const resumeGame = () => {
	if (resumableGame) {
		push(`/game/${resumableGame.id}`);
	}
};

const importCourse = () => {
	const course = decodeCourseShare(importCode.trim());
	if (!course) {
		importMessage = "That share code isn't valid.";
		importMessageKind = "error";
		return;
	}
	if (!saveCustomCourse(course)) {
		importMessage = "Could not save that course. Storage may be full.";
		importMessageKind = "error";
		return;
	}
	customCourses = listCustomCourses();
	selectedCourseId = course.id;
	importCode = "";
	importMessage = `Imported "${course.name}".`;
	importMessageKind = "success";
};

const removeCourse = (courseId: string) => {
	deleteCustomCourse(courseId);
	customCourses = listCustomCourses();
	if (selectedCourseId === courseId) {
		selectedCourseId = DEMO_COURSE_ID;
	}
};
</script>

<main>
	<header>
		<h1>🥏 AR Disc Golf</h1>
		<p class="subtitle">Augmented Reality Disc Golf Experience</p>
	</header>

	<div class="content">
		{#if resumableGame}
			<section class="resume-section">
				<h2>⏱️ Game in Progress</h2>
				<p>
					Hole {resumableGame.currentHoleIndex + 1} of
					{resumableGame.course.holes.length} on {resumableGame.course.name}
				</p>
				<button class="start-game-btn" onclick={resumeGame}>
					▶️ Resume Round
				</button>
			</section>
		{/if}

		<section class="course-section">
			<h2>⛳ Choose a Course</h2>
			<div class="course-list">
				<label
					class="course-option"
					class:selected={selectedCourseId === DEMO_COURSE_ID}
				>
					<input
						type="radio"
						name="course"
						value={DEMO_COURSE_ID}
						bind:group={selectedCourseId}
					/>
					<div class="course-info">
						<span class="course-name">🧪 Practice round (right here)</span>
						<span class="course-meta">
							3 holes generated around your current location
						</span>
					</div>
				</label>

				{#each BUILT_IN_COURSES as course (course.id)}
					<label
						class="course-option"
						class:selected={selectedCourseId === course.id}
					>
						<input
							type="radio"
							name="course"
							value={course.id}
							bind:group={selectedCourseId}
						/>
						<div class="course-info">
							<span class="course-name">{course.name}</span>
							<span class="course-meta">
								{course.holes.length} holes ·
								{formatDistance(courseLength(course))}
							</span>
						</div>
					</label>
				{/each}

				{#each customCourses as course (course.id)}
					<label
						class="course-option"
						class:selected={selectedCourseId === course.id}
					>
						<input
							type="radio"
							name="course"
							value={course.id}
							bind:group={selectedCourseId}
						/>
						<div class="course-info">
							<span class="course-name">{course.name}</span>
							<span class="course-meta">
								{course.holes.length} holes ·
								{formatDistance(courseLength(course))} · custom
							</span>
						</div>
						<button
							class="delete-course-btn"
							title="Delete course"
							onclick={(e) => {
								e.preventDefault();
								removeCourse(course.id);
							}}
						>
							🗑
						</button>
					</label>
				{/each}
			</div>

			<div class="location-actions">
				<button onclick={startGame} class="start-game-btn">
					🎮 Start Game
				</button>
				<a class="create-link" href="#/create">✏️ Create your own course</a>
			</div>

			<details class="import-details">
				<summary>Import a shared course</summary>
				<div class="import-row">
					<input
						type="text"
						placeholder="Paste share code"
						bind:value={importCode}
					/>
					<button onclick={importCourse} disabled={!importCode.trim()}>
						Import
					</button>
				</div>
				{#if importMessage}
					<p
						class="import-message"
						class:success={importMessageKind === "success"}
						class:error={importMessageKind === "error"}
					>
						{importMessage}
					</p>
				{/if}
			</details>
		</section>

		<section class="location-section">
			<h2>📍 Your Location</h2>
			<LocationService bind:this={locationServiceRef} />
		</section>

		{#if roundHistory.length > 0}
			<section class="history-section">
				<h2>📊 Recent Rounds</h2>
				<ul class="history-list">
					{#each roundHistory as round (round.id)}
						<li>
							<span class="history-course">{round.courseName}</span>
							<span class="history-score">
								{round.totalStrokes} throws ·
								{formatScoreVsPar(round.totalStrokes, round.totalPar)}
							</span>
							<span class="history-date">
								{new Date(round.completedAt).toLocaleDateString()}
							</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="info-section">
			<h2>ℹ️ How It Works</h2>
			<div class="info-content">
				<p>
					Pick a course (or generate a practice round wherever you're standing),
					then follow the map from tee to basket. Hold your phone up to see an
					AR arrow pointing at the basket; hold it flat to see the map. Tap
					Throw after each throw, and finish the hole when you hole out.
				</p>
				<ul>
					<li>🗺️ Map shows tees, baskets, fairway lines, and distance rings</li>
					<li>📱 AR arrow and live distance guide you to the basket</li>
					<li>📊 Scorecard tracks throws vs par, with round history</li>
					<li>🔒 Privacy-focused — location data stays on your device</li>
				</ul>
			</div>
		</section>
	</div>
</main>

<style>
main {
	max-width: 1200px;
	margin: 0 auto;
	padding: 20px;
	font-family:
		-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

header {
	text-align: center;
	margin-bottom: 40px;
	padding: 40px 20px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 20px;
	color: white;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

header h1 {
	margin: 0 0 10px 0;
	font-size: 3em;
	font-weight: 700;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
	margin: 0;
	font-size: 1.2em;
	opacity: 0.9;
	font-weight: 300;
}

.content {
	display: flex;
	flex-direction: column;
	gap: 40px;
}

section {
	background: white;
	border-radius: 16px;
	padding: 30px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
	border: 1px solid #e1e5e9;
}

section h2 {
	margin: 0 0 25px 0;
	font-size: 1.8em;
	color: #2d3748;
	font-weight: 600;
}

.resume-section p {
	color: #4a5568;
	margin: 0 0 15px 0;
}

.course-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.course-option {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 16px;
	border: 2px solid #e2e8f0;
	border-radius: 12px;
	cursor: pointer;
	transition: border-color 0.2s ease;
}

.course-option.selected {
	border-color: #667eea;
	background: rgba(102, 126, 234, 0.06);
}

.course-info {
	display: flex;
	flex-direction: column;
	gap: 2px;
	flex: 1;
	text-align: left;
}

.course-name {
	font-weight: 600;
	color: #2d3748;
}

.course-meta {
	font-size: 0.85em;
	color: #718096;
}

.delete-course-btn {
	background: transparent;
	border: none;
	cursor: pointer;
	font-size: 1.1em;
	padding: 6px;
}

.location-actions {
	margin-top: 20px;
	text-align: center;
	display: flex;
	flex-direction: column;
	gap: 12px;
	align-items: center;
}

.start-game-btn {
	background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
	border: none;
	color: white;
	padding: 15px 30px;
	border-radius: 25px;
	cursor: pointer;
	font-size: 1.1em;
	font-weight: 600;
	transition: all 0.3s ease;
	box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
	min-width: 160px;
}

.start-game-btn:hover {
	transform: translateY(-2px);
	box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
}

.create-link {
	color: #667eea;
	font-weight: 600;
}

.import-details {
	margin-top: 20px;
	color: #4a5568;
}

.import-details summary {
	cursor: pointer;
	font-weight: 600;
}

.import-row {
	display: flex;
	gap: 10px;
	margin-top: 12px;
}

.import-row input {
	flex: 1;
	padding: 10px 14px;
	border: 2px solid #e2e8f0;
	border-radius: 10px;
	font-size: 0.95em;
}

.import-row button {
	background: #667eea;
	color: white;
	border: none;
	border-radius: 10px;
	padding: 10px 18px;
	font-weight: 600;
	cursor: pointer;
}

.import-row button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.import-message {
	margin: 10px 0 0 0;
	font-size: 0.9em;
	color: #4a5568;
}

.import-message.success {
	color: #2f855a;
}

.import-message.error {
	color: #c53030;
}

.history-list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.history-list li {
	display: flex;
	justify-content: space-between;
	gap: 15px;
	padding: 12px 0;
	border-bottom: 1px solid #e2e8f0;
	color: #4a5568;
	flex-wrap: wrap;
}

.history-list li:last-child {
	border-bottom: none;
}

.history-course {
	font-weight: 600;
	color: #2d3748;
}

.info-content p {
	margin: 0 0 20px 0;
	line-height: 1.7;
	color: #4a5568;
	font-size: 1.1em;
	text-align: left;
}

.info-content ul {
	list-style: none;
	padding: 0;
	margin: 0;
	text-align: left;
}

.info-content li {
	padding: 10px 0;
	color: #4a5568;
	font-size: 1.05em;
	border-bottom: 1px solid #e2e8f0;
}

.info-content li:last-child {
	border-bottom: none;
}

@media (max-width: 768px) {
	main {
		padding: 15px;
	}

	header h1 {
		font-size: 2.2em;
	}

	.subtitle {
		font-size: 1em;
	}

	section {
		padding: 20px;
	}
}
</style>
