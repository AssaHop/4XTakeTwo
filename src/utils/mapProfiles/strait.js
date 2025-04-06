// 📁 src/utils/mapProfiles/strait.js

export const strait = {
  id: 'strait',
  name: 'The Great Strait',

  growIterations: 10,
  growChance: 0.9,
  clusterIntensity: 0.9,
// 🔢 Модификатор масштаба генерации
scaleModifier: 1.4,

  zonalIslands: [
    {
      name: 'topLeft',
      count: 15,
      shapes: [
        { name: 'blob', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'topRight',
      count: 1,
      shapes: [
                { name: 'tail', chance: 1, type: 'land' }
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
      count: 0,
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
      count: 10,
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
      hill: { threshold: 3, chance: 0.8 },
    },
    hill: {
      mount: { threshold: 4, chance: 0.3 },
    },
    mount: {
      peak: { threshold: 6, chance: 0.3 }
    }
  },

  // 🔁 Кол-во шагов вертикального роста
  verticalIterations: 5
};
