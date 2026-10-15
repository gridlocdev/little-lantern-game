import {
    MOBILE, Render3DPlugin, audioContext, engineInit, gamepadWasPressed, inputClear, keyWasPressed,
    postProcessBloom, render3D, setSoundVolume, timeReal, vec3,
} from './platform/engine.js';
import {
    StarPillars, buildChimes, buildMoonlet, buildMushrooms, buildOverlook, buildPier, buildPondFishing, buildSheep,
    buildSwing, buildTelescope, checkMoonletVisit, updateStarFall,
} from './activities.js';
import { music, musicStart, musicUpdate } from './audio/music.js';
import { buildSounds } from './audio/sfx.js';
import { RippleDrawer } from './fishing.js';
import { activity } from './game/activity.js';
import { updateInteract } from './game/interact.js';
import { loadSave, loadSetting, save, state, writeSave } from './game/state.js';
import { buildHouseInterior, updateHouse } from './house.js';
import { clearTouchPresses, input } from './platform/input.js';
import { storage } from './platform/storage.js';
import { Mothling, setMoth } from './player/mothling.js';
import { updatePlayer } from './player/movement.js';
import { buildPartMeshes } from './player/part-meshes.js';
import { player } from './player/player.js';
import { buildAmbientFx, updateAmbientFx } from './render/ambient.js';
import { cam, updateCamera } from './render/camera.js';
import { setGraphics, trackFrameRate, watchFrameRate } from './render/quality.js';
import { makeTextures } from './render/textures.js';
import { MOON_DIR, buildSky, setPalette, updateSky } from './sky/dome.js';
import { spawnWhale } from './sky/whale.js';
import { say, updateDialog } from './ui/dialog.js';
import { $, ui, uiOpen } from './ui/dom.js';
import { updateHud } from './ui/hud.js';
import { openJournal } from './ui/journal.js';
import { openMenu } from './ui/menu.js';
import { updateModals } from './ui/modal.js';
import { updatePlaces } from './ui/places.js';
import { updatePrompt } from './ui/prompt.js';
import { showPlace } from './ui/toast.js';
import { buildBenchArea, buildHouseExterior, buildSnail } from './village.js';
import { P } from './world/layout.js';
import { buildRoads } from './world/roads.js';
import { buildFlowers } from './world/scenery/flowers.js';
import { buildGrass, updateGrass } from './world/scenery/grass.js';
import { buildLamps } from './world/scenery/lamps.js';
import { buildPond } from './world/scenery/pond.js';
import { buildRocks } from './world/scenery/rocks.js';
import { buildShards, updateShards } from './world/scenery/shards.js';
import { buildSignpost } from './world/scenery/signpost.js';
import { buildTrees } from './world/scenery/trees.js';
import { buildTerrain } from './world/terrain-mesh.js';
import { heightAt } from './world/terrain.js';
import { buildUnderside } from './world/underside.js';

function gameInit()
{
    loadSave();
    const v = parseFloat(loadSetting('volume')); if (v >= 0 && v <= 1) setSoundVolume(v);
    music.on = save.music !== false;
    new Render3DPlugin;
    render3D.camera.far = 3000;
    render3D.smoothShading = true;
    render3D.sunDirection = MOON_DIR;
    render3D.shadows = true;
    render3D.shadowMapSize = MOBILE ? 1024 : 2048;
    render3D.shadowRange = 46;
    render3D.shadowBias = .002;
    makeTextures(); buildPartMeshes(); buildSounds();
    buildSky(); setPalette(save.palette);
    buildTerrain(); buildUnderside(); buildRoads();
    buildPond(); buildPondFishing(); buildHouseExterior(); buildBenchArea(); buildSignpost(); buildSnail();
    buildSwing(); buildChimes(); buildMoonlet(); buildMushrooms(); buildOverlook(); buildTelescope(); buildPier(); buildSheep();
    buildLamps(); buildGrass(); buildTrees(); buildRocks(); buildFlowers(); buildShards(); buildAmbientFx();
    buildHouseInterior();
    spawnWhale();
    new StarPillars; new RippleDrawer;
    postProcessBloom(.6, 1.05, 10);
    const g = loadSetting('graphics');
    setGraphics(g ? g === 'low' : MOBILE, true);
    player.pos = vec3(P.spawn.x, heightAt(P.spawn.x, P.spawn.z), P.spawn.z);
    player.lastSafe = player.pos.copy();
    player.yaw = Math.atan2(-(P.pond.x - P.spawn.x), -(P.pond.z - P.spawn.z));
    cam.yaw = player.yaw; cam.pitch = .28;
    setMoth(new Mothling);
    $('startBtn').textContent = save.visits || Object.keys(save.fish).length ? 'Return to the dream' : 'Enter the dream';
}
function startGame()
{
    if (state.mode !== 'title') return;
    state.mode = 'play';
    $('title').hidden = true;
    $('hud').hidden = false;
    $('touch').hidden = !MOBILE;
    try { audioContext && audioContext.resume(); } catch (e) {}
    musicStart();
    cam.look = player.pos.add(vec3(0, 1.1, 0));
    inputClear();
    const first = !save.visits && !Object.keys(save.fish).length;
    if (first)
    {
        save.visits = 0; writeSave();
        setTimeout(()=> say('', [
            'You wake up on a little island floating through the night, with a lantern in your hand.',
            'The pond nearby is full of stars. Your house is right there, with the door open. There is no hurry for anything.',
        ]), 900);
    }
    else setTimeout(()=> showPlace('Violet Isle', 'welcome back'), 600);
}
$('startBtn').onclick = startGame;

function gameUpdate()
{
    updateGrass();
    updateShards();
    musicUpdate();
    if (state.mode === 'title')
    {
        if (keyWasPressed('Enter') || gamepadWasPressed(0) || gamepadWasPressed(9)) startGame();
        return;
    }
    if (ui.dialog) updateDialog();
    else if (ui.modal) updateModals();
    else
    {
        if (!activity.current && (keyWasPressed('Escape') || gamepadWasPressed(9))) openMenu();
        else if (activity.current && gamepadWasPressed(9)) openMenu();
        else if (!activity.current && input.journal()) openJournal();
        else if (activity.current) activity.current.update();
    }
    updatePlayer();
    updateHouse();
    updateInteract(player, state.mode === 'play' && !activity.current && !uiOpen());
    updateStarFall();
    checkMoonletVisit();
    updatePlaces();
    updateAmbientFx();
    updateHud();
    updatePrompt();
    watchFrameRate();
    clearTouchPresses();
}
function gameUpdatePost()
{
    if (state.mode === 'title')
    {
        const a = timeReal * .03 + 2.2;
        render3D.camera.orbit(vec3(0, -6, 0), 175, a, .32);
    }
    else updateCamera();
    updateSky();
    render3D.shadowCenter = player.pos.add(vec3(0, 1, 0));
}
function gameRender() { trackFrameRate(); }
function gameRenderPost() {}
// load the save before the engine starts, since a file backend may need a moment
storage.init().then(()=> engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost));
