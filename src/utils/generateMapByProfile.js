// 📋 src/utils/generateMapByProfile.js

import { generateHexMap } from '../world/map.js';
import {
  generateZonalIslands,
  createSeededRNG,
  clusterizeTerrain,
  applyVerticalIslandGrowth,
  applyLandToHillFilter,
  applyWaterToDeepFilter,
  applySurfRim
} from './islandBuilder.js';
import { defaultIsland } from './mapProfiles/defaultIsland.js';
import { strait } from './mapProfiles/strait.js';

export const mapProfiles = {
  defaultIsland,
  strait,
  default: defaultIsland
};

export const shapePresets = {
  blob: [
    { q: 0, r: 0, s: 0 },
    { q: 1, r: 0, s: -1 },
    { q: -1, r: 0, s: 1 },
    { q: 0, r: 1, s: -1 },
    { q: 0, r: -1, s: 1 },
    { q: 1, r: -1, s: 0 },
    { q: -1, r: 1, s: 0 }
  ],
  tail: [
    { q: 0, r: 0, s: 0 },
    { q: 0, r: 1, s: -1 },
    { q: 0, r: 2, s: -2 },
    { q: 0, r: 3, s: -3 },
    { q: 1, r: 3, s: -4 },
    { q: -1, r: 3, s: -2 }
  ],
  tailBend: [
    { q: -1, r: 0, s: 1 },
    { q: 0, r: 0, s: 0 },
    { q: 1, r: 0, s: -1 },
    { q: 1, r: 1, s: -2 },
    { q: 1, r: 2, s: -3 },
    { q: 2, r: 2, s: -4 }
  ],
  tailUpLeft: [
    { q: 0, r: 0, s: 0 },
    { q: 0, r: -1, s: 1 },
    { q: 1, r: -1, s: 0 },
    { q: 1, r: 0, s: -1 },
    { q: 0, r: 1, s: -1 },
    { q: -1, r: 1, s: 0 },
    { q: -1, r: 0, s: 1 }
  ],
  bone: [
    { q: 0, r: -1, s: 1 },
    { q: -1, r: 0, s: 1 },
    { q: -1, r: 1, s: 0 },
    { q: 0, r: 0, s: 0 },
    { q: 0, r: 1, s: -1 },
    { q: 1, r: 0, s: -1 },
    { q: 1, r: -1, s: 0 }
  ],
  ridge: [
    { q: -2, r: 0, s: 2 },
    { q: -1, r: 0, s: 1 },
    { q: 0, r: 0, s: 0 },
    { q: 1, r: 0, s: -1 },
    { q: 2, r: 0, s: -2 }
  ]
};

export function generateMapByProfile(profileId = 'defaultIsland', size = 15, seed = Date.now()) {
  const profile = mapProfiles[profileId];
  if (!profile) throw new Error(`❌ Unknown map profile: ${profileId}`);

  const map = generateHexMap(size, 0, 0);
  const rng = createSeededRNG(seed);
  const scaleFactor = (size / 14) * (profile.scaleModifier || 1);

  // 🧩 Zonal island generation
  if (profile.zonalIslands && Array.isArray(profile.zonalIslands)) {
    const scaledZonalIslands = profile.zonalIslands.map(zone => ({
      ...zone,
      count: zone.count === 0 ? 0 : Math.max(1, Math.floor(zone.count * scaleFactor))
    }));

    scaledZonalIslands.forEach(zone => {
      for (const shape of zone.shapes) {
        const deltas = shapePresets[shape.name];
        if (!deltas) {
          console.warn(`⚠️ Shape preset '${shape.name}' not found!`);
        } else {
          console.log(`📐 [${zone.name}] Shape "${shape.name}" deltas:`, deltas);
        }
      }
      console.log(`🧭 [${zone.name}] scaledCount: ${zone.count}`);
    });

    const activeZones = scaledZonalIslands.filter(zone => zone.count > 0);

    generateZonalIslands(map.flat(), activeZones, shapePresets, {
      seed,
      growChance: profile.growChance,
      growIterations: profile.growIterations
    });
  }

  // 🎨 Cluster terrain
  clusterizeTerrain(map.flat(), profile.clusterIntensity, rng);

  // 🪨 Phase 1: grow land → hill
  applyVerticalIslandGrowth(map.flat(), { land: profile.verticalGrowthRules?.land }, 2);

  // 🧱 Phase 2: fill land surrounded by hill
  applyLandToHillFilter(map.flat(), 1);

  // ⛰️ Phase 3: hill → mount → peak
  applyVerticalIslandGrowth(map.flat(), {
    hill: profile.verticalGrowthRules?.hill,
    mount: profile.verticalGrowthRules?.mount
  }, 3);

  // 🌊 Phase 4: rim
  applySurfRim(map.flat(), 0.1);

  // 🌊 Phase 5: deep sea pass
  applyWaterToDeepFilter(map.flat(), 0.76);

  const landTiles = map.flat().filter(t => t.terrainType === 'land');
  console.log(`🧮 Total land tiles after zonal generation: ${landTiles.length}`);
  landTiles.forEach(t => {
    console.log(`🔍 LAND TILE at (${t.q}, ${t.r}, ${t.s})`);
  });

  return map;
}
