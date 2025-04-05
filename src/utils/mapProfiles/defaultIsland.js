export const defaultIsland = {
  id: 'defaultIsland',
  name: 'Default Island',

  // 🧬 Контроль генерации террейна
  seedCount: 13,                  // 🔹 Дополнительные случайные seed-гексы
  growIterations: 5,            // 🔁 Кол-во итераций роста кластеров
  growChance: 0.5,              // 🎲 Шанс захвата соседнего гекса
  clusterIntensity: 0.6,        // 📦 Пост-сглаживание

  // 🧭 Зональные seed-кластеры (углы и центр карты)
  seedZones: [
    { zone: 'topLeft', count: 6, type: 'hill' },
    { zone: 'topRight', count: 6, type: 'mount' },
    { zone: 'right', count: 6, type: 'land' },
    { zone: 'bottomRight', count: 0, type: 'hill' },
    { zone: 'bottomLeft', count: 0, type: 'mount' },
    { zone: 'left', count: 0, type: 'land' },
    { zone: 'center', count: 0, type: 'peak' }
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
