# 🥏 AR Disc Golf

An Augmented Reality Disc Golf Experience built with Svelte, TypeScript, and Vite, featuring GPS location tracking and AR capabilities. Users play courses using GPS tracking and augmented reality guidance.

## Features

### 🌍 GPS Location Services
- **Real-time Location Tracking**: Uses browser's Geolocation API for precise positioning
- **Permission Handling**: Graceful permission requests with user-friendly error messages
- **High Accuracy Mode**: Optimized for outdoor GPS accuracy
- **Privacy-Focused**: Location data stays on your device and is never transmitted

### 📱 User Interface
- **Modern Design**: Beautiful gradient-based UI with responsive layout
- **Interactive Elements**: Toggle location details, retry functionality, and refresh options
- **Error Handling**: Clear error messages with step-by-step resolution guidance
- **Mobile Optimized**: Works seamlessly on both desktop and mobile devices

### 🎯 AR Gameplay: Play courses with AR arrow guidance and map navigation
- **A-Frame Integration**: Built with A-Frame for future AR features
- **AR.js Support**: Ready for marker-based and location-based AR
- **Extensible Architecture**: Modular design for easy feature additions

## Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Location Features

The app includes comprehensive GPS location functionality:

1. **Automatic Location Detection**: Requests location permission on first visit
2. **Error Handling**: Graceful handling of permission denied, timeout, and unavailable scenarios
3. **Retry Mechanism**: Easy retry functionality with clear instructions
4. **Detailed Information**: Shows coordinates, accuracy, timestamp, and maps integration
5. **Privacy Focused**: All location data stays on your device

### Supported Browsers
- Chrome/Chromium (full support)
- Safari (full support)
- Mobile browsers (responsive design)

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).

## Technical considerations

**Why use this over SvelteKit?**

- It brings its own routing solution which might not be preferable for some users.
- It is first and foremost a framework that just happens to use Vite under the hood, not a Vite app.

This template contains as little as possible to get started with Vite + TypeScript + Svelte, while taking into account the developer experience with regards to HMR and intellisense. It demonstrates capabilities on par with the other `create-vite` templates and is a good starting point for beginners dipping their toes into a Vite + Svelte project.

Should you later need the extended capabilities and extensibility provided by SvelteKit, the template has been structured similarly to SvelteKit so that it is easy to migrate.

**Why `global.d.ts` instead of `compilerOptions.types` inside `jsconfig.json` or `tsconfig.json`?**

Setting `compilerOptions.types` shuts out all other types not explicitly listed in the configuration. Using triple-slash references keeps the default TypeScript setting of accepting type information from the entire workspace, while also adding `svelte` and `vite/client` type information.

**Why include `.vscode/extensions.json`?**

Other templates indirectly recommend extensions via the README, but this file allows VS Code to prompt the user to install the recommended extension upon opening the project.

**Why enable `allowJs` in the TS template?**

While `allowJs: false` would indeed prevent the use of `.js` files in the project, it does not prevent the use of JavaScript syntax in `.svelte` files. In addition, it would force `checkJs: false`, bringing the worst of both worlds: not being able to guarantee the entire codebase is TypeScript, and also having worse typechecking for the existing JavaScript. In addition, there are valid use cases in which a mixed codebase may be relevant.

**Why is HMR not preserving my local component state?**

HMR state preservation comes with a number of gotchas! It has been disabled by default in both `svelte-hmr` and `@sveltejs/vite-plugin-svelte` due to its often surprising behavior. You can read the details [here](https://github.com/rixo/svelte-hmr#svelte-hmr).

If you have state that's important to retain within a component, consider creating an external store which would not be replaced by HMR.

```ts
// store.ts
// An extremely simple external store
import { writable } from 'svelte/store'
export default writable(0)
```
