/**
 * Keep the screen awake during a round. Returns a release function; safe to
 * call on browsers without the Wake Lock API (release is then a no-op).
 * Re-acquires the lock when the page becomes visible again, since the
 * browser releases it automatically on tab switch / screen off.
 */
export async function acquireWakeLock(): Promise<() => void> {
	if (!("wakeLock" in navigator)) {
		return () => {};
	}

	let sentinel: WakeLockSentinel | null = null;
	let released = false;

	const request = async () => {
		try {
			sentinel = await navigator.wakeLock.request("screen");
		} catch (error) {
			// Denied (e.g. low battery) — not fatal, the screen just may sleep
			console.warn("Wake lock request failed:", error);
		}
	};

	const onVisibilityChange = () => {
		if (!released && document.visibilityState === "visible") {
			request();
		}
	};

	document.addEventListener("visibilitychange", onVisibilityChange);
	await request();

	return () => {
		released = true;
		document.removeEventListener("visibilitychange", onVisibilityChange);
		sentinel?.release().catch(() => {});
		sentinel = null;
	};
}
