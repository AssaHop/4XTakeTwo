// 📁 src/ai/aiUtils.js

import { findPath } from '../mechanics/pathfinding.js';
import { hexDistance } from '../mechanics/hexUtils.js';
import { Unit } from '../mechanics/units.js';

// 🔍 Поиск пути от юнита до цели
function getPathToTarget(unit, target, mapIndex) {
  if (!unit || !target) return [];
  return findPath(unit, target, mapIndex, unit); // передаём mapIndex напрямую
}


// 🎯 Нахождение ближайшей цели
function findNearestEnemy(unit, units) {
  const enemies = units.filter(u => u.owner !== unit.owner);
  if (enemies.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const enemy of enemies) {
    const dist = hexDistance(unit, enemy);
    if (dist < minDist) {
      nearest = enemy;
      minDist = dist;
    }
  }

  return nearest;
}

// 📍 Получение вражеских юнитов в радиусе атаки
function getEnemyUnitsInRange(unit, units) {
  if (!unit || !unit.atRange) return [];

  const attackHexes = Unit.getAttackableHexes(unit);

  return units.filter(target => {
    return target.owner !== unit.owner &&
           attackHexes.some(hex => hex.q === target.q && hex.r === target.r && hex.s === target.s);
  });
}

// 🚶 Резервное перемещение — на случай если целей нет
function fallbackMove(unit, mapIndex) {
  if (!mapIndex) return null;

  const directions = [
    { dq: 1, dr: -1, ds: 0 }, { dq: 1, dr: 0, ds: -1 }, { dq: 0, dr: 1, ds: -1 },
    { dq: -1, dr: 1, ds: 0 }, { dq: -1, dr: 0, ds: 1 }, { dq: 0, dr: -1, ds: 1 },
  ];

  for (const dir of directions) {
    const q = unit.q + dir.dq;
    const r = unit.r + dir.dr;
    const s = unit.s + dir.ds;
    const key = `${q},${r},${s}`;
    const tile = mapIndex[key];
    if (tile && tile.terrainType === 'land') {
      return { q, r, s };
    }
  }

  return null;
}

export {
  getPathToTarget,
  findNearestEnemy,
  getEnemyUnitsInRange,
  fallbackMove,
};
