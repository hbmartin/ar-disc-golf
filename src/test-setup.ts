import { beforeEach, vi } from "vitest";

function createStorage(): Storage {
	const values = new Map<string, string>();

	return {
		get length() {
			return values.size;
		},
		clear() {
			values.clear();
		},
		getItem(key: string) {
			return values.get(key) ?? null;
		},
		key(index: number) {
			return Array.from(values.keys())[index] ?? null;
		},
		removeItem(key: string) {
			values.delete(key);
		},
		setItem(key: string, value: string) {
			values.set(key, value);
		},
	};
}

const localStorageMock = createStorage();
const sessionStorageMock = createStorage();

for (const target of [globalThis, window]) {
	Object.defineProperties(target, {
		localStorage: {
			value: localStorageMock,
			configurable: true,
			writable: true,
		},
		sessionStorage: {
			value: sessionStorageMock,
			configurable: true,
			writable: true,
		},
	});
}

// Mock DeviceOrientationEvent since it's not available in testing environment
interface DeviceOrientationEventInit {
	alpha?: number | null;
	beta?: number | null;
	gamma?: number | null;
	absolute?: boolean;
}

globalThis.DeviceOrientationEvent = class DeviceOrientationEvent extends Event {
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
Object.defineProperty(globalThis.navigator, "geolocation", {
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
