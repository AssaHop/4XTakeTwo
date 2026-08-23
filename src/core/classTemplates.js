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
    // Draft открывает deep (Sail сам его не даёт), terrainCost — штраф за
    // фактический шаг по нему: эсминец мельче капиталшипов, deep для него
    // дороже, а не запрещён (сессия 9, terrain-матрица по классам).
    modules: ['Sail', 'Charge', 'Flee', 'Draft'],
    terrainCost: { deep: 2 },
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
    // Танк: DEF выше ATK — иначе линкор one-shot'ает мелкие классы вместо
    // честных 3-4 ударов в обе стороны (см. docs/ai-design-notes-tribes.md,
    // раздел "Баланс: hits-to-kill", сессия 8).
    hp: 15,
    atDamage: 3,
    def: 5,
    moRange: 3,
    // Было 100 ("радар на всю карту") — безобидно, пока viRange нигде не
    // читался. Сессия 9 подключила fogOfWar.js, и один WBB (он есть в
    // стартовом флоте игрока всегда, dominator.js:FLEET) стал сносить
    // туман со всей карты сразу на старте. Снижено до radius=6, как у
    // остальных крупных юнитов (WSB/WCA/WLC/WSS/авиация) — совпадает с
    // его же atRange, "видит настолько, насколько стреляет".
    viRange: 6,
    weType: ['Main', 'Small'],
    weaponUnlocks: { Small: 1 },
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Navy', 'Splash'],
    // Самый крупный корпус во флоте — хуже всех держится на мелководье
    // (сессия 9, terrain-матрица: капиталшипы предпочитают deep).
    terrainCost: { surf: 2 },
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
    // Подлодка: живёт в water/deep, НЕ в surf (слишком мелко чтобы уйти
    // под воду) — Submerge вместо Sail (сессия 9). spawnTerrain синхронно
    // без surf: раньше был баг — spawnTerrain разрешал surf, а moveTerrain
    // (через Sail) deep не давал, при спауне на surf юнит был бы заперт.
    spawnTerrain: ['water', 'deep'],
    modules: ['Submerge'],
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
    // Draft открывает deep (Sail сам его не даёт); штраф на surf, как у
    // WBB — крупный, хуже держится на мелководье (сессия 9).
    modules: ['Sail', 'Draft'],
    terrainCost: { surf: 2 },
    dangerScore: 45,
    aiProfile: {
      role: 'defensive',
      risk: 0.3
    }
  },
  WLC: {
    // Amphibious assault ship: moves on water AND land; designed for capturing coastal objectives
    hp: 5,
    atDamage: 2,
    moRange: 3,
    viRange: 6,
    weType: ['Main'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Navy', 'Dual'],
    dangerScore: 20,
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
    // Своё оружие вместо заимствованного у WDD/WCC "Small" — сессия 9,
    // короткая дальность (2), самолёт должен физически подлететь.
    weType: ['GunA'],
    targetClass: 'air',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Air'],
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
    // Было 5 — one-shot'ало WDD(16dmg vs 10hp) и WCC(14dmg vs 12hp) без
    // единого шанса на ответку (noCounter). Снижено методологией
    // hits-to-kill сессии 8: теперь 2 удара и WDD, и WCC (см.
    // known-issues #31, найдено и исправлено сессией 9).
    atDamage: 3,
    moRange: 4,
    viRange: 6,
    // Своё оружие вместо заимствованного у WBB/WLC "Main" — сессия 9,
    // короткая дальность (2), самолёт должен физически подлететь.
    weType: ['BombA'],
    targetClass: 'air',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Air'],
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
    // Было 4 — one-shot'ало WDD(12dmg vs 10hp) без ответки. Снижено той
    // же методологией что ADB выше (known-issues #31).
    atDamage: 3,
    moRange: 4,
    viRange: 6,
    // Своё оружие вместо заимствованного у WDD "Torp" — сессия 9,
    // короткая дальность (2), самолёт должен физически подлететь.
    weType: ['TorpA'],
    targetClass: 'air',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Air'],
    dangerScore: 35,
    lifeTurns: 4,
    noCounter: true,
    aiProfile: {
      role: 'neutral',
      risk: 0.4
    }
  },

  ASP: {
    // Anti-Submarine Patrol: high vision scout, depth charges against WSB only
    hp: 6,
    atDamage: 3,
    moRange: 4,
    viRange: 8,
    weType: ['DC'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Navy'],
    dangerScore: 15,
    aiProfile: {
      role: 'scout',
      risk: 0.4
    }
  }
};

export { ClassTemplates };
