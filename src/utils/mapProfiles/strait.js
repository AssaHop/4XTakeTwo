// 📁 src/utils/mapProfiles/strait.js

export const strait = {
  id: 'strait',
  name: 'The Great Strait',

  growIterations: 6,
  growChance: 0.85,
  clusterIntensity: 0.5,

  zonalIslands: [
    {
      name: 'topLeft',
      count: 3,
      shapes: [
        { name: 'blob', chance: 2, type: 'land' },
        { name: 'ridge', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'topRight',
      count: 3,
      shapes: [
        { name: 'blob', chance: 1, type: 'land' },
        { name: 'tail', chance: 2, type: 'land' }
      ]
    },
    {
      name: 'centerLeft',
      count: 2,
      shapes: [
        { name: 'ridge', chance: 3, type: 'land' }
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
      count: 3,
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
  }
};
