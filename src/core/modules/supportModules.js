// 📂 core/modules/supportModules.js

export const SupportModules = {
  Carry: {
    name: 'Carry',
    tags: ['support'],
    description: 'Позволяет нести другого юнита.',
    effect: (unit) => {
      unit.canCarry = true;
    }
  },
  Drench: {
    name: 'Drench',
    tags: ['support'],
    description: 'Затапливает атакуемые клетки, превращая в water или deep.',
    effect: (unit) => {
      unit.canDrench = true;
    }
  },
  Freeze: {
    name: 'Freeze',
    tags: ['support'],
    description: 'Замораживает соседние клетки и врагов при движении.',
    effect: (unit) => {
      unit.freezeOnMove = true;
    }
  },
  Prop: {
    name: 'Prop',
    tags: ['support'],
    description: 'Действие Boost — усиливает соседей по атаке и передвижению.',
    effect: (unit) => {
      unit.abilities = unit.abilities || [];
      unit.abilities.push('boost');
    }
  },
  Indy: {
    name: 'Indy',
    tags: ['support'],
    description: 'Не занимает ресурсные слоты.',
    effect: (unit) => {
      unit.independent = true;
    }
  },
  Explore: {
    name: 'Explore',
    tags: ['support'],
    description: 'Увеличенный радиус разведки.',
    effect: (unit) => {
      unit.exploreBoost = true;
    }
  }
};
