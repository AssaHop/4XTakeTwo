// 📂 mechanics/lineOfSight.js
import { getHexLineDual } from './hexUtils.js';
import { WeaponTypes } from '../core/modules/weaponTypes.js';

const blockingTerrains = {};
for (const [key, val] of Object.entries(WeaponTypes)) {
  blockingTerrains[key] = val.blockLOS || [];
}

export function hasLineOfSight(attacker, target, map, weType = "Main") {
  const steps = getHexLineDual(attacker, target);
  const weaponTypes = Array.isArray(weType) ? weType : [weType];

  return weaponTypes.some(type => {
    const blocked = blockingTerrains[type] || [];
    for (let i = 1; i < steps.length - 1; i++) {
      // On a boundary, steps[i] has two candidates.  Block only if ALL candidates
      // are blocking terrain — if either side of the edge is open, the shot passes.
      const allBlock = steps[i].every(hex => {
        const tile = map[`${hex.q},${hex.r},${hex.s}`];
        return !tile || blocked.includes(tile.terrainType);
      });
      if (allBlock) return false;
    }
    return true;
  });
}
