# Architecture

Violet Isle is native ES modules served as static files, with no bundler. `src/main.js` lists the shared systems around the features and hands the list to `src/game/loop.js`, which builds and runs them in that order. The engine is imported only by `src/platform/engine.js`, under the bare name `littlejsengine` that `index.html`'s import map points at the engine's module build.

## Layout

| Folder | Holds | May import |
|---|---|---|
| `src/lib/` | pure helpers: math, curves, sound synthesis | nothing |
| `src/platform/` | engine setup and re-exports, storage, input, seeded random, mesh and texture builders | lib |
| `src/game/` | the loop, game mode and save slices, shared progress, the current activity, interactables, events | lib, platform |
| `src/world/` `player/` `render/` `sky/` `ui/` `audio/` | shared systems: the island, the mothling, camera and effects, the sky, the HTML layer, sound | the layers above, and each other without cycles |
| `src/features/<name>/` | one thing to do on the island: its code, its content, its part of the save | everything above, **never another feature** |

`architecture.json` declares these layers for `tools/coupling-report.mjs`.

`electron/` wraps the game as a desktop app. It sits outside `src/` and the layers: the game knows nothing about it except two hooks, the storage hook in `platform/storage.js`, which the desktop app fills with a file-backed save, and `window.violetIsleApp.quit`, which the menu's "Save and exit" uses when it is there (in a browser it goes back to the title screen instead). The app icon, `build/icon.png`, is drawn by `tools/make-icon.mjs` (`just icon`); electron-builder makes the platform icons from it. The fonts ship in `fonts/` so the app looks the same offline.

The features are `house`, `bench`, `snail`, `swing`, `chimes`, `moonlet`, `mushrooms`, `overlook`, `telescope`, `fishing`, `sheep`, `fallen-stars` and `intro`.

## The loop

Every shared system and feature is an object with any of these hooks:

| Hook | When |
|---|---|
| `build()` | once at start |
| `buildLate()` | once, after every `build()` (the house interior, the aquarium, the bloom pass, spawning the mothling) |
| `update()` | every frame while playing; `always: true` also updates on the title screen |
| `updatePost()` | every frame after physics: the camera, then the sky that follows it |
| `render()` | every drawn frame |

The order in `main.js` (with `features/index.js` spliced in) is both the build order and the update order. Two things depend on it:

- **The island's scenery.** Trees, rocks, grass, flowers, lamps, the swing tree, the mushrooms, the pier and the sheep are placed with the seeded random in `platform/random.js`. Each draw depends on every draw before it, so moving an entry that draws, or adding one that draws before it, rearranges the island. Add new things that draw at the end.
- **Who gets input first.** `ui/router.js` gives the frame's input to an open dialog or card, the menu and journal keys, or the current activity, before the mothling moves. The house updates before `player/interaction.js` picks what the mothling would use, so one press of E never does two things.

## A feature

A feature is a folder with an `index.js` that exports `<name>Feature`, listed in `src/features/index.js`. Adding one means adding the folder and one entry in that list; `main.js` does not change. Inside the folder, files are named for what they do (`rig.js`, `catch-card.js`, `doors.js`), and content that is only text and numbers lives in `*-data.js` files that import nothing.

Features never import each other. They reach the rest of the game through:

