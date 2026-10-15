import {
    Render3DPlugin, audioContext, engineInit, gamepadWasPressed, inputClear, keyWasPressed, postProcessBloom,
    render3D, setSoundVolume, timeReal, vec3,
} from './platform/engine.js';
import {
    StarPillars, buildChimes, buildMoonlet, buildMushrooms, buildOverlook, buildPier, buildPondFishing, buildSheep,
    buildSwing, buildTelescope, checkMoonletVisit, updateStarFall,
} from './activities.js';
import { buildSounds, music, musicStart, musicUpdate } from './audio.js';
import {
    activity, cam, clearTouchPresses, gameMode, input, setGameMode, updateCamera, updateInteract, updatePlayer,
} from './controls.js';
import { MOBILE } from './core.js';
import { RippleDrawer } from './fishing.js';
import { buildAmbientFx, updateAmbientFx } from './fx.js';
import { buildHouseInterior, updateHouse } from './house.js';
import { Mothling, buildPartMeshes, player, setMoth } from './player.js';
import { loadSave, loadSetting, save, storage, writeSave } from './save.js';
import { MOON_DIR, StarWhale, buildSky, setPalette, updateSky } from './sky.js';
import {
    $, openJournal, openMenu, say, setGraphics, showPlace, trackFrameRate, ui, updateDialog, updateHud,
    updateModals, updatePlaces, updatePrompt, watchFrameRate,
} from './ui.js';
import { buildBenchArea, buildHouseExterior, buildPond, buildSignpost, buildSnail } from './village.js';
import {
    P, buildFlowers, buildGrass, buildLamps, buildRoads, buildRocks, buildShards, buildTerrain, buildTrees,
    buildUnderside, heightAt, makeTextures, updateGrass, updateShards,
} from './world.js';

// ================================================================ MAIN
export let whale;
export const camNear = (p, d)=> render3D.camera.pos.distanceSquared(p) < d * d;
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
    whale = new StarWhale;
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
    if (gameMode !== 'title') return;
    setGameMode('play');
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
    if (gameMode === 'title')
    {
        if (keyWasPressed('Enter') || gamepadWasPressed(0) || gamepadWasPressed(9)) startGame();
        return;
    }
    if (ui.dialog) updateDialog();
    else if (ui.modal) updateModals();
    else
    {
        if (!activity && (keyWasPressed('Escape') || gamepadWasPressed(9))) openMenu();
        else if (activity && gamepadWasPressed(9)) openMenu();
        else if (!activity && input.journal()) openJournal();
        else if (activity) activity.update();
    }
    updatePlayer();
    updateHouse();
    updateInteract();
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
    if (gameMode === 'title')
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
