/**
 * AR renderer selection: prefer the WebXR Device API (better tracking on
 * modern Android/Chrome), fall back to AR.js's webcam background (works on
 * iOS Safari and older browsers).
 */
export type ARMode = "webxr" | "arjs";

interface XrSystemLike {
	isSessionSupported?: (mode: string) => Promise<boolean>;
}

export async function detectARMode(): Promise<ARMode> {
	const xr = (navigator as Navigator & { xr?: XrSystemLike }).xr;
	if (xr?.isSessionSupported) {
		try {
			if (await xr.isSessionSupported("immersive-ar")) {
				return "webxr";
			}
		} catch (error) {
			console.warn("WebXR support check failed, using AR.js:", error);
		}
	}
	return "arjs";
}
