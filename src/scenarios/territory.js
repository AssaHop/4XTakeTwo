// src/scenarios/territory.js
//
// Сценарий "точки захвата вместо истребления" (запрошен пользователем
// 2026-09-13, см. docs/sessions/2026-09-13-session11.md) — полный
// стартовый флот на сторону. Механика (карта/точки/захват/победа) —
// общая с skirmish.js, вынесена в territoryScenarioFactory.js.
import { createTerritoryScenario } from './territoryScenarioFactory.js';

const FULL_FLEET = ['WBB', 'WCC', 'WCC', 'WDD', 'WDD', 'WDD', 'WDD'];

export const territory = createTerritoryScenario({
  id: 'territory',
  name: 'Territory',
  fleet: FULL_FLEET,
  mapDefaults: { size: 16, profile: 'testArchipelago' },
});
