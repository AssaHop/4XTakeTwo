// Тестовый профиль карты (запрошен пользователем 2026-09-13): больше
// мелких островов, разбросанных по карте — чтобы флоту было что обходить
// при тестах пасфайндинга/AI, а не чистая открытая вода. Не для
// продакшен-геймплея, отдельный профиль намеренно, чтобы не трогать
// defaultIsland (см. docs/sessions/2026-09-13-session11.md).
//
// Генерация земли переведена (2026-09-14) с авторских зон/форм
// (zonalIslands) на generateScatteredIslands — семена без привязки к
// зонам + шумовой фильтр + равномерный рост, по мотивам наблюдения
// пользователя за реальным генератором карт Polytopia. Только этот
// профиль — defaultIsland/strait остаются на zonalIslands без изменений.
export const testArchipelago = {
  id: 'testArchipelago',
  name: 'Test Archipelago',

  growIterations: 2,
  growChance: 0.35,
  clusterIntensity: 0.35,

  scatteredIslands: {
    seedDensity: 0.06,
    survivalChance: 0.55,
  },

  terrainPresetKey: 'default',
  spawnRules: {},

  verticalGrowthRules: {
    land: { hill: { threshold: 2, chance: 0.6 } },
    hill: { mount: { threshold: 3, chance: 0.5 } },
  },

  verticalIterations: 3,
};
