type MediaStreamLike = {
	getTracks: () => Array<{ stop: () => void }>;
};

const hasMediaTracks = (value: unknown): value is MediaStreamLike =>
	typeof value === "object" &&
	value !== null &&
	"getTracks" in value &&
	typeof (value as MediaStreamLike).getTracks === "function";

let lateVideoWatch: MutationObserver | null = null;

const stopVideo = (video: HTMLVideoElement) => {
	if (hasMediaTracks(video.srcObject)) {
		for (const track of video.srcObject.getTracks()) {
			track.stop();
		}
	}

	video.srcObject = null;
	video.remove();
};

/** Stops and removes every AR.js-style video currently in the DOM. */
const sweepArJsVideos = (): boolean => {
	const candidates = new Set<HTMLVideoElement>();
	const arjsVideo = document.getElementById("arjs-video");

	if (arjsVideo instanceof HTMLVideoElement) {
		candidates.add(arjsVideo);
	}

	for (const video of document.querySelectorAll<HTMLVideoElement>(
		"body > video",
	)) {
		if (video.id === "arjs-video" || hasMediaTracks(video.srcObject)) {
			candidates.add(video);
		}
	}

	for (const video of candidates) {
		stopVideo(video);
	}

	return candidates.size > 0;
};

// AR.js only appends its <video> to <body> after getUserMedia resolves, which
// can happen long after cleanup ran (e.g. the scene unmounted while the camera
// permission prompt was still open). Watch for that late arrival and stop it,
// or the camera stays live with nothing left to turn it off.
const armLateVideoWatch = () => {
	lateVideoWatch?.disconnect();
	lateVideoWatch = new MutationObserver(() => {
		if (sweepArJsVideos()) {
			disarmArJsCameraWatch();
		}
	});
	lateVideoWatch.observe(document.body, { childList: true });
};

/**
 * Must be called before mounting an AR scene, so a watch armed by an earlier
 * teardown doesn't kill the new scene's legitimate camera stream.
 */
export const disarmArJsCameraWatch = () => {
	lateVideoWatch?.disconnect();
	lateVideoWatch = null;
};

export const stopArJsCamera = () => {
	sweepArJsVideos();
	armLateVideoWatch();
	document.body.classList.remove("ar-video-visible");
};
