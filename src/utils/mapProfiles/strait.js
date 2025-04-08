// 📁 src/utils/mapProfiles/strait.js

export const strait = {
  id: 'strait',
  name: 'The Great Strait',

  growIterations: 0,
  growChance: 0.0,
  clusterIntensity: 0.001,
// 🔢 Модификатор масштаба генерации
scaleModifier: 1.5,

  zonalIslands: [
    {
      name: 'topLeft',
      count: 1,
      shapes: [
        { name: 'bone', chance: 1, type: 'land' }
        //{ name: 'blob', chance: 1, type: 'land' }
        //{ name: 'tail', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'topRight',
      count: 1,
      shapes: [
        { name: 'bone', chance: 1, type: 'land' }
        //{ name: 'blob', chance: 1, type: 'land' }
        //{ name: 'tail', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'centerLeft',
      count: 1,
      shapes: [
        { name: 'bone', chance: 1, type: 'land' }
        //{ name: 'blob', chance: 1, type: 'land' }
        
      ]
    },
    {
      name: 'centerRight',
      count: 1,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'bone', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'bottomLeft',
      count: 1,
      shapes: [
        { name: 'tailUpLeft', chance: 1, type: 'land' }
        //{ name: 'bone', chance: 1, type: 'land' }
             ]
    },
    {
      name: 'left',
      count: 1,
      shapes: [
        { name: 'tailBend', chance: 1, type: 'land' }
        //{ name: 'blob', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'right',
      count: 1,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'tailBend', chance: 1, type: 'land' }
      ]
    },
        {
      name: 'bottomRight',
      count: 1,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'bone', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'topEdge',
      count: 1,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'bone', chance: 1, type: 'land' }
        //{ name: 'tail', chance: 0, type: 'land' }
      ]
    },
    {
      name: 'bottomEdge',
      count: 1,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'bone', chance: 0, type: 'land' }
      ]
    }
  ],

  terrainPresetKey: 'default',
  spawnRules: {},

 // islandLayers: {
    //micro: ['land', 'surf'],
    //small: ['hill', 'land', 'surf'],
   // medium: ['mount', 'hill', 'land', 'surf'],
    //large: ['peak', 'mount', 'hill', 'land', 'surf']
  //},

  // 🔼 Правила вертикального роста
  verticalGrowthRules: {
    land: {
      hill: { threshold: 3, chance: 0.8 },
    },
    hill: {
      mount: { threshold: 4, chance: 0.3 },
    },
    mount: {
      peak: { threshold: 4, chance: 0.3 }
    }
  },

  // 🔁 Кол-во шагов вертикального роста
  verticalIterations: 5
};
