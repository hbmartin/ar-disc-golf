export type MapLibreModule = typeof import("maplibre-gl");
export type MapLibreMap = import("maplibre-gl").Map;
export type MapLibreMarker = import("maplibre-gl").Marker;
export type MapLibreGeoJsonSource = import("maplibre-gl").GeoJSONSource;

let loaded: MapLibreModule | null = null;
let loading: Promise<MapLibreModule> | null = null;

export const loadMapLibre = async (): Promise<MapLibreModule> => {
	if (loaded) return loaded;
	loading ??= Promise.all([
		import("maplibre-gl"),
		import("maplibre-gl/dist/maplibre-gl.css"),
	])
		.then(([module]) => {
			loaded = module;
			return module;
		})
		.catch((error) => {
			// Allow a retry after a transient load failure instead of caching it.
			loading = null;
			throw error;
		});
	return loading;
};

/** The loaded module, or null until loadMapLibre has resolved once. */
export const getMapLibre = (): MapLibreModule | null => loaded;
