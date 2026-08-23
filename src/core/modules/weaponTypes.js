export const WeaponTypes = {
  Main: {
    name: 'Main Gun',
    description: 'Main battery',
    range: 6,
    piercesCover: true,
    canTargetSubmerged: false,
    aoeRadius: 0,
    tags: ['shell', 'anti-ship'],
    blockLOS: ['peak', 'mount'],
    // Только по кораблям. Отсутствие 'air'/'sub' = не может выбрать такую цель.
    damageVs: { surface: 1.0 }
  },

  Torp: {
    name: 'Torpedo',
    description: 'Torpedoes',
    range: 7,
    piercesCover: false,
    canTargetSubmerged: true,
    aoeRadius: 0,
    tags: ['underwater', 'anti-sub'],
    blockLOS: ['surf', 'land', 'hill', 'mount', 'peak'],
    // Корабли и подлодки, не самолёты.
    damageVs: { surface: 1.0, sub: 1.0 }
  },

  Small: {
    name: 'Light Cannon',
    description: 'Secondary battery',
    range: 6,
    piercesCover: false,
    canTargetSubmerged: false,
    aoeRadius: 0,
    tags: 'sec',
    blockLOS: ['hill', 'mount', 'peak'],
    // Корабли полный урон, частичное ПВО (WDD/WCC), не подлодки.
    damageVs: { surface: 1.0, air: 0.5 }
  },

  // Авиация (AAF/ADB/ATB) до сессии 9 использовала корабельное оружие
  // (Small/Main/Torp) — отсюда range 6-7, как у обычного корабля, хотя
  // по дизайну (docs/ai-design-notes-tribes.md, сессия 6-7) самолёт
  // должен физически подлететь близко к цели, чтобы не быть безопасным
  // "снарядом издалека" (носитель уже безопасен сам по себе — см. тот же
  // документ). Профиль damageVs скопирован 1:1 с заимствованного оружия —
  // меняется только range, баланс урона не трогали.
  GunA: {
    name: 'Anti-Air Cannon',
    // Сессия 9, баланс-фикс: AAF (Fighter) больше НЕ может атаковать
    // корабли вообще (нет ключа surface — не "слабо", а физически не
    // может, см. docs/ai-design-notes-tribes.md, раздел про AAF, план
    // ещё сессии 6-7, реализовать было нечем до своего оружия). Полный
    // урон по air — это прямой контр ADB/ATB, задуманная роль
    // перехватчика.
    description: 'Оружие AAF (Fighter) — короткая дальность, только против воздуха.',
    range: 2,
    piercesCover: false,
    canTargetSubmerged: false,
    aoeRadius: 0,
    tags: ['air-to-air'],
    blockLOS: ['hill', 'mount', 'peak'],
    damageVs: { air: 1.0 }
  },

  BombA: {
    name: 'Dive Bomb',
    description: 'Оружие ADB (Dive bomber) — короткая дальность, тот же профиль что был у Main.',
    range: 2,
    piercesCover: true,
    canTargetSubmerged: false,
    aoeRadius: 0,
    tags: ['bomb', 'anti-ship'],
    blockLOS: ['peak', 'mount'],
    damageVs: { surface: 1.0 }
  },

  TorpA: {
    name: 'Aerial Torpedo',
    description: 'Оружие ATB (Torpedo bomber) — короткая дальность, тот же профиль что был у Torp.',
    range: 2,
    piercesCover: false,
    canTargetSubmerged: true,
    aoeRadius: 0,
    tags: ['underwater', 'anti-sub', 'bomb'],
    blockLOS: ['surf', 'land', 'hill', 'mount', 'peak'],
    damageVs: { surface: 1.0, sub: 1.0 }
  },

  DC: {
    name: 'Depth Charge',
    description: 'Anti-submarine weapon; cannot target surface ships or aircraft',
    range: 3,
    piercesCover: false,
    canTargetSubmerged: true,
    aoeRadius: 0,
    tags: ['underwater', 'anti-sub'],
    blockLOS: ['hill', 'mount', 'peak'],
    // Только против подлодок. Нет 'surface'/'air' = не может выбрать такую цель.
    damageVs: { sub: 1.0 }
  }
};
