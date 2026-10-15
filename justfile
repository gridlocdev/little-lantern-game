port := "8000"

# list recipes
default:
    @just --list

# install the pinned LittleJS engine into node_modules
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

# syntax-check every game module
check:
    @for f in $(find src -name '*.js'); do node --check "$f" || exit 1; done

_deps:
    @[ -d node_modules/littlejsengine ] || npm install
