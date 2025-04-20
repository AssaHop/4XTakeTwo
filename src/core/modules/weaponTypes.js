export const WeaponTypes = {
  Main: {
    name: 'Main Gun',
    description: 'Main battery',
    range: 2,
    piercesCover: true,
    canTargetSubmerged: false,
    aoeRadius: 0,
    tags: ['shell', 'anti-ship'],
    blockLOS: ['peak', 'mount'] // 👈 Добавлено!
  },

  Torp: {
    name: 'Torpedo',
    description: 'Torpedoes',
    range: 3,
    piercesCover: false,
    canTargetSubmerged: true,
    aoeRadius: 0,
    tags: ['underwater', 'anti-sub'],
    blockLOS: ['surf', 'land', 'hill', 'mount', 'peak'] // если надо
  },

  Small: {
    name: 'Light Cannon',
    description: 'Secondary battery',
    range: 2,
    piercesCover: false,
    canTargetSubmerged: false,
    aoeRadius: 0,
    tags: 'sec',
    blockLOS: ['hill', 'mount', 'peak'] // 👈 Тоже может блокироваться
  }
};
