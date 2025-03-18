// 📁 src/utils/applySpawnRules.js

import { getTile, getNeighbors } from '../world/map.js';

export function applySpawnRules(tile, mapTiles, rules) {
  const rule = rules.spawnRules[tile.terrainType];
  if (!rule) return;

  const neighborCoords = tile.neighbors;
  const neighbors = neighborCoords.map(n => getTile(n.q, n.r, n.s)).filter(Boolean);

  // ✅ Условие: requiredNeighbors по типам из condition
  let conditionMet = true;
  if (rule.condition) {
    const conditions = rule.condition.split(',');
    const matched = neighbors.filter(n => conditions.includes(n.terrainType));
    if (rule.requiredNeighbors && matched.length < rule.requiredNeighbors) {
      conditionMet = false;
    } else if (!rule.requiredNeighbors && matched.length === 0) {
      conditionMet = false;
    }
  }

  // ❌ Условие: запрещённые соседи
  if (rule.prohibitedNeighbors) {
    const prohibited = rule.prohibitedNeighbors.split(',');
    const conflict = neighbors.some(n => prohibited.includes(n.terrainType));
    if (conflict) conditionMet = false;
  }

  // 🎲 Проверка вероятности
  if (rule.probability !== undefined && Math.random() > rule.probability) {
    conditionMet = false;
  }

  // 👇 Применяем fallback, если правило не прошло
  if (!conditionMet) {
    tile.terrainType = rule.fallback || 'surf';
  }
}
