// 📂 core/modules/navigationModules.js

export const NavigationModules = {
  Dual: {
    name: 'Dual',
    tags: ['navigation'],
    description: 'Юнит может двигаться по water, surf, land; по суше 1 гекс.',
    effect: (unit) => {
      unit.moveTerrain = Array.from(new Set([...(unit.moveTerrain || []), 'water', 'surf', 'land']));
      unit.moRange = Math.max(1, unit.moRange); // Подтверждаем, что дальность не будет меньше 1
    }
  },
  Sail: {
    name: 'Sail',
    tags: ['navigation'],
    description: 'Перемещение по water и deep с уменьшением дальности хода.',
    effect: (unit) => {
      unit.moveTerrain = Array.from(new Set([...(unit.moveTerrain || []), 'surf', 'water']));
      unit.moRange = Math.max(1, unit.moRange - 1);
    }
  },
  Navy: {
    name: 'Navy',
    tags: ['navigation'],
    // Внимание: текст говорит "+1 к дальности атаки", но код ниже реально
    // даёт +1 moRange (дальность ХОДА), не atRange. Расхождение описания
    // и кода не трогали — сами числа калиброваны под это (Sail -1 + Navy
    // +1 = 0 net у WCC/WBB), менять код рискованно без пересчёта баланса.
    description: 'Улучшенное перемещение по deep и +1 к дальности атаки.',
    effect: (unit) => {
      unit.moveTerrain = Array.from(new Set([...(unit.moveTerrain || []), 'water', 'deep']));
      unit.moRange += 1;
    }
  },
  Draft: {
    name: 'Draft',
    tags: ['navigation'],
    // Для юнитов, которым нужен deep, но НЕ полноценный Navy (тот заодно
    // компенсирует штраф Sail через +1 moRange — see выше). Draft просто
    // открывает deep, без побочных эффектов на скорость. Штраф за
    // фактическое использование deep задаётся отдельно, через
    // unit.terrainCost (см. classTemplates.js), не через этот модуль —
    // module = что разрешено, terrainCost = сколько это стоит.
    description: 'Открывает deep для передвижения, без изменения дальности хода.',
    effect: (unit) => {
      unit.moveTerrain = Array.from(new Set([...(unit.moveTerrain || []), 'deep']));
    }
  },
  Submerge: {
    name: 'Submerge',
    tags: ['navigation'],
    // Для подлодок: water+deep — родная стихия, но НЕ surf (слишком
    // мелко). Та же -1 moRange, что у Sail (не переиспользуем Sail
    // напрямую — он бы дал surf, который тут как раз не нужен).
    description: 'Двигается по water и deep, не по surf. Тот же штраф хода, что у Sail.',
    effect: (unit) => {
      unit.moveTerrain = Array.from(new Set([...(unit.moveTerrain || []), 'water', 'deep']));
      unit.moRange = Math.max(1, unit.moRange - 1);
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
