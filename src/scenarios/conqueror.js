import { generateHexMap } from '../world/map.js';
import { applySpawnRules } from '../utils/applySpawnRules.js';
import { getTemplateSpawnCells, getRandomFreeHex } from '../utils/spawnUtils.js';

export const conqueror = {
  id: 'conqueror',
  name: 'Завоеватель',

  maxTurns: 30,

  generateMap: ({ size = 14, profile = 'default' }) => {
    const map = generateHexMap(size, 0, 0, profile);

    // Добавим рифы/зоны для захвата
    map.flat().forEach(tile => {
      applySpawnRules(tile, map, {
        spawnRules: {
          reef: {
            condition: 'water,deep',
            requiredNeighbors: 2,
            fallback: 'water',
            probability: 0.5
          },
          zone: {
            condition: 'reef,deep',
            requiredNeighbors: 1,
            fallback: 'reef',
            probability: 0.2
          }
        }
      });
    });

    return map;
  },

  getInitialUnits: (map, { enemyCount = 2 }) => {
    const units = [];

    const playerSpawns = getTemplateSpawnCells('WDD', map);
    const enemySpawns = getTemplateSpawnCells('WBB', map);

    const p1 = getRandomFreeHex(playerSpawns, units);
    if (p1) units.push({ ...p1, type: 'WDD', owner: 'player1' });

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
    const turnsPassed = state.turnCount || 0;
    if (turnsPassed < 30) return false;

    // Подсчёт очков по захваченным зонам
    const playerZones = state.map.flat().filter(cell =>
      cell.controlledBy === 'player1' && cell.terrainType === 'zone'
    );

    const enemyZones = state.map.flat().filter(cell =>
      cell.controlledBy?.startsWith('enemy') && cell.terrainType === 'zone'
    );

    return playerZones.length > enemyZones.length;
  },

  loseCondition: (state) => {
    const turnsPassed = state.turnCount || 0;
    if (turnsPassed < 30) return false;

    const playerZones = state.map.flat().filter(cell =>
      cell.controlledBy === 'player1' && cell.terrainType === 'zone'
    );

    const enemyZones = state.map.flat().filter(cell =>
      cell.controlledBy?.startsWith('enemy') && cell.terrainType === 'zone'
    );

    return enemyZones.length >= playerZones.length;
  }
};
