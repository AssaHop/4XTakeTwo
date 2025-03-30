import { generateHexMap } from '../world/map.js';
import { applySpawnRules } from '../utils/applySpawnRules.js';
import { getTemplateSpawnCells, getRandomFreeHex } from '../utils/spawnUtils.js';

export const dominator = {
  id: 'dominator',
  name: 'Dominator',

  generateMap: ({ size = 15, profile = 'default' }) => {
    const map = generateHexMap(size, 0, 0, profile);

    // ✅ Применяем правила спауна гексов
    map.flat().forEach(tile => {
      applySpawnRules(tile, map, {
        spawnRules: {
          reef: {
            condition: 'water,deep',
            requiredNeighbors: 2,
            fallback: 'water',
            probability: 0.6
          }
        }
      });
    });

    return map;
  },

  getInitialUnits: (map, { enemyCount = 3 }) => {
    const units = [];

    const playerSpawns = getTemplateSpawnCells('WDD', map);
    const enemySpawns = getTemplateSpawnCells('WBB', map);

    const p1_1 = getRandomFreeHex(playerSpawns, units);
    const p1_2 = getRandomFreeHex(playerSpawns, units.concat([p1_1]));

    if (p1_1) units.push({ ...p1_1, type: 'WDD', owner: 'player1' });
    if (p1_2) units.push({ ...p1_2, type: 'WCC', owner: 'player1' });

    for (let i = 0; i < enemyCount; i++) {
      const hex = getRandomFreeHex(enemySpawns, units);
      if (hex) {
        units.push({
          q: hex.q,
          r: hex.r,
          s: hex.s,
          type: i % 2 === 0 ? 'WBB' : 'WCC',
          owner: `enemy${i}`
        });
      }
    }

    return units;
  },

  winCondition: (state) => {
    const enemies = state.units.filter(u => u.owner?.startsWith('enemy') && u.alive);
    return enemies.length === 0;
  },

  loseCondition: (state) => {
    const players = state.units.filter(u => u.owner === 'player1' && u.alive);
    return players.length === 0;
  }
};
