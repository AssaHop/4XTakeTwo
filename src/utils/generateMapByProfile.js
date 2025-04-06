// 📋 src/utils/generateMapByProfile.js

import { generateHexMap } from '../world/map.js';
import {
  clusterizeTerrain,
  createSeededRNG,
  applyVerticalIslandGrowth,
  applyLandToHillFilter,
  applyWaterToDeepFilter,
  applySurfRim
} from './terrainGen.js'; // 🛠️ добавлен applySurfRim
import { generateZonalIslands } from './islandBuilder.js';

import { defaultIsland } from './mapProfiles/defaultIsland.js';
import { strait } from './mapProfiles/strait.js';

export const mapProfiles = {
  defaultIsland,
  strait,
  default: defaultIsland
};

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

export function generateMapByProfile(profileId = 'defaultIsland', size = 15, seed = Date.now()) {
  const profile = mapProfiles[profileId];
  if (!profile) throw new Error(`❌ Unknown map profile: ${profileId}`);

  const map = generateHexMap(size, 0, 0);
  const rng = createSeededRNG(seed);
  const scaleFactor = (size / 15) * (profile.scaleModifier || 1);

  if (profile.zonalIslands && Array.isArray(profile.zonalIslands)) {
    const scaledZonalIslands = profile.zonalIslands.map(zone => ({
      ...zone,
      count: Math.max(1, Math.floor((zone.count || 1) * scaleFactor))
    }));

    generateZonalIslands(map.flat(), scaledZonalIslands, shapePresets, {
      seed,
      growChance: profile.growChance,
      growIterations: profile.growIterations
    });
  }

  clusterizeTerrain(map.flat(), profile.clusterIntensity, rng);

  // 🧱 Фаза 1: рост land → hill
  applyVerticalIslandGrowth(
    map.flat(),
    { land: profile.verticalGrowthRules?.land },
    2
  );

  // 🔧 Фаза 2: зашиваем land окружённые hill
  applyLandToHillFilter(map.flat(), 1);

  // 🏔️ Фаза 3: рост hill → mount → peak
  applyVerticalIslandGrowth(
    map.flat(),
    {
      hill: profile.verticalGrowthRules?.hill,
      mount: profile.verticalGrowthRules?.mount
    },
    3
  );

  // 🌊 Фаза 4: обводка суши surf
  applySurfRim(map.flat(), 0.3); // 🎯 добавлено обратно

  // 🌊 Фаза 5: финальный deep-pass
  applyWaterToDeepFilter(map.flat(), 0.6);

  return map;
}
