// src/scenarios/territoryScenarioFactory.js
//
// Общая механика для "точки захвата вместо истребления" сценариев
// (territory.js, skirmish.js) — вынесено сессией 11 (2026-09-13) при
// добавлении второго сценария на той же основе. См.
// docs/sessions/2026-09-13-session11.md.
//
// Каждая сторона стартует С ОДНОЙ своей "домашней" точкой захвата (флот
// спаунится кучно рядом с ней), плюс на карте разбросаны нейтральные точки
// сверх домашних. Захват — общая механика captureLogic.js. Поражение —
// если у стороны не осталось СВОИХ точек захвата (даже с живым флотом)
// ИЛИ не осталось юнитов вообще.
//
// Генерация карты (2026-09-14, по прямому уточнению пользователя) — ОДИН
// проход вместо двух независимых: раньше `generateScatteredIslands` сама
// решала, где семена террейна, а `fillPointsUntilSaturated` ОТДЕЛЬНО
// решала, где точки захвата, уже на готовой земле. Теперь один и тот же
// набор точек — И семена роста островов, И будущие точки захвата (домашние
// + нейтральные). Порядок: (1) точки разбрасываются случайно по чистой
// карте с проверкой минимального интервала — 4 точки на игрока
// (масштабируется размером карты); (2) от них растут острова; (3) из ЭТИХ
// ЖЕ точек по углам гекс-карты (у неё их естественно 6) выбираются
// домашние базы для ≤6 игроков, остальные точки — нейтральные.
import { generateHexMap } from '../world/map.js';
import { hexDistance } from '../mechanics/hexUtils.js';
import {
  createSeededRNG, growLandFromSeeds, clusterizeTerrain,
  applyVerticalIslandGrowth, applyLandToHillFilter, applySurfRim,
  applyWaterToDeepFilter, ensureWaterConnectivity,
} from '../utils/islandBuilder.js';
import { spawnClusteredFleet } from '../utils/fleetSpawn.js';
import { initAllegiance } from '../core/diplomacy.js';
import { HOME_BASE_CAPACITY, CAPTURED_BASE_CAPACITY } from '../core/economyLogic.js';

const POINTS_PER_PLAYER = 4;
const REFERENCE_MAP_SIZE = 16; // "если карта 16 или 18" — базовый размер для расчёта 4/игрока

function ownersList(enemyCount) {
  return ['player1', ...Array.from({ length: enemyCount }, (_, i) => `enemy${i}`)];
}

function isDefeated(state, owner) {
  const hasUnits = state.units.some(u => u.owner === owner);
  const hasPoint = (state.capturePoints || []).some(cp => cp.owner === owner);
  return !hasUnits || !hasPoint;
}

// 6 вершин гексагональной карты радиуса size — естественные "углы" для до
// 6 игроков (пользователь: "до 6ти игроков всё просто, по углам, а дальше
// посмотрим" — случай >6 игроков ниже добирается жадно, не по углам).
function hexMapCorners(size) {
  return [
    { q: 0, r: -size, s: size },
    { q: size, r: -size, s: 0 },
    { q: size, r: 0, s: -size },
    { q: 0, r: size, s: -size },
    { q: -size, r: size, s: 0 },
    { q: -size, r: 0, s: size },
  ];
}

function shuffle(array, rng) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Разбрасывает count точек случайно (rejection sampling), проверяя что
// каждая новая точка на расстоянии >= minDistance от уже выбранных —
// пользователь: "равноудалённо, но рандомно... проверь достаточно ли они
// далеко". Не строгий max-min (это про "случайно, но не слипшись", не
// про идеальную равномерность любой ценой) — если за MAX_ATTEMPTS не
// нашлось места с нужным интервалом, берём любую свободную клетку, не
// проваливаем генерацию.
function scatterSpacedPoints(mapTiles, count, minDistance, rng) {
  const points = [];
  const MAX_ATTEMPTS = 60;

  for (let i = 0; i < count; i++) {
    let candidate = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const pick = mapTiles[Math.floor(rng() * mapTiles.length)];
      if (points.every(p => hexDistance(pick, p) >= minDistance)) {
        candidate = pick;
        break;
      }
    }
    points.push(candidate || mapTiles[Math.floor(rng() * mapTiles.length)]);
  }

  return points;
}

