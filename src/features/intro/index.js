// The first time you enter the dream, a short cutscene shows you where you are.
import { events } from '../../game/events.js';
import { playIntro } from './scene.js';

export const introFeature = {
    build() { events.on('dream-started', ({ first })=> { if (first) setTimeout(playIntro, 200); }); },
};
