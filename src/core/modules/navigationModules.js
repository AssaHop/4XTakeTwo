// 📂 core/modules/navigationModules.js

export const NavigationModules = {
  Dual: {
    name: 'Dual',
    tags: ['navigation'],
    description: 'Юнит может двигаться по water, surf, land; по суше 1 гекс.',
    effect: (unit) => {
      unit.moveTerrain = ['water', 'surf', 'land'];
      unit.moRange = Math.max(1, unit.moRange);
    }
  },
  Sail: {
    name: 'Sail',
    tags: ['navigation'],
    description: 'Перемещение по water и deep с уменьшением дальности хода.',
    effect: (unit) => {
      unit.moveTerrain = ['surf', 'water'];
      unit.moRange = Math.max(1, unit.moRange - 1);
    }
  },
  Navy: {
    name: 'Navy',
    tags: ['navigation'],
    description: 'Улучшенное перемещение по deep и +1 к дальности атаки.',
    effect: (unit) => {
      unit.moveTerrain = ['water', 'deep'];
      unit.moRange += 1;
      unit.atRange += 1;
    }
  },
  Air: {
    name: 'Air',
    tags: ['navigation'],
    description: 'Игнорирует препятствия, кроме peak.',
    effect: (unit) => {
      unit.ignoresObstacles = true;
    }
  },
  Sneak: {
    name: 'Sneak',
    tags: ['navigation'],
    description: 'Игнорирует препятствия от врагов.',
    effect: (unit) => {
      unit.ignoresEnemyZone = true;
    }
  },
  Steer: {
    name: 'Steer',
    tags: ['navigation'],
    description: 'Поворот занимает фазу движения.',
    effect: (unit) => {
      unit.turnTakesAction = true;
    }
  },
  Glide: {
    name: 'Glide',
    tags: ['navigation'],
    description: 'Удвоенная скорость по воде, блокирует Flee.',
    effect: (unit) => {
      unit.moRange *= 2;
      unit.blockFlee = true;
    }
  }
};
