import { findPath } from '../../mechanics/pathfinding.js';

/**
 * Действие: двигаться к ближайшему врагу.
 */
export function moveToClosestEnemy(unit, gameState) {
  const target = getClosestEnemy(unit, gameState);
  if (!target) {
    console.warn(`⚠️ No enemies found for ${unit.type}`);
    return false;
  }

  const map = gameState.mapIndex || {};
  const start = { q: unit.q, r: unit.r, s: unit.s };
  const goal = { q: target.q, r: target.r, s: target.s };

  const path = findPath(start, goal, map, unit);
  if (!path || path.length === 0) {
    console.warn(`🚫 No path from ${unit.type} to ${target.type}`);
    return false;
  }

  const nextStep = path[0];
  const moved = unit.moveTo(nextStep.q, nextStep.r, nextStep.s);

  if (moved) {
    console.log(`🚶 ${unit.type} двигается к врагу ${target.type} через (${nextStep.q},${nextStep.r},${nextStep.s})`);
  }

  return moved;
}

/**
 * Возвращает ближайшего врага без ограничений.
 */
export function getClosestEnemy(unit, gameState) {
  const enemies = gameState.units.filter(
    (other) => other.owner !== unit.owner
  );

  if (!enemies.length) return null;

  return enemies.reduce((closest, current) => {
    const distToCurrent = unit.distanceTo(current);
    const distToClosest = unit.distanceTo(closest);
    return distToCurrent < distToClosest ? current : closest;
  }, enemies[0]);
}