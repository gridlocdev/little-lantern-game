port := "8000"

# list recipes
default:
    @just --list

# install the pinned engine, Electron and the packager into node_modules
install:
    npm install

# serve the game on localhost (port 8000 by default)
serve: _deps
    python3 -m http.server {{port}}

# serve the game and open it in the default browser
play: _deps
    #!/usr/bin/env bash
    set -euo pipefail
    python3 -m http.server {{port}} & server=$!
    trap 'kill $server' EXIT INT TERM
    until curl -sf -o /dev/null http://localhost:{{port}}/; do sleep 0.1; done
    open http://localhost:{{port}}/index.html
    wait $server

# syntax-check every module, then check the layer rules in docs/ARCHITECTURE.md
check:
    @for f in $(find src -name '*.js'); do node --check "$f" || exit 1; done
    node tools/coupling-report.mjs --strict

# run the unit tests for lib/ and the content files
test:
    node --test

# type-check the game against the engine's types (jsconfig.json)
types:
    npx -y -p typescript@5.6.3 tsc -p jsconfig.json

# run the game as a desktop app (Electron); the save goes to a file in the app's data folder
app: _deps
    npx electron .

# package the desktop app for this computer's OS into release/
package: _deps
    npx electron-builder

# package for one platform: mac (universal .dmg and .zip), win (installer), linux (AppImage); win and linux need Rosetta on Apple Silicon
package-for platform: _deps
    npx electron-builder --{{platform}}

_deps:
    @[ -d node_modules/littlejsengine ] && [ -d node_modules/electron ] || npm install
