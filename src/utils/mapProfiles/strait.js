// 📁 src/utils/mapProfiles/strait.js

export const strait = {
  id: 'strait',
  name: 'The Great Strait',

  growIterations: 18,
  growChance: 0.9,
  clusterIntensity: 0.5,

  zonalIslands: [
    {
      name: 'topLeft',
      count: 100,
      shapes: [
        { name: 'blob', chance: 1, type: 'land' }
             ]
    },
    {
      name: 'topRight',
      count: 0,
      shapes: [
        { name: 'blob', chance: 1, type: 'land' },
        { name: 'tail', chance: 2, type: 'land' }
      ]
    },
    {
      name: 'centerLeft',
      count: 0,
      shapes: [
        { name: 'ridge', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'centerRight',
      count: 2,
      shapes: [
        { name: 'ridge', chance: 3, type: 'land' }
      ]
    },
    {
      name: 'bottomLeft',
      count: 3,
      shapes: [
        { name: 'blob', chance: 2, type: 'land' },
        { name: 'tail', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'bottomRight',
      count: 33,
      shapes: [
        { name: 'blob', chance: 2, type: 'land' },
        { name: 'tail', chance: 1, type: 'land' }
      ]
    }
  ],

  terrainPresetKey: 'default',
  spawnRules: {},

  islandLayers: {
    micro: ['land', 'surf'],
    small: ['hill', 'land', 'surf'],
    medium: ['mount', 'hill', 'land', 'surf'],
    large: ['peak', 'mount', 'hill', 'land', 'surf']
  },

  // 🔼 Правила вертикального роста
  verticalGrowthRules: {
    land: {
      hill: { threshold: 4, chance: 0.7 },
      mount: { threshold: 10, chance: 0.7 }
    },
    hill: {
      mount: { threshold: 5, chance: 0.8 },
      peak: { threshold: 8, chance: 0.2 }
    }
  }
};