// Генерирует карту и точки-семена за один проход (см. комментарий вверху
// файла). Возвращает { map, seedPoints, rng } — rng отдаётся наружу и
// переиспользуется дальше для выбора домашних точек (тот же детерминизм
// от одного seed на всю партию, не два независимых источника рандома).
function generateSeededTerritoryMap({ size, seed = Date.now(), playerCount = 2 }) {
  const map = generateHexMap(size, 0, 0);
  const mapTiles = map.flat();
  const rng = createSeededRNG(seed);

  const pointCount = Math.max(
    playerCount,
    Math.round(POINTS_PER_PLAYER * playerCount * (size / REFERENCE_MAP_SIZE))
  );
  // Целевой интервал — грубая оценка "разложить pointCount точек по
  // площади гекс-карты радиуса size примерно равномерно".
  const minDistance = Math.max(2, Math.floor(size / Math.sqrt(pointCount / 2)));

  const seedPoints = scatterSpacedPoints(mapTiles, pointCount, minDistance, rng);

  // Семена → острова. Без фильтра выживания (в отличие от
  // islandBuilder.js:generateScatteredIslands) — каждая точка ОБЯЗАНА
  // стать сушей, она станет точкой захвата, ей нельзя "не повезти".
  // growIterations/growChance выше, чем у generateScatteredIslands —
  // семян тут МАЛО (завязаны на число игроков, не на плотность карты),
  // каждому приходится расти сильнее, чтобы не получилась россыпь
  // одиночных гексов вместо островов (первая попытка с 2/0.35 дала
  // всего 3.5-15% суши на size18 — слишком пусто, см.
  // docs/sessions/2026-09-13-session11.md).
  growLandFromSeeds(seedPoints, { rng, growChance: 0.45, growIterations: 3 });

  // Тот же пост-обработочный пайплайн, что generateMapByProfile.js
  // применяет после посева земли (числа — как у testArchipelago.js).
  clusterizeTerrain(mapTiles, 0.35, rng);
  applyVerticalIslandGrowth(mapTiles, { land: { hill: { threshold: 2, chance: 0.6 } } }, 2);
  applyLandToHillFilter(mapTiles, 1);
  applyVerticalIslandGrowth(mapTiles, { hill: { mount: { threshold: 3, chance: 0.5 } } }, 3);
  applySurfRim(mapTiles, 0.1);
  applyWaterToDeepFilter(mapTiles, 0.76);
  ensureWaterConnectivity(mapTiles);

  return { map, seedPoints, rng };
}

// config: { id, name, fleet: string[], mapDefaults: {size} }
export function createTerritoryScenario({ id, name, fleet, mapDefaults = {} }) {
  const { size: defaultSize = 16 } = mapDefaults;

  // Кэш между generateMap() и getInitialCapturePoints()/getInitialUnits()
  // — game.js вызывает их последовательно в одном initGame() без
  // стороннего кода между ними (тот же паттерн, что spawnCycle в
  // aviationLogic.js/fsmMap в aiManager.js). Замыкание на скоуп фабрики —
  // territory и skirmish не делят кэш друг с другом.
  let cache = { seedPoints: [], size: defaultSize, rng: Math.random, homeCPs: [] };

  return {
    id,
    name,

    generateMap: ({ size = defaultSize, seed = Date.now(), enemyCount = 2 } = {}) => {
      const playerCount = enemyCount + 1;
      const { map, seedPoints, rng } = generateSeededTerritoryMap({ size, seed, playerCount });
      cache = { seedPoints, size, rng, homeCPs: [] };
      return map;
    },

    getInitialCapturePoints: (mapIndex, options = {}) => {
      const enemyCount = options.enemyCount ?? 2;
      const owners = ownersList(enemyCount);

      // options.neutralCount — явный потолок для тестов (общее число точек
      // = домашние + это значение); без него используются ВСЕ семена карты.
      let seedPoints = cache.seedPoints;
      if (options.neutralCount != null) {
        seedPoints = seedPoints.slice(0, options.neutralCount + owners.length);
      }

      const corners = shuffle(hexMapCorners(cache.size), cache.rng).slice(0, Math.min(owners.length, 6));
      const remaining = [...seedPoints];
      const homeSpots = [];

      for (const corner of corners) {
        if (!remaining.length) break;
        remaining.sort((a, b) => hexDistance(a, corner) - hexDistance(b, corner));
        homeSpots.push(remaining.shift());
      }
      // >6 игроков — добор жадным max-min от уже выбранных домов
      // (пользователь: "до 6ти всё просто по углам, а дальше посмотрим").
      while (homeSpots.length < owners.length && remaining.length) {
        remaining.sort((a, b) => {
          const minA = Math.min(...homeSpots.map(h => hexDistance(a, h)));
          const minB = Math.min(...homeSpots.map(h => hexDistance(b, h)));
          return minB - minA;
        });
        homeSpots.push(remaining.shift());
      }

      const homeCPs = owners.map((owner, i) => homeSpots[i] && {
        q: homeSpots[i].q, r: homeSpots[i].r, s: homeSpots[i].s,
        owner, claimant: null, captureProgress: 0, isHome: true,
        capacityLevel: HOME_BASE_CAPACITY,
      }).filter(Boolean);

      const neutralCPs = remaining.map(h => ({
        q: h.q, r: h.r, s: h.s,
        owner: null, claimant: null, captureProgress: 0,
        capacityLevel: CAPTURED_BASE_CAPACITY,
      }));

      cache.homeCPs = homeCPs;
      return [...homeCPs, ...neutralCPs];
    },

    getInitialUnits: (map, { enemyCount = 2 } = {}) => {
      const units = [];
      const owners = ownersList(enemyCount);

      for (const owner of owners) {
        const home = cache.homeCPs.find(cp => cp.owner === owner) || null;
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
