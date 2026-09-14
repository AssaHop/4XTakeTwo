// src/scenarios/skirmish.js
//
// Тестовый сценарий (запрошен пользователем 2026-09-13, см.
// docs/sessions/2026-09-13-session11.md) — та же механика точек захвата,
// что territory.js (карта/захват/экономика/условия победы — общая
// фабрика territoryScenarioFactory.js), но МИНИМАЛЬНЫЙ стартовый флот
// (2×WDD на сторону вместо полного 1×WBB+2×WCC+4×WDD). Оформляет как
// полноценный (выбираемый из меню) сценарий то, что раньше прогонялось
// только ad hoc headless-скриптами в scratchpad — рост флота почти
// целиком идёт через захват точек/экономику, а не от стартовой силы,
// удобно именно для тестов баланса экономики/лимита вместимости.
import { createTerritoryScenario } from './territoryScenarioFactory.js';

const SKIRMISH_FLEET = ['WDD', 'WDD'];

export const skirmish = createTerritoryScenario({
  id: 'skirmish',
  name: 'Skirmish (test)',
  fleet: SKIRMISH_FLEET,
  mapDefaults: { size: 18, profile: 'testArchipelago' },
});
