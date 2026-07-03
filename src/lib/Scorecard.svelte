<script lang="ts">
import {
	formatScoreVsPar,
	playedPar,
	totalPar,
	totalStrokes,
} from "./gameState.ts";
import { distanceMeters, formatDistance } from "./geo.ts";
import type { GameSession } from "./types.ts";

const { session }: { session: GameSession } = $props();

const strokesTotal = $derived(totalStrokes(session));
const parTotal = $derived(
	session.completedAt === null ? playedPar(session) : totalPar(session.course),
);
</script>

<div class="scorecard">
	<table>
		<thead>
			<tr>
				<th>Hole</th>
				<th>Length</th>
				<th>Par</th>
				<th>Strokes</th>
				<th>+/-</th>
			</tr>
		</thead>
		<tbody>
			{#each session.course.holes as hole, i (`${hole.number}-${i}`)}
				<tr
					class:current={i === session.currentHoleIndex && !session.completedAt}
				>
					<td>{hole.number}</td>
					<td>{formatDistance(distanceMeters(hole.tee, hole.basket))}</td>
					<td>{hole.par}</td>
					<td>{session.strokes[i] > 0 ? session.strokes[i] : "–"}</td>
					<td>
						{session.strokes[i] > 0
							? formatScoreVsPar(session.strokes[i], hole.par)
							: ""}
					</td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr>
				<td>Total</td>
				<td></td>
				<td>{parTotal}</td>
				<td>{strokesTotal}</td>
				<td>{formatScoreVsPar(strokesTotal, parTotal)}</td>
			</tr>
		</tfoot>
	</table>
</div>

<style>
.scorecard {
	overflow-x: auto;
}

table {
	width: 100%;
	border-collapse: collapse;
	color: #2d3748;
	font-size: 0.95em;
}

th,
td {
	padding: 8px 12px;
	text-align: center;
	border-bottom: 1px solid #e2e8f0;
}

th {
	font-weight: 600;
	color: #4a5568;
	text-transform: uppercase;
	font-size: 0.75em;
	letter-spacing: 0.05em;
}

tr.current {
	background: rgba(79, 172, 254, 0.12);
	font-weight: 600;
}

tfoot td {
	font-weight: 700;
	border-top: 2px solid #cbd5e0;
	border-bottom: none;
}
</style>
