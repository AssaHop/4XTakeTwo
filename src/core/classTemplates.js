// 📂 core/classTemplates.js
const ClassTemplates = {
  WDD: {
    hp: 3,
    moRange: 4,
    viRange: 4,
    weType: ['Small'],
    spawnTerrain: ['surf', 'water'],
    moveTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Charge', 'Flee'],
    aiProfile: {
      role: 'defensive',
      overrides: {
        lowHp: 'fallback'
      },
      risk: 0.2
    }
  },
  WCC: {
    hp: 4,
    moRange: 4,
    viRange: 4,
    weType: ['Small', 'Main'],
    spawnTerrain: ['surf', 'water', 'deep'],
    moveTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Navy', 'Charge', 'Percy'],
    aiProfile: {
      role: 'aggressive',
      overrides: {
        lowHp: 'aggressive'
      },
      risk: 0.8
    }
  },
  WBB: {
    hp: 6,
    moRange: 6,
    viRange: 6,
    weType: ['Main'],
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Navy'],
    aiProfile: {
      role: 'neutral',
      risk: 0.4
    }
  },
  WSB: {
    hp: 3,
    moRange: 3,
    viRange: 6,
    weType: ['Torp'],
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail'],
    aiProfile: {
      role: 'neutral',
      risk: 0.5
    }
  },
  WCA: {
    hp: 4,
    moRange: 2,
    viRange: 6,
    weType: ['Small'],
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail'],
    aiProfile: {
      role: 'defensive',
      risk: 0.3
    }
  },
  WLC: {
    hp: 3,
    moRange: 3,
    viRange: 6,
    weType: ['Main'],
    spawnTerrain: ['surf', 'water', 'deep'],
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
    spawnTerrain: ['surf', 'water', 'deep'],
    aiProfile: {
      role: 'coward',
      risk: 0.1
    }
  },
  AAF: {
    hp: 2,
    moRange: 5,
    viRange: 6,
    weType: ['Small'],
    spawnTerrain: ['surf', 'water', 'deep'],
    aiProfile: {
      role: 'scout',
      risk: 0.3
    }
  },
  ADB: {
    hp: 3,
    moRange: 4,
    viRange: 6,
    weType: ['Main'],
    spawnTerrain: ['surf', 'water', 'deep'],
    aiProfile: {
      role: 'aggressive',
      risk: 0.7
    }
  },
  ATB: {
    hp: 2,
    moRange: 4,
    viRange: 6,
    weType: ['Torp'],
    spawnTerrain: ['surf', 'water', 'deep'],
    aiProfile: {
      role: 'neutral',
      risk: 0.4
    }
  }
};

export { ClassTemplates };
