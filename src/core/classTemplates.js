// 📂 core/classTemplates.js

const ClassTemplates = {
  WDD: {
    hp: 3,
    moRange: 6,
    viRange: 6,
    weType: ['Small'],
    spawnTerrain: ['surf', 'water'],
    moveTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Charge', 'Flee']
  },
  WCC: {
    hp: 4,
    moRange: 6,
    viRange: 6,
    weType: ['Small', 'Main'],
    spawnTerrain: ['surf', 'water', 'deep'],
    moveTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Navy', 'Charge', 'Percy']
  },
  WBB: {
    hp: 5,
    moRange: 5,
    viRange: 6,
    weType: ['Main'],
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Navy']
  },
  WSB: {
    hp: 3,
    moRange: 3,
    viRange: 6,
    weType: ['Torp'],
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail']
  },
  WCA: {
    hp: 4,
    moRange: 2,
    viRange: 6,
    weType: ['Small'],
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail']
  },
  WLC: {
    hp: 3,
    moRange: 3,
    viRange: 6,
    weType: ['Main'],
    spawnTerrain: ['surf', 'water', 'deep']
  },
  WSS: {
    hp: 2,
    moRange: 3,
    viRange: 6,
    weType: [],
    spawnTerrain: ['surf', 'water', 'deep']
  },
  AAF: {
    hp: 2,
    moRange: 5,
    viRange: 6,
    weType: ['Small'],
    spawnTerrain: ['surf', 'water', 'deep']
  },
  ADB: {
    hp: 3,
    moRange: 4,
    viRange: 6,
    weType: ['Main'],
    spawnTerrain: ['surf', 'water', 'deep']
  },
  ATB: {
    hp: 2,
    moRange: 4,
    viRange: 6,
    weType: ['Torp'],
    spawnTerrain: ['surf', 'water', 'deep']
  }
};

export { ClassTemplates };
