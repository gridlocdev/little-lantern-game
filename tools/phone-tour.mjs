// A tour of the game on a phone, for tools/phone.mjs: every screen, the touch buttons, a dialog, a card that scrolls,
// leaving an activity with Back. Prints what it checked and saves a screenshot of each step.
//
//   npx electron tools/phone.mjs tools/phone-tour.mjs                        (just phone)
//   PHONE_W=844 PHONE_H=390 npx electron tools/phone.mjs tools/phone-tour.mjs (on its side)
export default async ({ tap, drag, touch, shot, js, wait, el, W, H })=>
{
    const failures = [];
    const check = (name, ok, detail = '')=> { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); if (!ok) failures.push(name); };
    // the game's own modules, the same instances main.js loaded
    const mod = (path, expr)=> js(`import('/src/${path}').then((m)=> ${expr})`);

    check('treated as a phone', await js(`document.body.classList.contains('touch')`));
    await shot('title');
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

    // the menu, and a tap outside it closes it
    await tap(...await el('#btnMenu'));
    await wait(400);
    await shot('menu');
    check('menu opens', !!(await el('#menu .card')));
    check('touch buttons hide under a card', !(await el('#tAct')));
    check('look speed slider shown', !!(await el('#mouseSlider')));
    await tap(8, H - 8);
    await wait(400);
    check('a tap outside the menu closes it', !(await el('#menu .card')));

    // the journal scrolls under a finger
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
        const [jx, jy] = await el('#jBody');
        await drag([jx, jy + 120], [jx, jy - 120], 400);
        await wait(500);
        const top = await js(`document.querySelector('#journal .card').scrollTop`);
        check('the journal scrolls under a finger', top > 20, `scrollTop ${top}`);
        await shot('journal-scrolled');
    }
    else console.log('skip journal scroll: it fits on this screen');
    await tap(...await el('#jClose'));
    await wait(400);

    // a dialog: one tap finishes the typing, the next turns the page, the last closes it
    await mod('ui/dialog.js', `m.say('Oswin', ['A tip, from one athlete to another: push your thumb all the way out, and those little legs will really go.', 'Second page.'])`);
    await wait(300);
    await shot('dialog');
    check('touch buttons hide under a dialog', !(await el('#tAct')));
    const sheet = await el('#dialog .sheet');
    const page = ()=> mod('ui/dom.js', 'm.ui.dialog ? m.ui.dialog.i : -1');
    await tap(...sheet); await wait(250);
    check('a tap while typing shows the whole line, and stays on it', await page() === 0, `page ${await page()}`);
    await tap(...sheet); await wait(250);
    check('the next tap turns the page', await page() === 1, `page ${await page()}`);
    await wait(1500);
    await tap(...sheet); await wait(250);
    check('the last tap closes it', await page() === -1);

    // an activity: Back appears and leaves it
    await js(`Promise.all([import('/src/game/activity.js'), import('/src/platform/input.js')]).then(([a, i])=> a.activity.start({ name: 'tour', hint: ()=> '{back}|Leave', update() { if (i.input.back()) a.activity.end(); } }))`);
    await wait(300);
    await shot('activity');
    const back = await el('#tBack');
    check('Back shown during an activity', !!back);
    check('the prompt names the Back button', /Back/.test(await js(`document.getElementById('prompt').textContent`)));
    if (back) { await tap(...back); await wait(300); }
    check('Back leaves the activity', await mod('game/activity.js', '!m.activity.current'));

    // the meter, where fishing and the race show it
    await js(`(()=>{ const m = document.getElementById('meter'); m.hidden = false; document.getElementById('meterBox').innerHTML = '<div class="label"><span>Cast distance</span><span>6.0 m</span></div><div class="track"><div class="fill" style="width:60%"></div></div>'; })()`);
    await shot('meter');
    const meter = await js(`document.getElementById('meterBox').getBoundingClientRect().bottom`);
    const buttons = await js(`document.getElementById('touch').getBoundingClientRect().top`);
    check('the meter clears the touch buttons', meter < buttons, `meter bottom ${meter.toFixed(0)}, buttons top ${buttons.toFixed(0)}`);
    await js(`document.getElementById('meter').hidden = true`);

    // the storybook, opened as the bookshelf does
    await mod('ui/storybook.js', `m.openStorybook({ title: 'The Moth Who Kept the Light', pages: ['Once there was a moth who carried a lantern across the whole of the night.', 'The end.'] })`);
    await wait(1500);
    await shot('storybook');
    const [bx, by] = await el('#storybook .sb-page');
    await tap(bx + 60, by);
    check('a tap on the page turns it', await mod('ui/storybook.js', 'm.storybook.takeTap()') === 'next');
    await mod('ui/storybook.js', 'm.storybook.close()');

    if (failures.length) throw new Error(`${failures.length} check(s) failed: ${failures.join('; ')}`);
};
