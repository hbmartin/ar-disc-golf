type MediaStreamLike = {
	getTracks: () => Array<{ stop: () => void }>;
};

const hasMediaTracks = (value: unknown): value is MediaStreamLike =>
	typeof value === "object" &&
	value !== null &&
	"getTracks" in value &&
	typeof (value as MediaStreamLike).getTracks === "function";

export const stopArJsCamera = () => {
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
		if (hasMediaTracks(video.srcObject)) {
			for (const track of video.srcObject.getTracks()) {
				track.stop();
			}
		}

		video.srcObject = null;
		video.remove();
	}

	document.body.classList.remove("ar-video-visible");
};
