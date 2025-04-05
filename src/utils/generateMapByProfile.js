// 📁 src/utils/generateMapByProfile.js

import { generateHexMap } from '../world/map.js';
import {
  generateTerrainClusters,
  clusterizeTerrain,
  applySpawnRules,
  applyLayeredIslandRules,
  createSeededRNG
} from './terrainGen.js';
import { terrainPresets } from './terrainPresets.js';

// 🔁 Импорт профилей карт
import { defaultIsland } from './mapProfiles/defaultIsland.js';

const mapProfiles = {
    defaultIsland,
    default: defaultIsland // ✅ алиас для совместимости
  };

// 🎲 Шейпы островов (задание seed-зон)
const shapePresets = {
  round: [
    { zone: 'center', count: 2, type: 'mount' },
    { zone: 'center', count: 4, type: 'hill' },
    { zone: 'left', count: 3, type: 'land' },
    { zone: 'right', count: 3, type: 'land' }
  ],
  tail: [
    { zone: 'center', count: 1, type: 'peak' },
    { zone: 'center', count: 2, type: 'mount' },
    { zone: 'center', count: 3, type: 'hill' },
    { zone: 'bottom', count: 4, type: 'land' }
  ],
  horseshoe: [
    { zone: 'topLeft', count: 3, type: 'hill' },
    { zone: 'topRight', count: 3, type: 'hill' },
    
  ],
  split: [
    { zone: 'topLeft', count: 3, type: 'hill' },
    { zone: 'bottomRight', count: 3, type: 'mount' }
  ],
  bone: [
    { zone: 'topLeft', count: 3, type: 'mount' },
    { zone: 'topRight', count: 3, type: 'mount' },
    { zone: 'bottomLeft', count: 3, type: 'mount' },
    { zone: 'bottomRight', count: 3, type: 'mount' },
    { zone: 'center', count: 1, type: 'peak' }
  ],
  ridge: [
    { zone: 'left', count: 6, type: 'hill' },
    { zone: 'right', count: 6, type: 'hill' }
  ],
  twin: [
    { zone: 'topLeft', count: 3, type: 'hill' },
    { zone: 'bottomRight', count: 3, type: 'mount' }
  ]
};

/**
 * Генерация карты по ID профиля
 * @param {string} profileId - ключ профиля (например, "defaultIsland")
 * @param {number} size - радиус карты
 * @param {number} seed - сид для генерации (можно Date.now())
 * @returns {Array[]} Карта — массив строк с гексами
 */
export function generateMapByProfile(profileId = 'defaultIsland', size = 15, seed = Date.now()) {
  const profile = mapProfiles[profileId];
  if (!profile) throw new Error(`❌ Unknown map profile: ${profileId}`);

  const preset = terrainPresets[profile.terrainPresetKey];
  if (!preset) throw new Error(`❌ Unknown terrain preset: ${profile.terrainPresetKey}`);

  // 🎰 Выбор случайного шейпа (если задано)
  let seedZones = profile.seedZones || [];
  if (profile.shapes && Array.isArray(profile.shapes)) {
    const totalWeight = profile.shapes.reduce((sum, s) => sum + (s.chance || 1), 0);
    const roll = Math.random() * totalWeight;
    let acc = 0;

    for (const shape of profile.shapes) {
      acc += shape.chance || 1;
      if (roll <= acc) {
        seedZones = shapePresets[shape.name] || seedZones;
        break;
      }
    }
  }

  // 🗺 Генерация карты
  const map = generateHexMap(size, 0, 0);
  const rng = createSeededRNG(seed);

  // 🌱 Террейн: острова, рост, кластеры
  generateTerrainClusters(map.flat(), {
    seed,
    seedCount: profile.seedCount,
    growIterations: profile.growIterations,
    growChance: profile.growChance,
    seedZones
  });

  clusterizeTerrain(map.flat(), profile.clusterIntensity, rng);

  // 🔁 Правила спауна
  map.flat().forEach(tile => {
    applySpawnRules(tile, map, {
      spawnRules: {
        ...preset.spawnRules,
        ...profile.spawnRules
      }
    });
  });

  // 🧱 Многослойные острова
  applyLayeredIslandRules(map.flat(), profile.islandLayers);

  return map;
}
