// Engine-facing builders: matrices, canvas textures, triangle meshes, 3D objects.
import { EngineObject3D, Mesh, TextureInfo, WHITE, buildMatrix } from './engine.js';

// matrix from a parent with a local transform
export function mtx(parent, pos, rot, scale)
{
    const m = buildMatrix(pos, rot, scale);
    return parent ? parent.copy().multiply(m) : m;
}
export function canvasTexture(size, draw, wrap = true)
{
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    return new TextureInfo(c, true, wrap);
}
// a mesh made only of triangles, from flat arrays
export function triMesh(points, indices, normals, colors, uvs)
{
    const m = new Mesh;
    m.addTriangles(points, indices, normals, uvs, colors);
    return m;
}
export function obj3(pos, mesh, color = WHITE, opts = {})
{
    const o = new EngineObject3D(pos, mesh, undefined, color);
    Object.assign(o, opts);
    return o;
}
