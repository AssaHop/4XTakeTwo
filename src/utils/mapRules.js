// 📁 src/utils/mapRules.js

export const mapRules = {
  terrainDistribution: {
    surf:  { min: 40, max: 70 },
    water: { min: 20, max: 80 },
    deep:  { min: 10, max: 40 },
    land:  { min: 10, max: 50 },
    hill:  { min: 10, max: 30 },
    mount: { min: 8, max: 16 },
    peak:  { min: 3,  max: 6 }
  },

  spawnRules: {
    // Земля спаунится рядом с другими землями и холмами
    land: {
      condition: "land,hill",
      requiredNeighbors: 4  ,
      probability: 0.8,
      fallback: "hill"
    },

    // Холмы рядом с землёй или другими холмами
    hill: {
      condition: "land,hill",
      requiredNeighbors: 4,
      probability: 1.0,
      fallback: "land"
    },

    // Горы рядом с холмами или другими горами
    mount: {
      condition: "hill,mount",
      requiredNeighbors: 6,
      probability: 0.8,
      fallback: "hill"
    },

    // Пик только если рядом минимум 3 горы
    peak: {
      condition: "mount",
      requiredNeighbors: 3,
      fallback: "mount"
    },

    // Глубина рядом с водой, но не с surf
    deep: {
      condition: "water",
      prohibitedNeighbors: "surf,land,hill",
      fallback: "water"
    },

    // Вода — универсальный тип
    water: {
      condition: "land,hill,surf,deep",
      probability: 0.7,
      fallback: "surf"
    },

    // Surf — визуальный "берег", рядом с сушей
    surf: {
      condition: "land,hill",
      requiredNeighbors: 1,
      probability: 0.5,
      fallback: "water"
    }
  }
};
