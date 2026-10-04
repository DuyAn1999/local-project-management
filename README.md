# Local Projects

A desktop app for discovering coding projects inside selected folders, identifying their languages, and offering commands to run them—for example, scripts from a Node project's `package.json`.

**Current status: CP01, desktop foundation.** The app launches and verifies its isolated Electron bridge. Folder selection, scanning and project execution are not implemented yet.

## Development

Use macOS with Node.js 24 or another version allowed by `package.json`, plus npm. The initial build was verified on Apple Silicon with Node 26.4.0 and npm 11.17.0. Dependency versions are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm start
```

The first launch/package operation may download the official Electron runtime. Development runs Vite on `127.0.0.1:5173`; that port must be available. Stop the development session with Ctrl+C in its terminal (closing the window alone keeps a macOS app active).

## Checks and local packaging

```sh
npm run check       # TypeScript, ESLint and unit tests
npm run package     # Production bundles and local desktop package
npm run test:smoke  # Launch/validate/close unpackaged and packaged apps
```

`npm run build` is an alias for `npm run package`. The smoke tests use Electron itself; no separate Playwright browser download is required. Run packaging before smoke tests so the bundles and package exist. Smoke tests use temporary profiles and close their app instances.

On Apple Silicon the local application is:

```text
out/Local Projects-darwin-arm64/Local Projects.app
```

The architecture suffix follows the build machine. Only macOS arm64 has been verified. This checkpoint creates a local package, without distribution signing/notarization or an installer.

The `development` smoke project launches the installed Electron binary against the current `.vite` bundles. After packaging, these are production bundles in an unpackaged app. To also test the live Vite development path, keep `npm start` running in one terminal and run `npm run test:smoke:development` in another. Do not package while the development watcher is running. `npm run test:smoke:packaged` checks only the packaged app.

## Code layout

| Directory | Responsibility |
| --- | --- |
| `src/main` | App/window lifecycle and validated IPC handlers |
| `src/preload` | Narrow, typed bridge exposed through `contextBridge` |
| `src/renderer` | React interface; no native Node/Electron imports |
| `src/shared` | Shared request/response types and validation |
| `build` | Content-security policy used by the renderer build |
| `tests/unit` | Sender/request validation and policy checks |
| `tests/smoke` | Real Electron launch, isolation, IPC rejection and shutdown checks |

The renderer is sandboxed with context isolation enabled and Node integration disabled. Its only native capability is the app-info method; it has no filesystem or process-execution API. Packaged content blocks inline scripts, eval and network connections. Development allows the inline preamble/styles and loopback WebSocket needed by Vite React Refresh.

## Plan and validation

- [Implementation checkpoints](docs/IMPLEMENTATION_CHECKPOINTS.md)
- [Architecture and scope](docs/IMPLEMENTATION_PLAN.md)
- [UI/UX specification](docs/UI_UX.md)
- [CP01 validation record](docs/CP01_VALIDATION.md)
