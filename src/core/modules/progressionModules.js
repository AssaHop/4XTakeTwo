// 📂 core/modules/progressionModules.js

export const ProgressionModules = {
  Fuel: {
    name: 'Fuel',
    tags: ['progression'],
    description: 'После N ходов активирует Drop.',
    effect: (unit) => {
      unit.fuelTurns = 3; // можно параметризовать
    }
  },
  Absorb: {
    name: 'Absorb',
    tags: ['progression'],
    description: 'Получает HP за каждое убийство.',
    effect: (unit) => {
      unit.absorbKill = true;
    }
  },
  Evolve: {
    name: 'Evolve',
    tags: ['progression'],
    description: 'Эволюционирует через несколько ходов.',
    effect: (unit) => {
      unit.evolutionStage = 1;
    }
  },
  Stable: {
    name: 'Stable',
    tags: ['progression'],
    description: 'Запрещает становиться ветераном.',
    effect: (unit) => {
      unit.disableVeterancy = true;
    }
  },
  Drop: {
    name: 'Drop',
    tags: ['progression'],
    description: 'Преобразует юнита в ресурсы.',
    effect: (unit) => {
      unit.canDrop = true;
    }
  }
};
