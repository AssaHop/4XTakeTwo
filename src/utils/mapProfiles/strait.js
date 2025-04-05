export const strait = {
  id: 'strait',
  name: 'The Strait',

  // 🧬 Террейн-контроль
  seedCount: 38,                  // нет рандомных seed-островов (всё вручную через зоны)
  growIterations: 3,            // рост кластеров
  growChance: 0.5,              // шанс роста в каждом шаге
  clusterIntensity: 0.6,        // сглаживание/кластеризация

  // 🧭 Зональные точки генерации (искусственные seed-кластеры)
  seedZones: [
    { zone: 'topEdge', count: 18, type: 'land' },
    { zone: 'bottomEdge', count: 8, type: 'land' },
    { zone: 'center', count: 2, type: 'mount' },
    { zone: 'center', count: 4, type: 'hill' }
  ],

  // 🧪 Дополнительные правила спауна (если нужны)
  spawnRules: {
    // можно оставить пустым или добавить что-то по вкусу
  },

  // 🔗 Ссылка на набор вероятностей террейна
  terrainPresetKey: 'default'
};
