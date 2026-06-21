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
  }
};