| To | Use |
|---|---|
| tell another feature something happened | `game/events.js`: `moon-song-played` (chimes, answered by the moonlet), `house-entered` (house, answered by the aquarium), `dream-started` (the title screen, answered by the intro), `fish-caught` (fishing, answered by Ardea the heron on the Moonlet) |
| play a cutscene | `playCutscene` in `ui/cutscene.js`: beats of camera shots, kinetic subtitles (markup in `ui/kinetic.js`) and timed events; the scene's text lives in the feature's `*-data.js` |
| draw the camera's eye to something | `focusCamera` and `kickCamera` in `render/camera.js` |
| give a speaker a voice | `setVoice` in `ui/dialog.js` |
| offer something to use | `addInteract` in `game/interact.js` |
| take over the mothling (swinging, fishing, the telescope, sitting) | `activity.start()` / `activity.end()` in `game/activity.js` |
| name a key or button in a hint | write the action in braces, `'{use}|Get up'` or `{back} to stop`; `ui/glyphs.js` draws it for the keyboard or the pad pressed last (Kenney's Input Prompts in `prompts/`), and static markup uses `<span data-glyph="use">` |
| offer water to fish in | `addWater` in `world/waters.js` (the pond and the moon pool do; fishing makes spots of them) |
| make a place sound different | `addSoundPlace` in `audio/places.js`: near it, the island's music brings in that place's layer (`pond`, `crystal`, `cabin`, `beam`), and `water` places lap and have frogs |
| name a place | `PLACE_NAMES` in `ui/places.js` |
| add journal rows, things to do, HUD counters | `addJournalSection`, `addTodo` in `ui/journal.js`; `addHudCounter` in `ui/hud.js` |
| tell the title screen the player has been here before | `addReturnCheck` in `ui/title.js` |
| own a modal card | `registerModal` in `ui/modal.js` (fishing's catch card); its buttons, tabs and sliders work from the keyboard and the gamepad on their own (`ui/keynav.js`: the d-pad moves, A presses, the bumpers change tabs, the right stick scrolls), and B is the card's own way out, through `input.back()` |

## The camera and sound

`render/camera.js` keeps one view and eases it toward whatever the current mode wants: the title orbit, the follow orbit, the house, an activity's camera or a cutscene's shot. When the mode changes it glides there along an arc instead of cutting, so starting or ending an activity, a cutscene or the dream itself never jumps. An activity can set `camBlend` and `camBlendOut` (seconds) to change how long those glides take.

Sound effects are not files. `audio/recipes.js` builds each one from the oscillators, filters and envelopes in `lib/synth.js` (both import no engine code and are tested), and `audio/sfx.js` turns them into engine sounds at startup.

The music is files: one mp3 per place or moment in `music/`, listed with its tempo, meter and loop points in `audio/tracks-data.js`. They are songs written as specs in `tools/music/songs.js` for the composer in soundfont-player (a sibling project), which `just music` plays through that project's own SoundFont sampler, mixer and mastering on an OfflineAudioContext in a hidden Electron window, then encodes with ffmpeg; nothing at runtime needs the SoundFonts. The tracks share a key family and a four-bar motif. `audio/music.js` plays the area's track (`house` inside, `outside` on the island) unless a feature holds a cue: `musicCue('intro' | 'race' | 'ending')` returns a handle to `release()`, and the newest unreleased cue wins. A change waits for the playing track's next bar line (or beat, when a bar is longer than 2.5 s), starts the new track on it and fades the old one out across about a bar. Looping tracks repeat between bar lines with Web Audio loop points, and each loop's last 40 ms fade into what comes just before its start, so the wrap never clicks; a one-shot (the intro) hands back to the area when its last bar ends, even if its cue is still held. Tracks load when first wanted and at most three stay decoded. The island's track has layers, short loops that fit its loop a whole number of times: near a place added with `addSoundPlace`, its layer is decoded, started in step with the track and swells in, and twenty seconds after it falls silent it is stopped and let go. `audio/night.js` lays the night under the music, built at startup from `audio/night-sounds.js`: crickets (muffled indoors), water lapping and frogs near `water` places, and a faint record crackle that goes when the music is switched off.

## The save

Each feature owns one slice of the save, claimed with `state.slice('<name>', defaults)` in `game/state.js`, and nothing else writes it. Progress several features share (visits, palette, stardust, outfit, music) is the `core` slice in `game/progress.js`; features read it and change it through `addStardust`, `countVisit` and `setOutfit`, while the sky owns the palette (`setPalette`) and the music owns music (`setMusic`).

The save is stored as `{ v: 2, core: {…}, fishing: {…}, … }` under the key `violet-isle-dream-v1`. The first format was one flat object with the same field names, so `loadSave` migrates it by giving each slice the old fields that match its defaults. Settings (volume, graphics) are kept under their own keys, apart from progress.

## Checking

```sh
just check    # syntax, then tools/coupling-report.mjs --strict: layers, feature cross-imports, private imports, cycles
just test     # node --test: lib/ and the content files
just types    # tsc against jsconfig.json and the engine's types
```
