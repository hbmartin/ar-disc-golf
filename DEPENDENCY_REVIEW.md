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

## A-Frame / three-bmfont-text transitive GitHub dependency

Socket flagged `aframe@1.7.1` because it depends on the dmarcos
`three-bmfont-text` GitHub fork. Checked on 2026-07-04:

- `aframe@1.7.1` depends on
  `github:dmarcos/three-bmfont-text#eed4878795be9b3e38cf6aec6b903f56acd1f695`.
- `aframe@1.8.0`, the current npm registry version, still depends on the same
  dmarcos fork at a newer commit.
- `@ar-js-org/ar.js@3.4.7` declares `aframe` support through `^1.6.0`.
- Forcing `three-bmfont-text@3.0.1` from npm replaces the dmarcos fork with
  the Jam3 upstream package and makes the installed dependency graph invalid.

No npm override is applied for `three-bmfont-text`. Keeping A-Frame's declared
fork is lower risk than replacing it with a different package that may be
missing A-Frame-specific patches. The fork is listed as a direct dependency so
the trust decision is explicit in `package.json`.

### blockExoticSubdeps

`pnpm-workspace.yaml` sets `blockExoticSubdeps: true`. pnpm 11 skips the
exotic-subdependency check for resolutions that already come from the committed
lockfile, so day-to-day `pnpm install` / `pnpm install --frozen-lockfile` pass
while any *new* git/tarball-hosted transitive dependency is rejected at install
time. The setting is boolean-only (no per-package allowlist), which means:

- Bumping `aframe` (or anything else that re-resolves the fork at a new commit)
  fails with `ERR_PNPM_EXOTIC_SUBDEP`. Temporarily set `blockExoticSubdeps:
  false`, regenerate the lockfile, review the new git-hosted entries, and flip
  it back to `true`. Treat that flip as the review checkpoint.
- The semgrep rules in `.semgrep/ar-camera-and-dependencies.yml` (run in the
  lint workflow) independently flag any lockfile entry whose tarball is not the
  dmarcos `three-bmfont-text` fork, catching entries that enter via the
  lockfile-skip path.

Revisit this when A-Frame publishes a release that removes the GitHub
dependency, or when the fork is published to an npm package that can be consumed
without changing the implementation.
