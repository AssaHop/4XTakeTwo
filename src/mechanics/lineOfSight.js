// 📂 mechanics/lineOfSight.js
import { getHexLine } from './hexUtils.js';
import { WeaponTypes } from '../core/modules/weaponTypes.js';

const blockingTerrains = {};
for (const [key, val] of Object.entries(WeaponTypes)) {
  blockingTerrains[key] = val.blockLOS || [];
}

export function hasLineOfSight(attacker, target, map, weType = "Main") {
  const line = getHexLine(attacker, target);
  const weaponTypes = Array.isArray(weType) ? weType : [weType];

  return weaponTypes.some(type => {
    const blocked = blockingTerrains[type] || [];
    for (let i = 1; i < line.length - 1; i++) {
      const hex = line[i];
      const tile = map.flat().find(c => c.q === hex.q && c.r === hex.r && c.s === hex.s);
      if (!tile || blocked.includes(tile.terrainType)) return false;
    }
    return true;
  });
}
