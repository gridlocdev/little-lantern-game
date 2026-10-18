# Violet Isle

![The moth with its lantern at the lamplit crossroads, the crooked house and Amethyst Hill behind it under the moon and stars](docs/screenshot.jpg)

A cozy LittleJS 3D game. You are a small moth with a lantern on an island that floats through the night. Fish for things that swim between stars, swing until you touch the moon, and find what the crystals are humming about.

## Run

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
| `just app` | run the game as a desktop app (Electron) |
| `just package` | build the desktop app for this computer's OS into `release/` |
| `just package-for mac` | build one platform: `mac`, `win` or `linux` |

Without just: `npm install && npm start`, then open http://localhost:8000.

## Controls

| Action | Keyboard | Gamepad / touch |
| --- | --- | --- |
| Walk, hold Shift to run | WASD | Left stick / left thumb |
| Jump, hold in the air to glide | Space | Button 0 / Jump |
| Use, talk, fish, sit | E | Button 2 / Use |
| Turn the camera | Drag, Z and C, scroll to zoom | Right stick / drag |
| Dream journal | J | Journal |
| Leave an activity | Q | Button 1 |

## Files

- `index.html` holds the HUD and menu markup, maps `littlejsengine` to the engine's module build, and loads `src/main.js`
- `style.css` styles the HTML layer over the canvas
- `src/` holds the game as ES modules, in layers that only import downward (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)):
  - `lib/` pure helpers: math and curves
  - `platform/` the engine and its settings, storage, input, the seeded world random, mesh and texture builders
  - `game/` the loop, the game mode and save, shared progress, the current activity, interactables, events
  - `world/` the island's layout, terrain, roads, collision and scenery
  - `player/` the mothling: its state, body and animation, movement, sitting
  - `render/` the camera, renderer setup, textures, particles, water, graphics quality
  - `sky/` the sky dome, palettes, moon, shooting stars and the star whale
  - `ui/` the title screen, HUD, prompt, dialog, journal, menu and places
  - `audio/` sound effects and the night's crickets, water and frogs, synthesized at startup, and the music, which plays the tracks in `music/` and brings in a place's layer as you near it
  - `features/` one folder per thing to do: house, bench, snail, swing, chimes, moonlet, mushrooms, overlook, telescope, fishing, sheep, fallen stars
  - `main.js` lists the shared systems around the features and starts the engine
- `test/` unit tests for `src/lib/` and the content files
- `electron/` the desktop app: `main.js` opens the window and keeps the save in a file, `preload.cjs` hands the game that file save
- `.github/workflows/release.yml` builds the desktop app for macOS, Windows and Linux when a `v*` tag is pushed
- `music/` the soundtrack as mp3s, one per place or moment; `tools/music/` writes them (`just music`): the songs are specs for soundfont-player's composer, played through its sampler offline and encoded with ffmpeg
- `tools/coupling-report.mjs` checks the layer rules (`just check`); `architecture.json` declares the layers
- The engine is pinned to `littlejsengine@1.21.0` in `package.json`

## Desktop app

The game also runs as a desktop app through Electron, with no changes to the game itself. `electron/main.js` serves the game's files over an `app://` address (ES modules and the import map don't load from `file://`) and opens one window with Node.js kept out of the page. F11 toggles fullscreen. Links open in your browser, never in the game window.

The desktop app saves to a file instead of `localStorage`, through the storage hook described under Saving:

| OS | Save file |
| --- | --- |
| macOS | `~/Library/Application Support/Violet Isle/save.json` |
| Windows | `%APPDATA%\Violet Isle\save.json` |
| Linux | `~/.config/Violet Isle/save.json` |

`just package` builds for the computer you're on, into `release/`:

| Platform | Output |
| --- | --- |
| macOS | `Violet Isle-<version>-universal.dmg` and `-universal-mac.zip`, for Apple Silicon and Intel |
| Windows | `Violet Isle Setup <version>.exe`, an installer that lets you pick the folder |
| Linux | `Violet Isle-<version>.AppImage` |

The packager's Windows and Linux tools are Intel programs, so building those on an Apple Silicon Mac needs Rosetta (`softwareupdate --install-rosetta`). Without it, push a tag instead: the release workflow builds each platform on its own OS and attaches all of them to a GitHub release. Set `version` in `package.json` to match the tag first; `npm version 1.1.0` does both.

The builds aren't signed. On macOS, the first time, right-click the app and choose Open (or run `xattr -cr "/Applications/Violet Isle.app"` after copying it); Windows shows a SmartScreen warning with a "Run anyway" option. Signing needs an Apple Developer ID or a Windows code signing certificate, which electron-builder picks up from the environment when you have them.

The fonts come from Google Fonts, so offline the title and HUD fall back to the system's serif and UI fonts.

## Saving

Storage lives in `src/platform/storage.js` and the save format in `src/game/state.js`. Each feature keeps its progress in its own slice of the save and calls `writeSave()` after each change; progress several features share lives in `src/game/progress.js`. The save is written as `{ "v": 2, "core": {…}, "fishing": {…}, … }`, and a save from before the slices is migrated when it loads. Volume and graphics settings live under their own keys, so starting a new dream keeps them.

Those values sit in a small in-memory table of string keys. A storage backend fills that table once before the engine starts, and is told about every change. The default backend is the browser's `localStorage`, under the keys `violet-isle-dream-v1`, `violet-isle-dream-v1-vol` and `violet-isle-dream-v1-gfx`.

To save to a file under Electron or Tauri, define `window.violetIsleStorage` before the scripts load, for example in a preload script:

```js
window.violetIsleStorage = {
    load: async ()=> JSON.parse(await readSaveFile() || '{}'),   // the whole table, or {} on a first run
    write: (key, value, all)=> writeSaveFile(JSON.stringify(all)),
    remove: (key, all)=> writeSaveFile(JSON.stringify(all)),     // may return a promise; a reset waits for it
};
```

`readSaveFile` and `writeSaveFile` stand in for whatever your shell provides: Electron IPC to `fs`, or Tauri's `fs` plugin. `load` can be async, and the engine only starts once it resolves. If the backend throws, the game logs a warning and keeps running.
