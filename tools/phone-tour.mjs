// A tour of the game on a phone, for tools/phone.mjs: every screen, the touch buttons, a dialog, a card that scrolls,
// leaving an activity with Back. Prints what it checked and saves a screenshot of each step.
//
//   npx electron tools/phone.mjs tools/phone-tour.mjs                        (just phone)
//   PHONE_W=844 PHONE_H=390 npx electron tools/phone.mjs tools/phone-tour.mjs (on its side)
export default async ({ tap, drag, touch, shot, js, wait, el, W, H, step })=>
{
    const failures = [];
    const check = (name, ok, detail = '')=> { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); if (!ok) failures.push(name); };
    // the game's own modules, the same instances main.js loaded
    const mod = (path, expr)=> js(`import('/src/${path}').then((m)=> ${expr})`);

    check('treated as a phone', await js(`document.body.classList.contains('touch')`));
    // the engine draws on the browser's frames; a window the system throttles draws a few a second, and taps timed in
    // game time would land early
    const f0 = await mod('platform/engine.js', 'm.frame');
    await wait(1000);
    const fps = await mod('platform/engine.js', 'm.frame') - f0;
    check('frames are drawn steadily', fps > 30, `${fps} frames in 1 s`);
    // waits for a condition in the page, up to a limit; true if it came
    const until = async (expr, ms = 4000)=> { for (let t = 0; t < ms; t += 100) { if (await js(expr)) return true; await wait(100); } return false; };
    await shot('title');
    // a card fits the screen: nothing scrolls out of sight, whichever way the phone is held
    const fits = (sel)=> js(`(()=>{ const c = document.querySelector(${JSON.stringify(sel)}); const r = c.getBoundingClientRect(); return [c.scrollHeight - c.clientHeight, Math.round(r.top), Math.round(r.bottom)]; })()`);
    const fitCheck = async (name, sel)=> { const [over, top, bottom] = await fits(sel); check(`${name} fits without scrolling`, over <= 2 && top >= 0 && bottom <= H, `${over} px hidden, card ${top} to ${bottom} of ${H}`); };
    await fitCheck('the title', '#title .card');
    await tap(...await el('#startBtn'));
    await wait(2500);
    if (await el('#cineSkip')) { await shot('intro'); await tap(...await el('#cineSkip')); await wait(1500); }
    await wait(1000);
    await shot('playing');
    check('Use and Jump shown', !!(await el('#tAct')) && !!(await el('#tJump')));
    check('Back hidden while walking about', !(await el('#tBack')));

    // look around with a drag on the right, while a thumb holds the stick on the left
    const yaw0 = await mod('render/camera.js', 'm.cam.yaw');
    await drag([W * .75, H * .4], [W * .45, H * .45], 500, 12, [W * .15, H * .8]);
    const yaw1 = await mod('render/camera.js', 'm.cam.yaw');
    check('dragging the world turns the camera, with a thumb on the stick', Math.abs(yaw1 - yaw0) > .05, `yaw ${yaw0.toFixed(2)} → ${yaw1.toFixed(2)}`);
    await shot('looked');
    // the same in the bottom-right quarter, just above Use and Jump, where the engine's stick zone once reached
    const lowR = [W * .78, H * .62], lowR2 = [W * .55, H * .64];
    const under = await js(`(()=>{ const e = document.elementFromPoint(${lowR[0]}, ${lowR[1]}); return e ? e.tagName + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : '') : 'nothing'; })()`);
    check('the world is under a finger above the buttons', under.startsWith('CANVAS'), under);
    // the stick's zone is the bottom-left quarter, whatever the screen
    const zone = await js(`(()=>{ const z = document.querySelector('.stick-zone'); if (!z) return null; const r = z.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); })()`);
    const quarter = zone && Math.abs(zone[0]) <= 1 && Math.abs(zone[2] - W / 2) <= 2 && Math.abs(zone[3] - H / 2) <= 2 && Math.abs(zone[1] + zone[3] - H) <= 2;
    check('the stick listens on the bottom-left quarter', !!quarter, zone ? `left ${zone[0]}, top ${zone[1]}, ${zone[2]} x ${zone[3]}` : 'no stick zone found');
    const stick = await js(`Math.round(document.querySelector('.stick-zone')?.getBoundingClientRect().width ?? 0) && import('/src/platform/engine.js').then((m)=> m.touchGamepadSize ?? null)`);
    console.log(`     stick size: ${stick ?? 'not exported by the engine'}; Use is ${(await js(`document.getElementById('tAct').getBoundingClientRect().width`)).toFixed(0)} px`);
    // a touch on the stick's outer ring, not its knob, takes the stick and pushes it that way; the ring is centred one
    // size in from the corner and is half the size across
    const S = await mod('platform/engine.js', 'm.touchGamepadSize');
    for (const [name, dx, dy] of [['right', 1, 0], ['up', 0, -1], ['left', -1, 0]])
    {
        const at = [S + dx * S * .45, H - S + dy * S * .45];
        await touch([at]); await wait(150);
        const v = await mod('platform/engine.js', '(({x, y})=> [x, y])(m.gamepadStick(0))');
        await touch([]); await wait(150);
        const along = v[0] * dx + v[1] * -dy;     // the stick's y is up
        check(`a touch on the stick's ring (${name}) pushes it that way`, along > .5, `stick ${v.map((n)=> n.toFixed(2)).join(', ')}`);
    }
    const yawA = await mod('render/camera.js', 'm.cam.yaw');
    await drag(lowR, lowR2, 500);
    const yawB = await mod('render/camera.js', 'm.cam.yaw');
    check('dragging just above Use and Jump turns the camera', Math.abs(yawB - yawA) > .05, `yaw ${yawA.toFixed(2)} → ${yawB.toFixed(2)}`);

    // pinch: two fingers on the right, apart
    const d0 = await mod('render/camera.js', 'm.cam.distT');
    const cx = W * .7, cy = H * .35;
    for (let i = 0; i <= 10; i++) { const s = 20 + i * 8; await touch([[cx - s, cy], [cx + s, cy]]); await wait(30); }
    await touch([]);
    await wait(300);
    const d1 = await mod('render/camera.js', 'm.cam.distT');
    check('pinching apart zooms in', d1 < d0, `distance ${d0.toFixed(1)} → ${d1.toFixed(1)}`);

    // jump
    const y0 = await mod('player/player.js', 'm.player.pos.y');
    await tap(...await el('#tJump'));
    await wait(250);
    const y1 = await mod('player/player.js', 'm.player.pos.y');
    check('Jump jumps', y1 > y0 + .1, `height ${y0.toFixed(2)} → ${y1.toFixed(2)}`);
    await wait(1200);

    step('menu');
    await tap(...await el('#btnMenu'));
    await wait(400);
    await shot('menu');
    check('menu opens', !!(await el('#menu .card')));
    await fitCheck('the menu', '#menu .card');
    check('touch buttons hide under a card', !(await el('#tAct')));
    check('look speed slider shown', !!(await el('#mouseSlider')));
    await tap(8, H - 8);
    await wait(400);
    check('a tap outside the menu closes it', !(await el('#menu .card')));

    step('journal');
    await tap(...await el('#btnJournal'));
    await wait(400);
    for (const tab of ['island', 'fish', 'sky'])
    {
        await tap(...await el(`#journal [data-tab="${tab}"]`));
        await wait(200);
        if (await js(`(()=>{ const c = document.querySelector('#journal .card'); return c.scrollHeight > c.clientHeight + 4; })()`)) break;
    }
    await shot('journal');
    const long = await js(`(()=>{ const c = document.querySelector('#journal .card'); return c.scrollHeight > c.clientHeight + 4; })()`);
    if (long)
    {
        // the card's centre (it fits the screen, so finding it scrolls nothing); the list inside is what moves
        const [jx, jy] = await el('#journal .card');
        await drag([jx, jy + 120], [jx, jy - 120], 400);
        await wait(500);
        const top = await js(`document.querySelector('#journal .card').scrollTop`);
        check('the journal scrolls under a finger', top > 20, `scrollTop ${top}`);
        await shot('journal-scrolled');
    }
    else console.log('skip journal scroll: it fits on this screen');
    step('close the journal');
    await tap(...await el('#jClose'));
    await wait(400);

    step('dialog');
    // say() resolves only when the dialog closes, so it is started, not waited for
    await mod('ui/dialog.js', `void m.say('Oswin', ['A tip, from one athlete to another: push your thumb all the way out, and those little legs will really go.', 'Second page.'])`);
    await wait(300);
    await shot('dialog');
    check('touch buttons hide under a dialog', !(await el('#tAct')));
    const sheet = await el('#dialog .sheet');
    const page = ()=> mod('ui/dom.js', 'm.ui.dialog ? m.ui.dialog.i : -1');
    await tap(...sheet); await wait(250);
    check('a tap while typing shows the whole line, and stays on it', await page() === 0, `page ${await page()}`);
    await tap(...sheet); await wait(250);
    check('the next tap turns the page', await page() === 1, `page ${await page()}`);
    // the last page typed out, then a tap closes it
    await until(`import('/src/ui/dom.js').then((m)=> !!m.ui.dialog?.line?.done)`);
    await wait(300);
    await tap(...sheet); await wait(300);
    const left = await js(`Promise.all([import('/src/ui/dom.js'), import('/src/platform/engine.js')]).then(([d, e])=> d.ui.dialog ? { page: d.ui.dialog.i, typed: d.ui.dialog.line.done, since: +(e.timeReal - d.ui.dialog.opened).toFixed(2) } : null)`);
    check('the last tap closes it', left === null, left && JSON.stringify(left));
    // the rest needs the dialog gone
    if (left) { await mod('ui/dialog.js', 'm.advanceDialog()'); await wait(300); }

    step('activity');
    await js(`Promise.all([import('/src/game/activity.js'), import('/src/platform/input.js')]).then(([a, i])=> a.activity.start({ name: 'tour', hint: ()=> '{back}|Leave', update() { if (i.input.back()) a.activity.end(); } }))`);
    await wait(300);
    await shot('activity');
    const back = await el('#tBack');
    check('Back shown during an activity', !!back);
    check('the prompt names the Back button', /Back/.test(await js(`document.getElementById('prompt').textContent`)));
    const [pr, bk] = await js(`[document.querySelector('#prompt > div').getBoundingClientRect().bottom, document.getElementById('tBack').getBoundingClientRect().top]`);
    check('the prompt clears the Back button', pr <= bk, `prompt bottom ${pr.toFixed(0)}, Back top ${bk.toFixed(0)}`);
    if (back) { await tap(...back); await wait(300); }
    check('Back leaves the activity', await mod('game/activity.js', '!m.activity.current'));

    step('meter');
    await js(`(()=>{ const m = document.getElementById('meter'); m.hidden = false; document.getElementById('meterBox').innerHTML = '<div class="label"><span>Cast distance</span><span>6.0 m</span></div><div class="track"><div class="fill" style="width:60%"></div></div>'; })()`);
    await wait(200);     // a frame to paint it
    await shot('meter');
    const meter = await js(`document.getElementById('meterBox').getBoundingClientRect().bottom`);
    const buttons = await js(`document.getElementById('touch').getBoundingClientRect().top`);
    check('the meter clears the touch buttons', meter < buttons, `meter bottom ${meter.toFixed(0)}, buttons top ${buttons.toFixed(0)}`);
    await js(`document.getElementById('meter').hidden = true`);

    step('storybook');
    await mod('ui/storybook.js', `m.openStorybook({ title: 'The Moth Who Kept the Light', pages: ['Once there was a moth who carried a lantern across the whole of the night.', 'The end.'] })`);
    // the bookshelf types the page out each frame; here the tour does it
    for (let i = 0; i < 60; i++) { await mod('ui/storybook.js', 'm.storybook.update()'); await wait(50); }
    await shot('storybook');
    const [bx, by] = await el('#storybook .sb-page');
    await tap(bx + 60, by);
    check('a tap on the page turns it', await mod('ui/storybook.js', 'm.storybook.takeTap()') === 'next');
    await mod('ui/storybook.js', 'm.storybook.close()');

    if (failures.length) throw new Error(`${failures.length} check(s) failed: ${failures.join('; ')}`);
};
