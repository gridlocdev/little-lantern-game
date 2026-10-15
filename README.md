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
  - `audio/` sound effects and music
  - `features/` one folder per thing to do: house, bench, snail, swing, chimes, moonlet, mushrooms, overlook, telescope, fishing, sheep, fallen stars
  - `main.js` lists the shared systems around the features and starts the engine
- `test/` unit tests for `src/lib/` and the content files
- `tools/coupling-report.mjs` checks the layer rules (`just check`); `architecture.json` declares the layers
- The engine is pinned to `littlejsengine@1.21.0` in `package.json`

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
