// Runs the shared systems and features in the order main.js lists them. Each may have:
//   build()       once at start; the order is the order of draws from the seeded world random, so it must stay stable
//   buildLate()   once, after every build()
//   update()      every frame while playing; a system with always: true also updates on the title screen
//   updatePost()  every frame, after physics, for the camera and things that follow it
//   render()      every drawn frame
import { state } from './state.js';

const systems = [];

export const loop = {
    use(list) { systems.push(...list); },
    build()
    {
        for (const s of systems) s.build?.();
        for (const s of systems) s.buildLate?.();
    },
    update()
    {
        const playing = state.mode !== 'title';    // read once, so leaving the title screen takes effect next frame
        for (const s of systems) if (s.update && (s.always || playing)) s.update();
    },
    updatePost() { for (const s of systems) s.updatePost?.(); },
    render() { for (const s of systems) s.render?.(); },
};
