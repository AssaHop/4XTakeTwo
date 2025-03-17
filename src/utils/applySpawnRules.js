// 📁 src/utils/applySpawnRules.js

import { getNeighbors } from '../world/map.js'; // ← подключаем getNeighbors оттуда, где он уже есть

export function applySpawnRules(tile, map, rules) {
  const type = tile.terrainType;
  const rule = rules.spawnRules?.[type];
  if (!rule) return;

  const neighbors = getNeighbors(tile.q, tile.r, tile.s);
  const neighborTypes = neighbors.map(({ q, r, s }) => {
    const t = map.find(t => t.q === q && t.r === r && t.s === s);
    return t?.terrainType || null;
  });

  // requiredNeighbors
  if (rule.requiredNeighbors && rule.condition) {
    const matchCount = neighborTypes.filter(n => n === rule.condition).length;
    if (matchCount < rule.requiredNeighbors) tile.terrainType = 'surf';
  }

  // prohibitedNeighbors
  if (rule.prohibitedNeighbors) {
    const prohibited = rule.prohibitedNeighbors.split(',');
    const hasProhibited = neighborTypes.some(t => prohibited.includes(t));
    if (hasProhibited) tile.terrainType = 'surf';
  }

  // probability
  if (rule.condition && rule.probability) {
    const match = neighborTypes.some(n => rule.condition.split(',').includes(n));
    if (match && Math.random() > rule.probability) {
      tile.terrainType = 'surf';
    }
  }
}
