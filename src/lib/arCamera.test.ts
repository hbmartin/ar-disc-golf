import { afterEach, describe, expect, it, vi } from "vitest";
import { disarmArJsCameraWatch, stopArJsCamera } from "./arCamera.ts";

const makeStream = () => {
	const stop = vi.fn();
	return { stream: { getTracks: () => [{ stop }] }, stop };
};

// happy-dom's srcObject only accepts real MediaStream instances, so install
// the fake as a plain data property instead.
const attachStream = (video: HTMLVideoElement, stream: unknown) => {
	Object.defineProperty(video, "srcObject", {
		value: stream,
		writable: true,
		configurable: true,
	});
};

const appendVideo = (id?: string, stream?: unknown) => {
	const video = document.createElement("video");
	if (id) video.id = id;
	if (stream) attachStream(video, stream);
	document.body.appendChild(video);
	return video;
};

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
	disarmArJsCameraWatch();
	document.body.innerHTML = "";
	document.body.classList.remove("ar-video-visible");
});

describe("stopArJsCamera", () => {
	it("stops tracks and removes the AR.js video plus the body class", () => {
		const { stream, stop } = makeStream();
		const video = appendVideo("arjs-video", stream);
		document.body.classList.add("ar-video-visible");

		stopArJsCamera();

		expect(stop).toHaveBeenCalledOnce();
		expect(video.isConnected).toBe(false);
		expect(document.body.classList.contains("ar-video-visible")).toBe(false);
	});

	it("stops anonymous body-level videos that carry a media stream", () => {
		const { stream, stop } = makeStream();
		const video = appendVideo(undefined, stream);

		stopArJsCamera();

		expect(stop).toHaveBeenCalledOnce();
		expect(video.isConnected).toBe(false);
	});

	it("catches a stream that AR.js attaches after cleanup already ran", async () => {
		stopArJsCamera();

		// Simulates getUserMedia resolving after the AR scene unmounted.
		const { stream, stop } = makeStream();
		const video = appendVideo("arjs-video", stream);
		await nextTick();

		expect(stop).toHaveBeenCalledOnce();
		expect(video.isConnected).toBe(false);
	});

	it("leaves a new scene's video alone once the watch is disarmed", async () => {
		stopArJsCamera();
		disarmArJsCameraWatch();

		const { stream, stop } = makeStream();
		const video = appendVideo("arjs-video", stream);
		await nextTick();

		expect(stop).not.toHaveBeenCalled();
		expect(video.isConnected).toBe(true);
	});
});
