// mechanics/lineOfSight.js
import { getHexLine } from './hexUtils.js';

const blockingTerrains = {
  Main: ["Peak"],
  Small: ["Mount", "Peak"],
  Torp: ["Land", "Hill", "Mount", "Peak"]
};

export function hasLineOfSight(attacker, target, map, weaponType = "Main") {
  const line = getHexLine(attacker, target);
  const blocked = blockingTerrains[weaponType] || [];

  for (let i = 1; i < line.length - 1; i++) {
    const hex = line[i];
    const tile = map.getTile(hex.q, hex.r, hex.s);
    if (blocked.includes(tile.terrainType)) return false;
  }

  return true;
}