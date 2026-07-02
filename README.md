# 🥏 AR Disc Golf

A mobile web app for playing disc golf with GPS course maps, live scorekeeping, and an augmented-reality arrow that points you at the basket. Built with Svelte 5, TypeScript, Vite, MapLibre GL, and A-Frame/AR.js — installable as a PWA.

## How it works

1. **Pick a course** on the home screen: a built-in course, one you created, one imported from a share code, or a practice round generated around wherever you're standing.
2. **Follow the map** from tee to basket. The map shows tee and basket markers for every hole, a fairway line, 10/25/50 m distance rings around the current basket, your live position, and a GPS-accuracy circle.
3. **Hold your phone up** to switch to the AR view: a 3D arrow points toward the basket and a HUD shows the remaining distance. Tilt it back down to return to the map. (The switch uses hysteresis so it doesn't flicker at the threshold.)
4. **Tap Throw** after each throw. When you get within 10 m of the basket the app prompts you to finish the hole, then advances to the next tee. After the last hole you get a results screen, and the round is saved to your history.

## Features

- **Courses**: built-in course data, plus a course creator (`#/create`) — walk the course and drop tee/basket pins at your GPS position (or tap the map), set pars, and save. Share courses between devices with a copy-paste share code.
- **Scoring**: per-hole throw counter with undo, live scorecard, score vs par, round history stored on the device.
- **AR guidance**: bearing to the basket is computed from GPS and compass heading; WebXR is used on devices that support `immersive-ar`, with AR.js webcam rendering as the fallback.
- **PWA**: installable, works full-screen, keeps the screen awake during a round (Wake Lock API), and caches map tiles you've viewed so courses with poor cell coverage still show a map.
- **Demo mode**: if location is denied or unavailable you can play a simulated round — tap the map to move yourself around the course.
- **Privacy**: all location data, courses, scores, and history stay in your browser's local storage. Nothing is transmitted to a server.

## Development

```bash
npm install
npm run dev       # dev server
npm run build     # production build
npm run preview   # preview the production build
npm run test      # vitest unit tests
npm run lint      # biome + prettier
npm run check     # svelte-check + tsc
```

CI runs lint, typecheck, tests, and a build on every pull request and on pushes to `main` (`.github/workflows/lint.yml`). Pushes to `main` also deploy to Cloudflare Pages (`.github/workflows/deploy.yml`).

## Architecture

| Path | Purpose |
| --- | --- |
| `src/lib/geo.ts` | Haversine distance, bearings, destination points, circle rings |
| `src/lib/courses.ts` | Built-in courses, custom-course storage, share-code encode/decode |
| `src/lib/gameState.ts` | Game sessions, throw tracking, hole progression, round history |
| `src/lib/orientation.ts` | Tilt hysteresis, compass heading, iOS permission handling |
| `src/lib/ar.ts` | WebXR vs AR.js renderer detection |
| `src/lib/wakeLock.ts` | Screen Wake Lock wrapper |
| `src/lib/MapGame.svelte` | The in-game screen: map, AR view, HUD, scorecard |
| `src/lib/CourseCreator.svelte` | Course creator |
| `src/lib/Home.svelte` | Course selection, import, history |

The pure logic modules are unit-tested (`src/lib/*.test.ts`); the game state lives in localStorage under `discgolf.*` keys.

## Browser notes

- **Location** requires HTTPS (or localhost) and works best outdoors with high-accuracy GPS.
- **Compass heading** comes from `webkitCompassHeading` on iOS and `deviceorientationabsolute` on Android Chrome; on iOS the app asks for motion permission when you start a game.
- **AR view** uses the rear camera. iOS Safari and Android Chrome are the primary targets.
