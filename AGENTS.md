## Architecture

This game follows the layered, feature-folder layout in `docs/ARCHITECTURE.md`. Read it before adding or moving code. In short:

- `lib → platform → game → (world, player, render, sky, ui, audio) → features → main.js`; imports only point down that chain.
- A new feature goes in `src/features/<name>/`, exports `<name>Feature` from its `index.js`, and is listed in `src/features/index.js`. Don't add top-level `src/*.js` files, and don't edit `main.js` for features.
- Features don't import each other; use `game/events.js` or one of the registries listed in `docs/ARCHITECTURE.md`.
- Each feature owns its save slice (`state.slice`) and its `*-data.js` content. Shared progress goes through `game/progress.js`.
- The engine is imported only in `src/platform/engine.js`; other files import from there.
- Build order is the order of draws from the seeded world random. Put anything new that draws at the end of the list, or the island's scenery moves.
- `lib/` and `*-data.js` files import no engine or DOM code and have tests in `test/`.
- After changes run `just check` (syntax and layer rules via `tools/coupling-report.mjs`), `just test` and `just types`.
