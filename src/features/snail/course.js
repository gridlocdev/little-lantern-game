// The race course: the stretch of road from the line beside Oswin's spot to the light, with distances along it.
import { vec3 } from '../../platform/engine.js';
import { RACE } from './race-data.js';
import { dist2 } from '../../lib/math.js';
import { ROADS } from '../../world/road-field.js';
import { heightAt } from '../../world/terrain.js';

export const course = { pts: [], len: [], L: 0 };
export function buildCourse()
{
    const road = ROADS[RACE.road];
    const nearest = (p)=> road.reduce((best, q, i)=> dist2(q[0], q[1], p.x, p.z) < dist2(road[best][0], road[best][1], p.x, p.z) ? i : best, 0);
    const a = nearest(RACE.from), b = nearest(RACE.to);
    course.pts = (a < b ? road.slice(a, b + 1) : road.slice(b, a + 1).reverse()).map(([x, z])=> ({ x, z }));
    course.len = [0];
    for (let i = 1; i < course.pts.length; i++)
        course.len.push(course.len[i - 1] + dist2(course.pts[i - 1].x, course.pts[i - 1].z, course.pts[i].x, course.pts[i].z));
    course.L = course.len[course.len.length - 1];
}
// where the course is s metres from the line, and which way it runs there
export function along(s)
{
    s = Math.max(0, Math.min(course.L, s));
    let i = 1;
    while (i < course.len.length - 1 && course.len[i] < s) i++;
    const p = course.pts[i - 1], q = course.pts[i], seg = course.len[i] - course.len[i - 1] || 1, k = (s - course.len[i - 1]) / seg;
    return { x: p.x + (q.x - p.x) * k, z: p.z + (q.z - p.z) * k, dx: (q.x - p.x) / seg, dz: (q.z - p.z) / seg };
}
// a point in a racer's lane: side -1 is Oswin's, 1 is yours
export function lanePoint(s, side)
{
    const a = along(s);
    const x = a.x - a.dz * RACE.lane * side, z = a.z + a.dx * RACE.lane * side;
    return vec3(x, heightAt(x, z), z);
}
// how far along the course a point is, by the nearest vertex (plenty for who is ahead)
export function progressOf(x, z)
{
    let best = 0, bd = Infinity;
    course.pts.forEach((p, i)=> { const d = dist2(p.x, p.z, x, z); if (d < bd) { bd = d; best = i; } });
    return { s: course.len[best], off: bd };
}
export const startPoint = ()=> along(0);
export const lightPoint = ()=> along(course.L);
