// 📁 src/utils/terrain/terrainPresets.js

export const terrainPresets = {
    default: {
      profileName: "Default Island",
      terrainDistribution: {
        surf: { min: 30, max: 40 },
        water: { min: 20, max: 50 },
        deep: { min: 10, max: 40 },
        land: { min: 10, max: 15 },
        hill: { min: 5, max: 10 },
        mount: { min: 24, max: 50 },
        peak: { min: 2, max: 8 }
      },
      spawnRules: {
        surf: { condition: "land,hill,mount", requiredNeighbors: 1, probability: 0.9, prohibitedNeighbors: "peak,deep, mount" },
        land: { condition: "surf,land,hill", requiredNeighbors: 2, probability: 0.8 },
        hill: { condition: "land,hill,surf", requiredNeighbors: 2, probability: 0.5 },
        mount: { condition: "land,hill,mount", requiredNeighbors: 2, prohibitedNeighbors: "surf", probability: 0.7 },
        peak: { condition: "mount", requiredNeighbors: 2, prohibitedNeighbors: "surf, water, deep" },
        deep: { condition: "water", prohibitedNeighbors: "surf" },
        water: { condition: "surf,land", probability: 0.7 }
      },
      clusterConfig: {
        baseTypes: ["land", "hill"],
        growthChance: 0.5,
        maxClusters: 50,
        maxClusterSize: 12
      }
    },
  
    archipelago: {
      profileName: "Small Archipelago",
      terrainDistribution: {
        surf: { min: 40, max: 80 },
        water: { min: 30, max: 50 },
        deep: { min: 20, max: 30 },
        land: { min: 5, max: 10 },
        hill: { min: 3, max: 5 },
        mount: { min: 1, max: 3 },
        peak: { min: 0, max: 1 }
      },
      spawnRules: {
        surf: { condition: "land,hill", requiredNeighbors: 1, probability: 0.4 },
        land: { condition: "land,hill", requiredNeighbors: 2, probability: 0.7 },
        hill: { condition: "land,hill", requiredNeighbors: 2, probability: 0.5 },
        mount: { condition: "hill,mount", requiredNeighbors: 2, probability: 0.4 },
        peak: { condition: "mount", requiredNeighbors: 3 },
        deep: { condition: "water", prohibitedNeighbors: "surf" },
        water: { condition: "surf,land", probability: 0.6 }
      },
      clusterConfig: {
        baseTypes: ["land", "hill"],
        growthChance: 0.2,
        maxClusters: 6,
        maxClusterSize: 6
      }
    }
  };
  