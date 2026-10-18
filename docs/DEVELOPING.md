# Developing Little Lantern

How to run, check, package and save the game. [ARCHITECTURE.md](ARCHITECTURE.md) explains how the code is laid out.

## Running and checking

```sh
just play          # installs the engine if needed, serves on http://localhost:8000 and opens your browser
```

Other recipes:

| Recipe | What it does |
| --- | --- |
| `just serve` | serve the game on http://localhost:8000 (`just port=9000 serve` for another port) |
| `just install` | `npm install` the pinned engine |
| `just check` | syntax-check every module in `src/`, then check the layer rules |
| `just test` | run the unit tests for `src/lib/` and the content files |
| `just types` | type-check the game against the engine's types |
| `just music` | re-render the soundtrack from `tools/music/songs.js` with soundfont-player (needs a checkout beside this one, or `just music <path>`, and ffmpeg) |
| `just phone` | play the game as a phone would (an emulated 390 × 844 touch screen, in Electron) through `tools/phone-tour.mjs`: prints its checks and where the screenshots went; `PHONE_W=844 PHONE_H=390 just phone` turns it on its side |
| `just app` | run the game as a desktop app (Electron) |
| `just package` | build the desktop app for this computer's OS into `release/` |
| `just package-for mac` | build one platform: `mac`, `win` or `linux` |

Without just: `npm install && npm start`, then open http://localhost:8000.

## Desktop app

The game also runs as a desktop app through Electron, with no changes to the game itself. `electron/main.js` serves the game's files over an `app://` address (ES modules and the import map don't load from `file://`) and opens one window with Node.js kept out of the page. F11 toggles fullscreen. Links open in your browser, never in the game window.

The desktop app saves to a file instead of `localStorage`, through the storage hook described under Saving below:

| OS | Save file |
| --- | --- |
| macOS | `~/Library/Application Support/Little Lantern/save.json` |
| Windows | `%APPDATA%\Little Lantern\save.json` |
| Linux | `~/.config/Little Lantern/save.json` |

`just package` builds for the computer you're on, into `release/`:

| Platform | Output |
| --- | --- |
| macOS | `Little Lantern-<version>-universal.dmg` and `-universal-mac.zip`, for Apple Silicon and Intel |
| Windows | `Little Lantern Setup <version>.exe`, an installer that lets you pick the folder |
| Linux | `Little Lantern-<version>.AppImage` |

The packager's Windows and Linux tools are Intel programs, so building those on an Apple Silicon Mac needs Rosetta (`softwareupdate --install-rosetta`). Without it, push a tag instead: the release workflow builds each platform on its own OS and attaches all of them to a GitHub release. Set `version` in `package.json` to match the tag first; `npm version 1.1.0` does both.

The builds aren't signed. On macOS, the first time, right-click the app and choose Open (or run `xattr -cr "/Applications/Little Lantern.app"` after copying it); Windows shows a SmartScreen warning with a "Run anyway" option. Signing needs an Apple Developer ID or a Windows code signing certificate, which electron-builder picks up from the environment when you have them.

The fonts come from Google Fonts, so offline the title and HUD fall back to the system's serif and UI fonts.

## Saving

Storage lives in `src/platform/storage.js` and the save format in `src/game/state.js`. Each feature keeps its progress in its own slice of the save and calls `writeSave()` after each change; progress several features share lives in `src/game/progress.js`. The save is written as `{ "v": 2, "core": {…}, "fishing": {…}, … }`, and a save from before the slices is migrated when it loads. Volume and graphics settings live under their own keys, so starting a new dream keeps them.

Those values sit in a small in-memory table of string keys. A storage backend fills that table once before the engine starts, and is told about every change. The default backend is the browser's `localStorage`, under the keys `violet-isle-dream-v1`, `violet-isle-dream-v1-vol` and `violet-isle-dream-v1-gfx` (from the game's old name, Violet Isle, and kept so saves carry over).

To save to a file under Electron or Tauri, define `window.littleLanternStorage` before the scripts load, for example in a preload script:

```js
window.littleLanternStorage = {
    load: async ()=> JSON.parse(await readSaveFile() || '{}'),   // the whole table, or {} on a first run
    write: (key, value, all)=> writeSaveFile(JSON.stringify(all)),
    remove: (key, all)=> writeSaveFile(JSON.stringify(all)),     // may return a promise; a reset waits for it
};
```

`readSaveFile` and `writeSaveFile` stand in for whatever your shell provides: Electron IPC to `fs`, or Tauri's `fs` plugin. `load` can be async, and the engine only starts once it resolves. If the backend throws, the game logs a warning and keeps running.
