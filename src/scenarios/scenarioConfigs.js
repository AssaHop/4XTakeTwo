export const scenarioConfigs = {
    dominator: {
      id: 'dominator',
      name: 'Dominator',
      description: 'Eliminate!',
      profile: 'default',
      defaultSize: 10,
      minSize: 10,
      maxSize: 30,
      minEnemies: 1,
      maxEnemies: 6,
      isPvP: false,
    },
  
    conqueror: {
      id: 'conqueror',
      name: 'Conqueror',
      description: 'Get Highscore',
      profile: 'default',
      defaultSize: 10,
      minSize: 10,
      maxSize: 25,
      minEnemies: 1,
      maxEnemies: 5,
      isPvP: false,
    },

    territory: {
      id: 'territory',
      name: 'Territory',
      description: 'Hold your ground, take theirs',
      profile: 'testArchipelago',
      defaultSize: 16,
      minSize: 14,
      maxSize: 30,
      minEnemies: 1,
      maxEnemies: 5,
      isPvP: false,
    },

    skirmish: {
      id: 'skirmish',
      name: 'Skirmish (test)',
      description: 'Tiny start, grow by capture — economy/balance testing',
      profile: 'testArchipelago',
      defaultSize: 18,
      minSize: 14,
      maxSize: 30,
      minEnemies: 1,
      maxEnemies: 5,
      isPvP: false,
    },

    duel: {
      id: 'duel',
      name: 'Duel (fleet vs fleet)',
      description: 'No capture points, no economy — mirrored spawns, pure elimination',
      profile: 'defaultIsland',
      defaultSize: 16,
      minSize: 12,
      maxSize: 30,
      minEnemies: 1,
      maxEnemies: 5,
      isPvP: false,
    }
  };
  