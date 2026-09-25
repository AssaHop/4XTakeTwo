// src/scenarios/duel.js
//
// Запрошено пользователем (сессия калибровки баланса 2026-09-25): сценарий
// "просто флот на флот" без экономики точек захвата, с геометрически
// зеркальными позициями спауна — как в headless-харнессе
// scripts/balance/lib/harness.mjs, но как настоящий выбираемый сценарий
// (не только для калибровочных скриптов).
//
// Без точек захвата вообще (getInitialCapturePoints → []) — экономика
// физически не может сработать: tickResourcesForOwner начисляет токены
// только с ЗАХВАЧЕННЫХ точек (economyLogic.js), без них state.resources
// всегда 0, canAffordSpawn всегда false. Победа/поражение — чистое
// истребление, без запасного пути "потеряны все точки" (в отличие от
// territory/skirmish).
import { generateMapByProfile } from '../utils/generateMapByProfile.js';
import { spawnClusteredFleet, intersectSpawnTerrain } from '../utils/fleetSpawn.js';
import { initAllegiance } from '../core/diplomacy.js';

// Тот же тестовый состав, что в dominator.js — 1 WBB + 2 WCC + 4 WDD.
const FLEET = ['WBB', 'WCC', 'WCC', 'WDD', 'WDD', 'WDD', 'WDD'];
const ANCHOR_RADIUS_FRACTION = 0.6;

function ownersList(enemyCount) {
  return ['player1', ...Array.from({ length: enemyCount }, (_, i) => `enemy${i}`)];
}

// Поворот на 60°×times в кубических гекс-координатах — точная симметрия
// гекс-сетки (в отличие от поворота в пиксельных координатах, не требует
// округления/hexRound). Для 2 сторон (times=1) это разворот на 180° —
// анкор второй стороны получается за ТРИ применения (см. rotate60x3 ниже),
// эквивалентно простому отражению через центр (-q,-r,-s). Формула
// поддерживает честную симметрию для 2-6 сторон (гекс-сетка по природе
// 6-кратно симметрична); enemyCount>5 (7+ сторон) выходит за пределы
// точной симметрии — анкоры продолжают крутиться по кругу (times % 6),
// повторяя не более 6 уникальных направлений.
function rotate60(hex, times) {
  let { q, r, s } = hex;
  const n = ((times % 6) + 6) % 6;
  for (let i = 0; i < n; i++) {
    [q, r, s] = [-r, -s, -q];
  }
  return { q, r, s };
}

function closestOnPool(target, pool) {
  let best = null;
  let bestDist = Infinity;
  for (const cell of pool) {
    const d = Math.max(Math.abs(cell.q - target.q), Math.abs(cell.r - target.r), Math.abs(cell.s - target.s));
    if (d < bestDist) { bestDist = d; best = cell; }
  }
  return best;
}

let cache = { size: 16 };

export const duel = {
  id: 'duel',
  name: 'Duel (fleet vs fleet)',

  generateMap: ({ size = 16, profile = 'defaultIsland', seed = Date.now() } = {}) => {
    const map = generateMapByProfile(profile, size, seed);
    cache = { size };
    return map;
  },

  getInitialCapturePoints: () => [],

  getInitialUnits: (map, { enemyCount = 1 } = {}) => {
    const owners = ownersList(enemyCount);
    const units = [];
    const size = cache.size ?? (map.length - 1) / 2;
    const radius = Math.round(size * ANCHOR_RADIUS_FRACTION);

    const commonTerrain = intersectSpawnTerrain([...new Set(FLEET)]);
    const pool = map.flat().filter(cell => commonTerrain.includes(cell.terrainType));
    if (!pool.length) return units; // карта без подходящего террейна — фоллбэк не нужен, spawnClusteredFleet сам разберётся с anchor=null ниже

    // "Идеальный" первый анкор — точка на заданном радиусе от центра карты
    // (центр всегда (0,0,0), см. world/map.js:generateHexMap); остальные
    // стороны получают анкор поворотом ЭТОЙ ЖЕ идеальной точки на 60°×i —
    // одинаковая дистанция от центра у всех сторон гарантирована геометрией,
    // независимо от того, насколько несимметричен реальный террейн карты.
    const idealFirst = { q: radius, r: -radius, s: 0 };
    const firstAnchor = closestOnPool(idealFirst, pool);

    owners.forEach((owner, i) => {
      const idealAnchor = i === 0 ? idealFirst : rotate60(idealFirst, i);
      const anchor = closestOnPool(idealAnchor, pool) || firstAnchor;
      spawnClusteredFleet(FLEET, map, units, owner, anchor);
    });

    return units;
  },

  // Симметричный FFA, как territory/skirmish — не "все против игрока"
  // (dominator), тут честная дуэль равных стартов.
  getInitialAllegiance: (owners) => initAllegiance(owners, { playerBias: 0 }),

  winCondition: (state) => {
    const enemies = (state.turnOrder || []).filter(o => o !== 'player1');
    return enemies.length > 0 && enemies.every(o => !state.units.some(u => u.owner === o));
  },

  loseCondition: (state) => !state.units.some(u => u.owner === 'player1'),
};
