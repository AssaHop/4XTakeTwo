// 📋 src/utils/generateMapByProfile.js

import { generateHexMap } from '../world/map.js';
import {
  clusterizeTerrain,
  createSeededRNG,
  applyVerticalIslandGrowth,
  applySurfAndDeepPass
} from './terrainGen.js';
import { generateZonalIslands } from './islandBuilder.js';

// 🔁 Импорт профилей карт
import { defaultIsland } from './mapProfiles/defaultIsland.js';
import { strait } from './mapProfiles/strait.js';

export const mapProfiles = {
  defaultIsland,
  strait,
  default: defaultIsland // ✅ алиас для совместимости
};

// 🎲 Шейпы для зональной генерации
const shapePresets = {
  blob: [
    { q: 0, r: 0 }, { q: 1, r: 0 }, { q: -1, r: 0 },
    { q: 0, r: 1 }, { q: 0, r: -1 },
    { q: 1, r: -1 }, { q: -1, r: 1 }
  ],
  tail: [
    { q: 0, r: 0 },
    { q: 0, r: 1 }, { q: 0, r: 2 },
    { q: 0, r: 3 }, { q: 1, r: 3 }, { q: -1, r: 3 }
  ],
  ridge: [
    { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }
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

  const map = generateHexMap(size, 0, 0);
  const rng = createSeededRNG(seed);

  // 🏓 Генерация островов новым способом, если задано
  if (profile.zonalIslands && Array.isArray(profile.zonalIslands)) {
    generateZonalIslands(map.flat(), profile.zonalIslands, shapePresets, {
      seed,
      growChance: profile.growChance,
      growIterations: profile.growIterations
    });
  }

  // 🗓 Кластеризация
  clusterizeTerrain(map.flat(), profile.clusterIntensity, rng);

  // 🧱 Вертикальный рост островов по правилам
  applyVerticalIslandGrowth(
    map.flat(),
    profile.verticalGrowthRules || {},
    profile.verticalIterations || 5
  );

  // 🌊 Генерация обводки и глубинной воды
  applySurfAndDeepPass(map.flat());

  return map;
}
