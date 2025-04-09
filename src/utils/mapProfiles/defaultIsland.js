export const defaultIsland = {
  id: 'defaultIsland',
  name: 'Debug Island',

  growIterations: 0,
  growChance: 0,
  clusterIntensity: 0,

  zonalIslands: [
    {
      name: 'topLeft',
      count: 0,
      shapes: [
        { name: 'bone', chance: 1, type: 'land' }
        //{ name: 'blob', chance: 1, type: 'land' }
        //{ name: 'tail', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'topRight',
      count: 0,
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
      count: 0,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'bone', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'bottomLeft',
      count: 0,
      shapes: [
        { name: 'tailUpLeft', chance: 1, type: 'land' }
        //{ name: 'bone', chance: 1, type: 'land' }
             ]
    },
    {
      name: 'left',
      count: 0,
      shapes: [
        { name: 'tailBend', chance: 1, type: 'land' }
        //{ name: 'blob', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'right',
      count: 0,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'tailBend', chance: 1, type: 'land' }
      ]
    },
        {
      name: 'bottomRight',
      count: 0,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'bone', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'topEdge',
      count: 0,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'bone', chance: 1, type: 'land' }
        //{ name: 'tail', chance: 0, type: 'land' }
      ]
    },
    {
      name: 'bottomEdge',
      count: 0,
      shapes: [
        //{ name: 'blob', chance: 1, type: 'land' }
        { name: 'bone', chance: 0, type: 'land' }
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
