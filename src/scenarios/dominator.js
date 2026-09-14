import { generateMapByProfile } from '../utils/generateMapByProfile.js';
import { spawnClusteredFleet, pickClusterAnchor } from '../utils/fleetSpawn.js';
import { pickSpreadLandPoints } from '../utils/capturePointUtils.js';
import { initAllegiance } from '../core/diplomacy.js';
import { CAPTURED_BASE_CAPACITY } from '../core/economyLogic.js';

export const dominator = {
  id: 'dominator',
  name: 'Dominator',

  generateMap: ({ size = 10, profile = 'defaultIsland', seed = Date.now() }) => {
    // 🗺 Генерация карты по профилю
    return generateMapByProfile(profile, size, seed);
  },

  getInitialUnits: (map, { enemyCount = 3 }) => {
    const units = [];
    // Тестовый состав флота (пока нет ресурсов/продакшена — юниты просто
    // спаунятся напрямую): 1 WBB (танк/ядро) + 2 WCC (основная сила) +
    // 4 WDD (эскортники) на сторону.
    const FLEET = ['WBB', 'WCC', 'WCC', 'WDD', 'WDD', 'WDD', 'WDD'];

    // Радиус карты (map — 2D массив строк q=-size..size, см.
    // world/map.js:generateHexMap) — минимальная дистанция между анкорами
    // разных сторон, чтобы флоты не спаунились в одном углу карты.
    const mapRadius = (map.length - 1) / 2;
    const anchors = [];

    const spawnFleet = (owner) => {
      const anchor = pickClusterAnchor(FLEET, map, anchors, mapRadius);
      if (anchor) anchors.push(anchor);
      spawnClusteredFleet(FLEET, map, units, owner, anchor);
    };

    spawnFleet('player1');
    for (let i = 0; i < enemyCount; i++) spawnFleet(`enemy${i}`);

    return units;
  },

  getInitialCapturePoints: (mapIndex, options = {}) => {
    const count = typeof options === 'number' ? options : (options.capturePointCount ?? 3);
    const picks = pickSpreadLandPoints(mapIndex, count, { minDistance: 5 });
    return picks.map(h => ({
      q: h.q, r: h.r, s: h.s,
      owner: null, claimant: null, captureProgress: 0,
      capacityLevel: CAPTURED_BASE_CAPACITY,
    }));
  },

  // Dominator — "все против игрока": сильный стартовый перекос, чтобы враги
  // не перебили друг друга без участия игрока, пока их отношения между собой
  // не испортит реальный бой (см. core/diplomacy.js, ATTACK_REPERCUSSION).
  // Другой сценарий может передать playerBias: 0 для симметричного FFA.
  getInitialAllegiance: (owners) => initAllegiance(owners, { playerBias: -30 }),

  winCondition: (state) => {
    return !state.units.some(u => u.owner?.startsWith('enemy'));
  },

  loseCondition: (state) => {
    return !state.units.some(u => u.owner === 'player1');
  }
};
