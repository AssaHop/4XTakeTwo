import { generateMapByProfile } from '../utils/generateMapByProfile.js';
import { getTemplateSpawnCells, getRandomFreeHex } from '../utils/spawnUtils.js';
import { hexDistance } from '../mechanics/hexUtils.js';
import { initAllegiance } from '../core/diplomacy.js';

export const dominator = {
  id: 'dominator',
  name: 'Dominator',

  generateMap: ({ size = 10, profile = 'defaultIsland', seed = Date.now() }) => {
    // 🗺 Генерация карты по профилю
    return generateMapByProfile(profile, size, seed);
  },

  getInitialUnits: (map, { enemyCount = 3 }) => {
    const units = [];
    const FLEET = ['WDD', 'WDD', 'WCC', 'WCC', 'WBB'];

    const spawnFleet = (owner) => {
      for (const type of FLEET) {
        const cells = getTemplateSpawnCells(type, map);
        const hex = getRandomFreeHex(cells, units);
        if (hex) units.push({ q: hex.q, r: hex.r, s: hex.s, type, owner });
      }
    };

    spawnFleet('player1');
    for (let i = 0; i < enemyCount; i++) spawnFleet(`enemy${i}`);

    return units;
  },

  getInitialCapturePoints: (mapIndex, count = 3) => {
    const land = Object.values(mapIndex).filter(c => c.terrainType === 'land');
    if (!land.length) return [];

    // Fisher-Yates shuffle
    for (let i = land.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [land[i], land[j]] = [land[j], land[i]];
    }

    // Pick points spread at least 5 hexes apart
    const picks = [];
    for (const h of land) {
      if (picks.every(p => hexDistance(h, p) >= 5)) {
        picks.push(h);
        if (picks.length >= count) break;
      }
    }
    // Fallback: fill remaining without spread constraint
    for (const h of land) {
      if (picks.length >= count) break;
      if (!picks.some(p => p.q === h.q && p.r === h.r && p.s === h.s)) picks.push(h);
    }

    return picks.slice(0, count).map(h => ({
      q: h.q, r: h.r, s: h.s,
      owner: null, claimant: null, claimTurns: 0
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
