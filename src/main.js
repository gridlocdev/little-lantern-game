// Boot: load the save, list the shared systems around the features, start the engine.
// The list order is the build order and the update order. Build order decides every draw from the seeded world
// random, so moving an entry that draws (or adding one before it) moves the island's scenery.
import { engineInit } from './platform/engine.js';
import { musicSystem } from './audio/music.js';
import { nightSystem } from './audio/night.js';
import { soundSystem } from './audio/sfx.js';
import { features } from './features/index.js';
import { loop } from './game/loop.js';
import { loadSave } from './game/state.js';
import { inputSystem } from './platform/input.js';
import { storage } from './platform/storage.js';
import { interactionSystem } from './player/interaction.js';
import { playerSystem } from './player/movement.js';
import { partMeshSystem } from './player/part-meshes.js';
import { ambientSystem } from './render/ambient.js';
import { cameraSystem } from './render/camera.js';
import { qualitySystem } from './render/quality.js';
import { rendererSystem } from './render/renderer.js';
import { textureSystem } from './render/textures.js';
import { skySystem } from './sky/dome.js';
import { whaleSystem } from './sky/whale.js';
import { cursorSystem } from './ui/cursor.js';
import { glyphSystem } from './ui/glyphs.js';
import { hudSystem } from './ui/hud.js';
import { placeSystem } from './ui/places.js';
import { promptSystem } from './ui/prompt.js';
import { routerSystem } from './ui/router.js';
import { titleSystem } from './ui/title.js';
import { touchSystem } from './ui/touch.js';
import { roadSystem } from './world/roads.js';
import { flowerSystem } from './world/scenery/flowers.js';
import { grassSystem } from './world/scenery/grass.js';
import { lampSystem } from './world/scenery/lamps.js';
import { pondSystem } from './world/scenery/pond.js';
import { rockSystem } from './world/scenery/rocks.js';
import { shardSystem } from './world/scenery/shards.js';
import { signpostSystem } from './world/scenery/signpost.js';
import { treeSystem } from './world/scenery/trees.js';
import { terrainSystem } from './world/terrain-mesh.js';
import { undersideSystem } from './world/underside.js';

loop.use([
    cameraSystem, rendererSystem, textureSystem, partMeshSystem, soundSystem, musicSystem, nightSystem, skySystem,
    terrainSystem, undersideSystem, roadSystem, pondSystem, signpostSystem,
    glyphSystem,        // key or button glyphs, for whatever was pressed last
    cursorSystem,       // the mouse pointer hides while you play
    titleSystem,        // on the title screen, Enter starts the game
    touchSystem,        // the on-screen buttons on a phone or tablet
    routerSystem,       // input goes to an open dialog or card, or the current activity, before the mothling moves
    playerSystem,
    ...features,
    // scenery is scattered after the features, around the clearings they keep
    lampSystem, grassSystem, treeSystem, rockSystem, flowerSystem, shardSystem, ambientSystem, whaleSystem,
    interactionSystem, placeSystem, hudSystem, promptSystem, qualitySystem,
    inputSystem,        // last: forget this frame's touch presses
]);

// load the save before the engine starts, since a file backend may need a moment
await storage.init();
loadSave();
engineInit(()=> loop.build(), ()=> loop.update(), ()=> loop.updatePost(), ()=> loop.render(), ()=> {});
