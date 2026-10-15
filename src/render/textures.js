// Canvas-drawn textures shared by the world and the house.
import { PI, noise2D } from '../platform/engine.js';
import { TAU } from '../lib/math.js';
import { canvasTexture } from '../platform/mesh.js';

export let texDetail, texCobble, texPlank, texRoof, texStone, texRug, texWallpaper, texBook;
function makeTextures()
{
    texDetail = canvasTexture(256, (g, s)=>
    {
        const img = g.createImageData(s, s);
        for (let y = 0; y < s; y++)
        for (let x = 0; x < s; x++)
        {
            const n = noise2D(x / 9, y / 9) * .5 + noise2D(x / 3.1, y / 3.1) * .35 + Math.random() * .15;
            const v = 200 + n * 55, k = (y * s + x) * 4;
            img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        g.globalAlpha = .18;
        for (let i = 0; i < 900; i++)
        {
            const x = Math.random() * s, y = Math.random() * s, l = 4 + Math.random() * 8, a = -PI / 2 + (Math.random() - .5) * .8;
            g.strokeStyle = Math.random() < .5 ? '#fff' : '#555';
            g.lineWidth = 1;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
        }
    });
    texCobble = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#6b6388'; g.fillRect(0, 0, s, s);
        const rows = 8, rh = s / rows;
        for (let r = 0; r < rows; r++)
        {
            let x = (r % 2) * -18;
            while (x < s)
            {
                const w = 26 + Math.random() * 22;
                const edge = x < 34 || x + w > s - 34;
                const l = edge ? 66 + Math.random() * 8 : 78 + Math.random() * 12;
                g.fillStyle = `hsl(${255 + Math.random() * 25},${12 + Math.random() * 10}%,${l}%)`;
                const px = x + 2.5, py = r * rh + 2.5, pw = w - 5, ph = rh - 5;
                g.beginPath();
                g.roundRect ? g.roundRect(px, py, pw, ph, 7) : g.rect(px, py, pw, ph);
                g.fill();
                g.fillStyle = 'rgba(255,255,255,.12)';
                g.fillRect(px + 3, py + 2, pw - 6, 3);
                x += w;
            }
        }
    });
    texPlank = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#9aa0bd'; g.fillRect(0, 0, s, s);
        for (let y = 0; y < s; y += 32)
        {
            g.fillStyle = `hsl(${228 + Math.random() * 20},18%,${58 + Math.random() * 10}%)`;
            g.fillRect(0, y, s, 32);
            g.fillStyle = 'rgba(30,25,60,.45)'; g.fillRect(0, y, s, 3);
            for (let k = 0; k < 30; k++)
            {
                g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(20,20,50,.08)';
                g.fillRect(Math.random() * s, y + 5 + Math.random() * 24, 20 + Math.random() * 70, 1.5);
            }
            const seam = Math.random() * s;
            g.fillStyle = 'rgba(30,25,60,.4)'; g.fillRect(seam, y, 2, 32);
        }
    });
    texRoof = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#2a2a6e'; g.fillRect(0, 0, s, s);
        const rows = 10, rh = s / rows;
        for (let r = 0; r < rows; r++)
        for (let x = (r % 2) * -12; x < s; x += 24)
        {
            g.fillStyle = `hsl(${238 + Math.random() * 18},45%,${30 + Math.random() * 10}%)`;
            g.beginPath();
            g.moveTo(x + 1, r * rh); g.lineTo(x + 23, r * rh); g.lineTo(x + 23, r * rh + rh * .75);
            g.quadraticCurveTo(x + 12, r * rh + rh + 3, x + 1, r * rh + rh * .75); g.closePath(); g.fill();
        }
    });
    texStone = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#5b5470'; g.fillRect(0, 0, s, s);
        for (let i = 0; i < 70; i++)
        {
            const x = Math.random() * s, y = Math.random() * s, w = 30 + Math.random() * 40, h = 20 + Math.random() * 22;
            g.fillStyle = `hsl(${250 + Math.random() * 20},10%,${38 + Math.random() * 18}%)`;
            g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, TAU); g.fill();
        }
    });
    texRug = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#5a2f6e'; g.fillRect(0, 0, s, s);
        g.strokeStyle = '#e8c27a'; g.lineWidth = 6; g.strokeRect(14, 14, s - 28, s - 28);
        g.strokeStyle = '#9b6bd6'; g.lineWidth = 4; g.strokeRect(30, 30, s - 60, s - 60);
        g.fillStyle = '#e8c27a';
        for (let i = 0; i < 5; i++)
        {
            const cx = s / 2, cy = s / 2, r = 18 + i * 16;
            g.beginPath();
            for (let k = 0; k < 10; k++)
            {
                const a = k / 10 * TAU - PI / 2, rad = k % 2 ? r * .45 : r;
                g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
            }
            g.closePath();
            g.globalAlpha = .35 - i * .05; g.fill(); g.globalAlpha = 1;
        }
    }, false);
    texWallpaper = canvasTexture(256, (g, s)=>
    {
        g.fillStyle = '#3b3474'; g.fillRect(0, 0, s, s);
        g.fillStyle = 'rgba(255,240,200,.18)';
        for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
        {
            const x = i * 64 + (j % 2) * 32 + 16, y = j * 64 + 16;
            g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
            g.fillStyle = '#3b3474'; g.beginPath(); g.arc(x + 4, y - 2, 8, 0, TAU); g.fill();
            g.fillStyle = 'rgba(255,240,200,.18)';
            g.fillRect(x + 22, y + 24, 2, 2);
        }
    });
}

export const textureSystem = { build: makeTextures };
