# Dependency Review Notes

## vite-plugin-pwa / Workbox transitive alerts

Socket flagged transitive dependencies introduced through `vite-plugin-pwa`.
The dependency path is:

`vite-plugin-pwa@1.3.0 -> workbox-build@7.4.1`

Checked on 2026-07-03:

- `vite-plugin-pwa@1.3.0` is the current npm registry version.
- `workbox-build@7.4.1` is the current npm registry version.
- `es-abstract@1.24.2` is the current `es-abstract` version.
- `@trickfilm400/rollup-plugin-off-main-thread@3.0.0-pre1` has no newer npm
  version.
- `glob@11.1.0` and `source-map@0.8.0-beta.0` are selected by Workbox's
  declared dependency ranges.

No npm override is applied here. Forcing `glob` or `source-map` outside
Workbox's declared ranges risks breaking service-worker generation while leaving
the upstream package constraints undocumented. Revisit this when Workbox or
`vite-plugin-pwa` publishes a version that removes these transitive alerts, or
replace the PWA generation stack with a manually maintained service worker.
