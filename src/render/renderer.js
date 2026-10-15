// The 3D renderer: set up before anything is built, with its bloom pass added once everything exists.
import { MOBILE, Render3DPlugin, postProcessBloom, render3D } from '../platform/engine.js';
import { MOON_DIR } from '../sky/directions.js';

export const rendererSystem = {
    build()
    {
        new Render3DPlugin;
        render3D.camera.far = 3000;
        render3D.smoothShading = true;
        render3D.sunDirection = MOON_DIR;
        render3D.shadows = true;
        render3D.shadowMapSize = MOBILE ? 1024 : 2048;
        render3D.shadowRange = 46;
        render3D.shadowBias = .002;
    },
    buildLate() { postProcessBloom(.6, 1.05, 10); },
};
