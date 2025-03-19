// mechanics/lineOfSight.js
import { getHexLine } from './hexUtils.js';

const blockingTerrains = {
  Main: ["peak"],
  Small: ["mount", "peak"],
  Torp: ["land", "hill", "mount", "peak"]
};

export function hasLineOfSight(attacker, target, map, weType = "Main") {
  const line = getHexLine(attacker, target);
  const blocked = blockingTerrains[weType] || [];

  for (let i = 1; i < line.length - 1; i++) {
    const hex = line[i];
    const tile = map.flat().find(c => c.q === hex.q && c.r === hex.r && c.s === hex.s);
    if (!tile || blocked.includes(tile.terrainType)) return false;
  }

  return true;
}
