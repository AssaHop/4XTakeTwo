// 📁 src/utils/mapProfiles/defaultIsland.js

export const defaultIsland = {
  id: 'defaultIsland',
  name: 'Default Island',

  // 🧬 Контроль генерации террейна
  growIterations: 5,              // 🔁 Кол-во итераций роста кластеров
  growChance: 1,                  // 🎲 Шанс захвата соседнего гекса
  clusterIntensity: 0.6,          // 📦 Пост-сглаживание

  // 🎲 Новая генерация по зонам
  zonalIslands: [
    {
      name: 'topLeft',
      shapes: [
        { name: 'blob', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'topRight',
      shapes: [
        { name: 'tail', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'Right',
      shapes: [
        { name: 'blob', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'centerRight',
      shapes: [
        { name: 'ridge', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'centerLeft',
      shapes: [
        { name: 'ridge', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'bottomRight',
      shapes: [
        { name: 'blob', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'bottomLeft',
      shapes: [
        { name: 'blob', chance: 1, type: 'land' }
      ]
    },
    {
      name: 'Left',
      shapes: [
        { name: 'blob', chance: 1, type: 'land' }
      ]
    }
  ],

  // 🧾 Ссылка на пресет террейна
  terrainPresetKey: 'default',

  // 🧪 Пользовательские spawn-правила
  spawnRules: {},

  // 🏝️ Правила формирования островов по размеру
  islandLayers: {
    micro: ['land', 'surf'],
    small: ['hill', 'land', 'surf'],
    medium: ['mount', 'hill', 'land', 'surf'],
    large: ['peak', 'mount', 'hill', 'land', 'surf']
  }
};
