# Little Lantern

![The moth with its lantern at the lamplit crossroads, the crooked house and Amethyst Hill behind it under the moon and stars](docs/screenshot.jpg)

You are a small moth with a lantern, on an island that floats through the night.

There is no hurry here. Wander the lamplit roads of Violet Isle, fish for things that swim between the stars, swing until you touch the moon, and find out what the crystals on Amethyst Hill are humming about. Race Oswin, the self-styled fastest snail on the island. Brew tea in the crooked house, read the storybooks by the fire, pet the star cat, and cross the bridge of light to the Moonlet, where a quiet night heron has been waiting a long time for one particular fish.

Everything you do is kept in your dream journal. When it is full, the night has one last thing to show you.

## Playing

Little Lantern runs in the browser, or as a desktop app for macOS, Windows and Linux.

```sh
just play     # serves the game on http://localhost:8000 and opens it
just app      # runs it as a desktop app
```

Without [just](https://github.com/casey/just): `npm install && npm start`, then open http://localhost:8000.

## Controls

| | Keyboard and mouse | Gamepad |
| --- | --- | --- |
| Walk | W A S D | Left stick |
| Run | hold Shift | hold RB or RT |
| Jump, and glide | Space, held in the air | A, held in the air |
| Use, talk, fish, sit | E | X |
| Look around | move the mouse | Right stick |
| Zoom | scroll | hold LB or LT with the right stick |
| Dream journal | J | Y |
| Leave an activity | Q | B |
| Menu | Esc | Menu |

On a touch screen, the left thumb walks, dragging looks around, and the round buttons jump and use things. The on-screen prompts always show the buttons for whatever you last pressed.

## Credits

Made with [LittleJS](https://github.com/KilledByAPixel/LittleJS). The soundtrack is composed and played by soundfont-player, and the key and button glyphs are Kenney's [Input Prompts](https://kenney.nl/assets/input-prompts) (CC0).

Working on the game? See [docs/DEVELOPING.md](docs/DEVELOPING.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
