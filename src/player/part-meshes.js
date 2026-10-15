// Primitive meshes shared by the mothling and the scenery that draws with it.
import { buildBox, buildCapsule, buildCone, buildCylinder, buildSphere, buildTorus } from '../platform/engine.js';

export let SPH, SPH_LO, CAPS, TORUS, CYL, CONE, BOXM;
export function buildPartMeshes()
{
    SPH = buildSphere(1, 18, 12, true);
    SPH_LO = buildSphere(1, 10, 7, true);
    CAPS = buildCapsule(.5, 1, 10, 4, true); // scale by (2*diameter, length, 2*diameter)
    TORUS = buildTorus(1, .34, 22, 10, true);
    CYL = buildCylinder(1, 1, 10, true);
    CONE = buildCone(1, 1, 10, true);
    BOXM = buildBox(1);
}
