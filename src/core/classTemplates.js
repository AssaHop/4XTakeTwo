// 📂 core/classTemplates.js
const ClassTemplates = {
  WDD: {
    hp: 10,
    atDamage: 2,
    moRange: 4,
    viRange: 4,
    weType: ['Small', 'Torp'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water'],
    moveTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Charge', 'Flee'],
    dangerScore: 15,
    aiProfile: {
      role: 'defensive',
      overrides: {
        lowHp: 'fallback'
      },
      risk: 0.2
    }
  },
  WCC: {
    hp: 12,
    atDamage: 3,
    moRange: 4,
    viRange: 4,
    weType: ['Small', 'Main'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    moveTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Navy', 'Charge', 'Percy'],
    dangerScore: 20,
    aiProfile: {
      role: 'aggressive',
      overrides: {
        lowHp: 'aggressive'
      },
      risk: 0.8
    }
  },
  WBB: {
    hp: 14,
    atDamage: 4,
    moRange: 3,
    viRange: 100,
    weType: ['Main'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Navy'],
    dangerScore: 10,
    aiProfile: {
      role: 'neutral',
      risk: 0.4
    }
  },
  WSB: {
    hp: 3,
    atDamage: 3,
    moRange: 3,
    viRange: 6,
    weType: ['Torp'],
    targetClass: 'sub',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail'],
    dangerScore: 35,
    aiProfile: {
      role: 'neutral',
      risk: 0.5
    }
  },
  WCA: {
    hp: 4,
    atDamage: 2,
    moRange: 2,
    viRange: 6,
    weType: ['Small'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail'],
    dangerScore: 45,
    aiProfile: {
      role: 'defensive',
      risk: 0.3
    }
  },
  WLC: {
    hp: 3,
    atDamage: 3,
    moRange: 3,
    viRange: 6,
    weType: ['Main'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    dangerScore: 10,
    aiProfile: {
      role: 'aggressive',
      risk: 0.6
    }
  },
  WSS: {
    hp: 2,
    moRange: 3,
    viRange: 6,
    weType: [],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    dangerScore: 30,
    aiProfile: {
      role: 'coward',
      risk: 0.1
    }
  },
  AAF: {
    hp: 2,
    atDamage: 3,
    moRange: 5,
    viRange: 6,
    weType: ['Small'],
    targetClass: 'air',
    spawnTerrain: ['surf', 'water', 'deep'],
    dangerScore: 20,
    lifeTurns: 6,
    noCounter: true,
    aiProfile: {
      role: 'scout',
      risk: 0.3
    }
  },
  ADB: {
    hp: 3,
    atDamage: 5,
    moRange: 4,
    viRange: 6,
    weType: ['Main'],
    targetClass: 'air',
    spawnTerrain: ['surf', 'water', 'deep'],
    dangerScore: 35,
    lifeTurns: 4,
    noCounter: true,
    aiProfile: {
      role: 'aggressive',
      risk: 0.7
    }
  },
  ATB: {
    hp: 2,
    atDamage: 4,
    moRange: 4,
    viRange: 6,
    weType: ['Torp'],
    targetClass: 'air',
    spawnTerrain: ['surf', 'water', 'deep'],
    dangerScore: 35,
    lifeTurns: 4,
    noCounter: true,
    aiProfile: {
      role: 'neutral',
      risk: 0.4
    }
  }
};

export { ClassTemplates };
