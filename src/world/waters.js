// Bodies of water you can stand at the edge of. The world and features register them as they build; fishing turns
// each into a place to fish. A water: { kind, reach, r, pos(), center(), clamp(p), yaw?, zone? }
export const waters = [];
export const addWater = (w)=> { waters.push(w); return w; };
