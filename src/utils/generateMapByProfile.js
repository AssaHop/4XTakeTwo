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
  dot: [{ q: 0, r: 0, s: 0 }],
  tail: [{ q: 0, r: 0, s: 0 }, { q: 0, r: 1, s: -1 }, { q: 0, r: 2, s: -2 }, { q: 0, r: 3, s: -3 }, { q: 1, r: 3, s: -4 }, { q: -1, r: 3, s: -2 }],
  tailBend: [{ q: -1, r: 0, s: 1 }, { q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 1, r: 1, s: -2 }, { q: 1, r: 2, s: -3 }, { q: 2, r: 2, s: -4 }],
  tailUpLeft: [{ q: 0, r: 0, s: 0 }, { q: 0, r: -1, s: 1 }, { q: 1, r: -1, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 0, r: 1, s: -1 }, { q: -1, r: 1, s: 0 }, { q: -1, r: 0, s: 1 }],
  bone: [{ q: -1, r: -1, s: 2 }, { q: -1, r: 0, s: 1 }, { q: -2, r: 1, s: 1 }, { q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 2, r: -1, s: -1 }, { q: 1, r: 1, s: -2 }],
  yr: [{ q: 0, r: 0, s: 0 }, { q: -2, r: 0, s: 2 }, { q: -1, r: 0, s: 1 }, { q: 1, r: -1, s: 0 }, { q: 2, r: -1, s: -1 }, { q: 0, r: 1, s: -1 }, { q: 0, r: 2, s: -2 }],
  tailrd: [{ q: 0, r: -1, s: 1 }, { q: 1, r: -1, s: 0 }, { q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: 1, r: 1, s: -2 }, { q: 1, r: 2, s: -3 }],
  scorp: [{ q: 1, r: -3, s: 2 }, { q: 0, r: -2, s: 2 }, { q: 0, r: -1, s: 1 }, { q: -1, r: 0, s: 1 }, { q: 0, r: 0, s: 0 }, { q: 1, r: 0, s: -1 }, { q: -1, r: 1, s: 0 }, { q: 1, r: 1, s: -2 }, { q: 2, r: 1, s: -3 }]
};

export function generateMapByProfile(profileId = 'defaultIsland', size = 15, seed = Date.now()) {
  const profile = mapProfiles[profileId];
  if (!profile) throw new Error(`Unknown map profile: ${profileId}`);

  const map = generateHexMap(size, 0, 0);
  const rng = createSeededRNG(seed);
  const scaleFactor = (size / 14) * (profile.scaleModifier || 1);

  if (profile.zonalIslands && Array.isArray(profile.zonalIslands)) {
    const scaledZonalIslands = profile.zonalIslands.map(zone => ({
      ...zone,
      count: zone.count === 0 ? 0 : Math.max(1, Math.floor(zone.count * scaleFactor))
    }));

    const activeZones = scaledZonalIslands.filter(zone => zone.count > 0);

    generateZonalIslands(map.flat(), activeZones, shapePresets, {
      seed,
      growChance: profile.growChance,
      growIterations: profile.growIterations,
      mapSize: size
    });
  }

  clusterizeTerrain(map.flat(), profile.clusterIntensity, rng);
  applyVerticalIslandGrowth(map.flat(), { land: profile.verticalGrowthRules?.land }, 2);
  applyLandToHillFilter(map.flat(), 1);
  applyVerticalIslandGrowth(map.flat(), {
    hill: profile.verticalGrowthRules?.hill,
    mount: profile.verticalGrowthRules?.mount
  }, 3);
  applySurfRim(map.flat(), 0.1);
  applyWaterToDeepFilter(map.flat(), 0.76);

  return map;
}
  