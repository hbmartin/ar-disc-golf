import { beforeEach, vi } from "vitest";

// Mock DeviceOrientationEvent since it's not available in testing environment
interface DeviceOrientationEventInit {
	alpha?: number | null;
	beta?: number | null;
	gamma?: number | null;
	absolute?: boolean;
}

global.DeviceOrientationEvent = class DeviceOrientationEvent extends Event {
	alpha: number | null;
	beta: number | null;
	gamma: number | null;
	absolute: boolean;

	constructor(type: string, eventInitDict?: DeviceOrientationEventInit) {
		super(type);
		this.alpha = eventInitDict?.alpha ?? null;
		this.beta = eventInitDict?.beta ?? null;
		this.gamma = eventInitDict?.gamma ?? null;
		this.absolute = eventInitDict?.absolute ?? false;
	}
} as any;

// Mock geolocation
Object.defineProperty(global.navigator, "geolocation", {
	value: {
		getCurrentPosition: vi.fn(),
		watchPosition: vi.fn(),
		clearWatch: vi.fn(),
	},
	writable: true,
});

beforeEach(() => {
	// Reset mocks before each test
	vi.clearAllMocks();
});
