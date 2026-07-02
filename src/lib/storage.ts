/**
 * Safe localStorage JSON helpers. localStorage can throw (private browsing,
 * storage disabled, quota) — callers get null / false instead of exceptions.
 */

export function readJson<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? null : (JSON.parse(raw) as T);
	} catch (error) {
		console.warn(`Failed to read ${key} from localStorage:`, error);
		return null;
	}
}

export function writeJson(key: string, value: unknown): boolean {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch (error) {
		console.warn(`Failed to write ${key} to localStorage:`, error);
		return false;
	}
}

export function removeKey(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.warn(`Failed to remove ${key} from localStorage:`, error);
	}
}
