// 📂 core/classTemplates.js
const ClassTemplates = {
  WDD: {
    // Баланс-эксперимент (пользователь, после разбора pack-vs-WBB
    // динамики): было atk2/def2 (def=atk по умолчанию). def отдельно
    // занижен до 1 — glass cannon, бьёт чуть сильнее, но почти не держит
    // удар — компенсируется тем, что нужно меньше своих попаданий, чтобы
    // убить более крупные цели (см. hits-to-kill в чате).
    // Эксперимент (запрошено пользователем 2026-09-13): atk2.5→2, def1→1.5
    // (было def:2) — battle-sim с def:1 показал 100% детерминированный
    // исход (пачка либо всегда выносит босса без потерь, либо всегда гибнет
    // в размен) — пользователь попросил def:1.5, чтобы результат не был
    // гарантированным в обе стороны. Флоты в fleet-vs-fleet тесте гибли
    // слишком быстро (~7 ходов) — hp10→15 (см. WCC/WBB рядом,
    // docs/sessions/2026-09-13-session11.md).
    hp: 15,
    atDamage: 2,
    def: 1.5,
    // Эксперимент "atRange=viRange", раунд 2: +1 ко всем moRange/viRange
    // ростера (итоговый moRange=3, viRange=3) — раунд 1 (moRange=2/viRange=2
    // финал) давал battle-sim с 0% решённых боёв за 200 ходов (fleet-vs-fleet
    // 1×WBB+2×WCC+5×WDD), слишком медленное сближение/обзор. Шаблон = 4,
    // чтобы ПОСЛЕ Sail (-1, см. предыдущий комментарий про WDD/Navy) вышло
    // честных 3.
    moRange: 4,
    viRange: 3,
    weType: ['Small', 'Torp'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water'],
    // Draft открывает deep (Sail сам его не даёт), terrainCost — штраф за
    // фактический шаг по нему: эсминец мельче капиталшипов, deep для него
    // дороже, а не запрещён (сессия 9, terrain-матрица по классам).
    modules: ['Sail', 'Charge', 'Flee', 'Draft'],
    terrainCost: { deep: 2 },
    // Torp как заряжаемая спецатака (обсуждение с пользователем): копится
    // по +1 за каждый обычный успешный удар WDD (не за ход, не от контры —
    // см. units.js/combatLogic.js), на 2-м ударе висит "заряжено", следующая
    // атака бьёт с atDamage×2 и сбрасывает заряд. Числа стартовые, ждут
    // подстройки по playtest (пользователь: "потом если что подвинем").
    torpedoAbility: { chargeNeeded: 2, multiplier: 2 },
    aiProfile: {
      role: 'defensive',
      overrides: {
        lowHp: 'fallback'
      },
      risk: 0.2
    }
  },
  WCC: {
    // Баланс-эксперимент, тот же принцип что WDD выше: def занижен до 1,
    // hp и atk подняты — сильнее бьёт, крупнее корпус, но почти не держит
    // ответный удар. Было hp12/atk3/def3 (def=atk по умолчанию).
    // Эксперимент (запрошено пользователем 2026-09-13): hp15→10, atk3.5→3,
    // def2→1.5 — тот же принцип, что у WDD выше (def:1 давал слишком
    // предсказуемый исход). hp10→20 — тот же раунд, что и у WDD/WBB
    // (флоты гибли слишком быстро). См. docs/sessions/2026-09-13-session11.md.
    hp: 20,
    atDamage: 3,
    def: 1.5,
    // Эксперимент "atRange=viRange", раунд 2 (+1 всем, см. WDD выше).
    moRange: 3,
    viRange: 3,
    weType: ['Small', 'Main'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
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
    // Танк, Giant-архетип (polytopia.fandom.com/wiki/Units, реальные данные
    // сверены пользователем): в оригинале даже самые танковые юниты (Giant
    // atk5/def4, Ice Fortress atk4/def3) держат atk >= def, живучесть даёт
    // HP, а не перевёрнутый def. Было atk3/def5 (def>atk) — это архетип
    // Defender'а (atk1/def3 в оригинале, низкая мобильность, "не атакует
    // сам, только обороняется"), а WBB по aiProfile.role активно участвует
    // в бою — несовпадение архетипа и роли давало нечестный зеркальный бой
    // (WBB vs WBB: атакующий бьёт на 5, получает 14 в ответ). Теперь
    // атк4/def3 (та же пропорция, что Ice Fortress), hp 15->20 компенсирует
    // живучесть через пул HP, как и должно быть у "гиганта".
    // Эксперимент (запрошено пользователем 2026-09-13): hp20→15→25, atk4→3,
    // def3 (без изменений) — первый раунд (hp15) давал флот-vs-флот бои
    // ~7 ходов, пользователь счёл слишком быстрым, поднято до 25. См.
    // docs/sessions/2026-09-13-session11.md.
    hp: 25,
    atDamage: 3,
    def: 3,
    // Эксперимент "atRange=viRange", раунд 2 (+1 всем): moRange финал теперь
    // =2, а не 1 — terrainCost.surf снова не декоративен (round-up правило
    // кусается только при финале=1).
    moRange: 3,
    viRange: 3,
    weType: ['Main', 'Small'],
    weaponUnlocks: { Small: 1 },
    targetClass: 'surface',
    // surf убран (2026-09-16, по запросу пользователя) — WBB и так хуже
    // всех держится на мелководье (terrainCost.surf=2 ниже), спауниться
    // там ему тоже не место; самый крупный корпус флота стартует сразу в
    // воде/на глубине.
    spawnTerrain: ['water', 'deep'],
    // Navy -> Draft: у WBB moRange=1 УЖЕ на полу (Math.max(1, ...) в
    // navigationModules.js). Sail(-1) на полу становится no-op (1-1=0,
    // floor вернёт 1), а Navy всё равно потом добавляет +1 — net получался
    // +1 вместо ожидаемого net 0, реальный final moRange был 2, не 1
    // (проверено прогоном applyModules() в Node). Draft даёт тот же доступ
    // к deep, что и Navy, но без побочного +1 moRange — тем же приёмом,
    // что уже применён к WDD/WCA.
    modules: ['Sail', 'Draft', 'Splash'],
    // Самый крупный корпус во флоте — хуже всех держится на мелководье
    // (сессия 9, terrain-матрица: капиталшипы предпочитают deep).
    terrainCost: { surf: 2 },
    aiProfile: {
      role: 'neutral',
      risk: 0.4
    }
  },
  WSB: {
    hp: 3,
    atDamage: 3,
    // Эксперимент "atRange=viRange", раунд 2 (+1 всем): moRange финал теперь
    // =2, viRange=2. weType — TorpS (свой экземпляр Torp с range=2 в
    // weaponTypes.js) — общий Torp тюнингован под WDD (viRange=3), делить
    // range с ним сломало бы "atRange=viRange" для одной из сторон (тот же
    // паттерн, что у авиации в session9).
    moRange: 3,
    viRange: 2,
    weType: ['TorpS'],
    targetClass: 'sub',
    // Подлодка: живёт в water/deep, НЕ в surf (слишком мелко чтобы уйти
    // под воду) — Submerge вместо Sail (сессия 9). spawnTerrain синхронно
    // без surf: раньше был баг — spawnTerrain разрешал surf, а moveTerrain
    // (через Sail) deep не давал, при спауне на surf юнит был бы заперт.
    spawnTerrain: ['water', 'deep'],
    modules: ['Submerge'],
    aiProfile: {
      role: 'neutral',
      risk: 0.5
    }
  },
  WCA: {
    hp: 4,
    atDamage: 2,
    // Эксперимент "atRange=viRange", раунд 2 (+1 всем): moRange финал=2,
    // viRange=3 — terrainCost.surf снова значим (см. комментарий WBB).
    moRange: 3,
    viRange: 3,
    weType: ['Small'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    // Draft открывает deep (Sail сам его не даёт); штраф на surf, как у
    // WBB — крупный, хуже держится на мелководье (сессия 9).
    modules: ['Sail', 'Draft'],
    terrainCost: { surf: 2 },
    // strategicValue, не dangerScore (убрана везде — см. combatSimulator.js:
    // dangerRatio, теперь опасность эмерджентна из atDamage/hp). WCA сама
    // по себе слабый боец (atDamage2/hp4) — её эмерджентная опасность как
    // цели была бы низкой, но реальная ценность НЕ в её собственном бое:
    // это носитель авиации (спавнит ADB/ATB/AAF, aviationLogic.js), и это
    // не выводится из боевых статов. Явная надбавка вместо ручной 45.
    strategicValue: 25,
    aiProfile: {
      role: 'defensive',
      risk: 0.3
    }
  },
  WLC: {
    // Amphibious assault ship: moves on water AND land; designed for capturing coastal objectives
    hp: 5,
    atDamage: 2,
    // Эксперимент "atRange=viRange", раунд 2 (+1 всем): moRange финал=2,
    // viRange=2. weType — MainL (свой экземпляр Main с range=2 в
    // weaponTypes.js) — общий Main тюнингован под WCC/WBB (viRange=3), см.
    // комментарий WSB выше про тот же приём.
    moRange: 3,
    viRange: 2,
    weType: ['MainL'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    // Navy -> Draft: тот же floor+add баг, что у WBB (см. её комментарий) —
    // WLC тоже стоял на полу moRange=1, Navy добавляла лишнюю +1 сверху.
    // Dual (доступ на land) оставлен без изменений.
    modules: ['Sail', 'Draft', 'Dual'],
    aiProfile: {
      role: 'aggressive',
      risk: 0.6
    }
  },
  WSS: {
    hp: 2,
    // Эксперимент "atRange=viRange", раунд 2 (+1 всем; не применимо к
    // оружию — WSS без него).
    moRange: 2,
    viRange: 2,
    weType: [],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    aiProfile: {
      role: 'coward',
      risk: 0.1
    }
  },
  AAF: {
    hp: 2,
    atDamage: 3,
    // Эксперимент "atRange=viRange", раунд 2 (+1 всем) — GunA.range тоже
    // поднят до 3 в weaponTypes.js, совпадает с новым viRange.
    moRange: 4,
    viRange: 3,
    // Своё оружие вместо заимствованного у WDD/WCC "Small" — сессия 9,
    // короткая дальность (2), самолёт должен физически подлететь.
    weType: ['GunA'],
    targetClass: 'air',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Air'],
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
    // Эксперимент "atRange=viRange", раунд 2 (+1 всем) — BombA.range тоже
    // поднят до 3.
    moRange: 4,
    viRange: 3,
    // Своё оружие вместо заимствованного у WBB/WLC "Main" — сессия 9,
    // короткая дальность (2), самолёт должен физически подлететь.
    weType: ['BombA'],
    targetClass: 'air',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Air'],
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
    // Эксперимент "atRange=viRange", раунд 2 (+1 всем) — TorpA.range тоже
    // поднят до 3.
    moRange: 4,
    viRange: 3,
    // Своё оружие вместо заимствованного у WDD "Torp" — сессия 9,
    // короткая дальность (2), самолёт должен физически подлететь.
    weType: ['TorpA'],
    targetClass: 'air',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Air'],
    lifeTurns: 4,
    noCounter: true,
    aiProfile: {
      role: 'neutral',
      risk: 0.4
    }
  },

  ASP: {
    // Anti-Submarine Patrol: high vision scout, depth charges against WSB only
    // Эксперимент "atRange=viRange" урезал viRange 8→2 — ASP теряет
    // заявленную роль "high vision scout" (был самым дальнозорким юнитом в
    // игре, теперь наравне с рядовыми кораблями). Роль aiProfile ('scout')
    // не трогали. Раунд 2 (+1 всем): viRange 2→3, moRange 3→4, DC.range
    // 2→3 в weaponTypes.js.
    hp: 6,
    atDamage: 3,
    moRange: 4,
    viRange: 3,
    weType: ['DC'],
    targetClass: 'surface',
    spawnTerrain: ['surf', 'water', 'deep'],
    modules: ['Sail', 'Navy'],
    aiProfile: {
      role: 'scout',
      risk: 0.4
    }
  }
};

export { ClassTemplates };
