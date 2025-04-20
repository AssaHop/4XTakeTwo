export const defaultIsland = {
  id: 'defaultIsland',
  name: 'Debug Island',

  growIterations: 1,
  growChance: 0.3,
  clusterIntensity: 0.5,

  zonalIslands: [
    {
      name: 'topLeft',
      count: 3,
      shapes: [
        //{ name: 'dot', chance: 1, type: 'land' }
        //{ name: 'bone', chance: 1, type: 'land' }
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'tailrd', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'topRight',
      count: 2,
      shapes: [
        { name: 'bone', chance: 1, type: 'land' }
        //{ name: 'dot', chance: 1, type: 'land' }
        //{ name: 'tailBend', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'center',
      count: 5,
      shapes: [
        { name: 'tailrd', chance: 1, type: 'land' },
        { name: 'scorp', chance: 1, type: 'land' },
        { name: 'dot', chance: 1, type: 'land' }
        
      ]
    },
    {
      name: 'bottomLeft',
      count: 1,
      shapes: [
        { name: 'dot', chance: 1, type: 'land' }
        //{ name: 'tailUpLeft', chance: 1, type: 'land' }
        //{ name: 'bone', chance: 1, type: 'land' }
             ]
    },
    {
      name: 'left',
      count: 4,
      shapes: [
        { name: 'dot', chance: 1, type: 'land' }
        //{ name: 'tailBend', chance: 1, type: 'land' }
        //{ name: 'blob', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'right',
      count: 1,
      shapes: [
        { name: 'dot', chance: 1, type: 'land' }
        //{ name: 'blob', chance: 1, type: 'land' }
        //{ name: 'tailBend', chance: 1, type: 'land' }
      ]
    },
        {
      name: 'bottomRight',
      count: 1,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'bone', chance: 1, type: 'land' }
        //{ name: 'dot', chance: 1, type: 'land' }
      ]
    },
    
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
      hill: { threshold: 2, chance: 0.8 },
    },
    hill: {
      mount: { threshold: 3, chance: 0.7 },
    },
    mount: {
      peak: { threshold: 4, chance: 0.3 }
    }
  },

  // 🔁 Кол-во шагов вертикального роста
  verticalIterations: 5
};
