port := "8000"
soundfonts := "../soundfont-player"

# list recipes
default:
    @just --list

# install the pinned engine, Electron and the packager into node_modules
install:
    npm install

# serve the game on localhost (port 8000 by default)
serve: _deps
    python3 -m http.server {{port}}

# serve the game to the local network, to try it on a phone: prints the address to open there
lan: _deps
    #!/usr/bin/env bash
    set -euo pipefail
    ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | cut -d' ' -f1)
    echo "On your phone (same Wi-Fi): http://$ip:{{port}}/"
    # no-store, so a reload on the phone always gets the latest files (Safari otherwise keeps old scripts a while)
    python3 -c 'import http.server as h, sys
    class H(h.SimpleHTTPRequestHandler):
        def end_headers(self): self.send_header("Cache-Control", "no-store"); super().end_headers()
    h.ThreadingHTTPServer(("0.0.0.0", int(sys.argv[1])), H).serve_forever()' {{port}}

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

# redraw the app icon, build/icon.png, and the phone home-screen icons in icons/, from tools/make-icon.mjs
icon:
    node tools/make-icon.mjs
    node tools/make-icon.mjs icons/apple-touch-icon.png 180 --bleed
    node tools/make-icon.mjs icons/icon-192.png 192 --bleed
    node tools/make-icon.mjs icons/icon-512.png 512 --bleed

# render the soundtrack (tools/music/songs.js) with soundfont-player into music/ and src/audio/tracks-data.js
# needs ffmpeg and a soundfont-player checkout; e.g. just music ~/src/games/soundfont-player intro race
music path=soundfonts *tracks: _deps
    npx electron tools/music/render.mjs {{path}} {{tracks}}

# play the game as a phone would (a 390 x 844 touch screen) through tools/phone-tour.mjs, or another scenario; prints
# its checks and where the screenshots went. e.g. just phone, or PHONE_W=844 PHONE_H=390 just phone
phone scenario="tools/phone-tour.mjs": _deps
    npx electron tools/phone.mjs {{scenario}}

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
