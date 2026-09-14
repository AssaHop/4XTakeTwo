// src/scenarios/territoryScenarioFactory.js
//
// Общая механика для "точки захвата вместо истребления" сценариев
// (territory.js, skirmish.js) — вынесено сессией 11 (2026-09-13) при
// добавлении второго сценария на той же основе, чтобы не дублировать
// карту/точки/условия победы, отличается только состав стартового флота
// и дефолты карты. См. docs/sessions/2026-09-13-session11.md.
//
// Каждая сторона стартует С ОДНОЙ своей "домашней" точкой захвата (флот
// спаунится кучно рядом с ней), плюс на карте разбросаны нейтральные точки
// сверх домашних. Захват — общая механика captureLogic.js. Поражение —
// если у стороны не осталось СВОИХ точек захвата (даже с живым флотом)
// ИЛИ не осталось юнитов вообще.
import { generateMapByProfile } from '../utils/generateMapByProfile.js';
import { spawnClusteredFleet } from '../utils/fleetSpawn.js';
import { pickMaxMinSpreadPoints, fillPointsUntilSaturated } from '../utils/capturePointUtils.js';
import { initAllegiance } from '../core/diplomacy.js';
import { HOME_BASE_CAPACITY, CAPTURED_BASE_CAPACITY } from '../core/economyLogic.js';

// Плотность и разброс точек — по мотивам реконструированного алгоритма
// генерации карт Polytopia (github.com/QuasiStellar/Polytopia-Map-
// Generator, разобрано пользователем 2026-09-13): не фиксированное число
// точек, а насыщение карты с минимальным расстоянием NEUTRAL_MIN_DISTANCE
// между ЛЮБЫМИ двумя точками, пока не кончится место. Больше карта —
// больше точек само собой.
const NEUTRAL_MIN_DISTANCE = 3;

function ownersList(enemyCount) {
  return ['player1', ...Array.from({ length: enemyCount }, (_, i) => `enemy${i}`)];
}

function isDefeated(state, owner) {
  const hasUnits = state.units.some(u => u.owner === owner);
  const hasPoint = (state.capturePoints || []).some(cp => cp.owner === owner);
  return !hasUnits || !hasPoint;
}

// config: { id, name, fleet: string[], mapDefaults: {size, profile} }
export function createTerritoryScenario({ id, name, fleet, mapDefaults = {} }) {
  const { size: defaultSize = 16, profile: defaultProfile = 'testArchipelago' } = mapDefaults;

  // Домашние точки, посчитанные в getInitialCapturePoints(), нужны
  // повторно в getInitialUnits() (флот спаунится у своей точки) —
  // game.js вызывает их последовательно в одном initGame(), без
  // промежуточного стороннего кода между ними (тот же паттерн
  // module-level кэша, что spawnCycle в aviationLogic.js/fsmMap в
  // aiManager.js). Замыкание на СКОУП ФАБРИКИ — у каждого сценария,
  // созданного этой фабрикой, своя независимая переменная, territory и
  // skirmish не делят кэш друг с другом.
  let lastHomePoints = [];

  return {
    id,
    name,

    generateMap: ({ size = defaultSize, profile = defaultProfile, seed = Date.now() } = {}) => {
      return generateMapByProfile(profile, size, seed);
    },

    getInitialCapturePoints: (mapIndex, options = {}) => {
      const enemyCount = options.enemyCount ?? 2;
      const owners = ownersList(enemyCount);

      // Уточнение пользователя 2026-09-13 по реальному алгоритму
      // Polytopia: "в некоторых алгоритмах, когда уже сделана карта с
      // равноудалёнными точками, переназначаются столицы — так можно
      // добиться равномерности не мешая росту террейна". Порядок: СНАЧАЛА
      // вся сетка точек равномерно, ПОТОМ из неё выбирается max-min
      // подмножество под "домашние" — не отдельный проход по земле заново.
      let allSpots = fillPointsUntilSaturated(mapIndex, { minDistance: NEUTRAL_MIN_DISTANCE });
      // options.neutralCount — явный потолок для тестов (общее число точек
      // = домашние + это значение); без него карта насыщается сама.
      if (options.neutralCount != null) {
        allSpots = allSpots.slice(0, options.neutralCount + owners.length);
      }

      const homeSpots = pickMaxMinSpreadPoints(mapIndex, owners.length, { candidates: allSpots });
      const homeCPs = owners.map((owner, i) => homeSpots[i] && {
        q: homeSpots[i].q, r: homeSpots[i].r, s: homeSpots[i].s,
        owner, claimant: null, captureProgress: 0, isHome: true,
        capacityLevel: HOME_BASE_CAPACITY,
      }).filter(Boolean);

      const homeKeys = new Set(homeCPs.map(cp => `${cp.q},${cp.r},${cp.s}`));
      const neutralCPs = allSpots
        .filter(h => !homeKeys.has(`${h.q},${h.r},${h.s}`))
        .map(h => ({
          q: h.q, r: h.r, s: h.s,
          owner: null, claimant: null, captureProgress: 0,
          capacityLevel: CAPTURED_BASE_CAPACITY,
        }));

      lastHomePoints = homeCPs;
      return [...homeCPs, ...neutralCPs];
    },

    getInitialUnits: (map, { enemyCount = 2 } = {}) => {
      const units = [];
      const owners = ownersList(enemyCount);

      for (const owner of owners) {
        const home = lastHomePoints.find(cp => cp.owner === owner) || null;
        spawnClusteredFleet(fleet, map, units, owner, home);
      }

      return units;
    },

    // Симметричный FFA — не про "все против игрока" как dominator, тут
    // поражение решает экономика (точки), а не диплом-перекос старта.
    getInitialAllegiance: (owners) => initAllegiance(owners, { playerBias: 0 }),

    winCondition: (state) => {
      const enemies = (state.turnOrder || []).filter(o => o !== 'player1');
      return enemies.length > 0 && enemies.every(o => isDefeated(state, o));
    },

    loseCondition: (state) => isDefeated(state, 'player1'),
  };
}
