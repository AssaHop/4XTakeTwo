// 📁 src/ai/aiBehaviors.js

import {
  getEnemyUnitsInRange,
  getPathToTarget,
  findNearestEnemy,
  fallbackMove
} from './aiUtils.js';

export function decideUnitBehavior(unit, gameState) {
  return decideByRole(unit, gameState);
}

function decideByRole(unit, gameState) {
  const behaviorModule = unit.modules?.[0]?.toLowerCase(); // e.g. "flee", "percy", etc.

  switch (behaviorModule) {
    case 'flee':
      return decideFlee(unit, gameState);
    case 'percy':
      return decideAggressive(unit, gameState);
    case 'tank':
    default:
      return decideAggressive(unit, gameState);
  }
}

function decideAggressive(unit, gameState) {
  const targetInRange = getEnemyUnitsInRange(unit, gameState.units)?.[0];
  if (targetInRange) {
    return { type: 'attack', target: targetInRange };
  }

  const nearest = findNearestEnemy(unit, gameState.units);
  if (!nearest) return null;

  const path = getPathToTarget(unit, nearest, gameState.mapIndex); // 💥 было .map.flat()

  if (path && path.length > 0) {
    return { type: 'move', path };
  }

  const fallback = fallbackMove(unit, gameState.mapIndex);
  if (fallback) {
    return { type: 'move', path: [fallback] };
  }

  return null;
}


function decideFlee(unit, gameState) {
  if (unit.canMove) {
    const enemies = gameState.units.filter(u => u.owner !== unit.owner);
    if (enemies.length === 0) return null;

    const away = getFurthestHex(unit, enemies, gameState.mapIndex); // 🔁 mapIndex
    if (away) return { type: 'move', target: away };
  }

  return null;
}


function getFurthestHex(unit, enemies, map) {
  const moveHexes = unit.getAvailableHexes();
  if (!moveHexes.length) return null;

  let bestHex = null;
  let maxDist = -Infinity;

  for (const hex of moveHexes) {
    const minEnemyDist = Math.min(...enemies.map(e => distance(e, hex)));
    if (minEnemyDist > maxDist) {
      bestHex = hex;
      maxDist = minEnemyDist;
    }
  }

  return bestHex;
}

function distance(a, b) {
  return Math.max(
    Math.abs(a.q - b.q),
    Math.abs(a.r - b.r),
    Math.abs(a.s - b.s)
  );
}
