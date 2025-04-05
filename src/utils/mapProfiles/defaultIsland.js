export const defaultIsland = {
  id: 'defaultIsland',
  name: 'Default Island',

  // 🧬 Контроль генерации террейна
  seedCount: 13,                  // 🔹 Дополнительные случайные seed-гексы
  growIterations: 5,              // 🔁 Кол-во итераций роста кластеров
  growChance: 1,                // 🎲 Шанс захвата соседнего гекса
  clusterIntensity: 0.6,          // 📦 Пост-сглаживание

  // 🧭 Зональные seed-кластеры (используется если shapes не заданы)
  seedZones: [
    { zone: 'topLeft', count: 48, type: 'hill' },
    { zone: 'topRight', count: 0, type: 'mount' },
    { zone: 'right', count: 0, type: 'land' },
    { zone: 'bottomRight', count: 0, type: 'hill' },
    { zone: 'bottomLeft', count: 0, type: 'mount' },
    { zone: 'left', count: 0, type: 'land' },
    { zone: 'center', count: 0, type: 'peak' }
  ],

  // 🎲 Шейпы островов с весом (если задано, заменяет seedZones)
  shapes: [
    { name: 'round', chance: 0 },
    { name: 'tail', chance: 0 },
    { name: 'bone', chance: 0 },
    { name: 'twin', chance: 0 },
    { name: 'ridge', chance: 999 }
  ],

  // 🧪 Пользовательские spawn-правила
  spawnRules: {
    // Пример: reef, zone и т.д. можно добавить сюда
  },

  // 🧾 Ссылка на пресет террейна
  terrainPresetKey: 'default',

  // 🏝️ Правила формирования островов по размеру
  islandLayers: {
    micro: ['land', 'surf'],
    small: ['hill', 'land', 'surf'],
    medium: ['mount', 'hill', 'land', 'surf'],
    large: ['peak', 'mount', 'hill', 'land', 'surf']
  }
};
