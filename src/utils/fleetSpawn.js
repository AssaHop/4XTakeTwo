// src/utils/fleetSpawn.js
//
// Вынесено из dominator.js сессией 11 (2026-09-13), когда появился второй
// сценарий (territory.js) с той же потребностью — кучный спаун флота
// (см. docs/sessions/2026-09-13-session11.md, "Кучный спаун флота").
//
// Флот спаунится кучно, а не по случайным клеткам всей карты — иначе к
// моменту первого контакта юниты одной стороны успевали разбрестись и
// встречали противника поодиночке. Анкор — общая клетка для всех типов во
// флоте (пересечение их spawnTerrain); сами юниты — в пределах
// CLUSTER_RADIUS гексов от анкора, радиус растёт только если на текущем
// не хватило мест, финальный фоллбэк — случайная клетка по всей карте,
// чтобы спаун не мог провалиться совсем.
import { getTemplateSpawnCells, getRandomFreeHex } from './spawnUtils.js';
import { hexDistance } from '../mechanics/hexUtils.js';
import { ClassTemplates } from '../core/classTemplates.js';

const CLUSTER_RADIUS = 1;
const CLUSTER_MAX_RADIUS = 6;
// Минимальный интервал между СВОИМИ юнитами внутри одной кучи (запрошено
// пользователем 2026-09-13: "не в плотную", хотя бы 1 пустой гекс между
// кораблями) — 2, не 1, потому что hexDistance=1 значит "соседние",
// distance=2 значит "через гекс". Важно и тактически: вплотную стоящие
// юниты все попадают под один Splash одним ударом (см. WBB, combatLogic.js)
// — сессия 11 battle-sim это уже наглядно показала.
const MIN_UNIT_SPACING = 2;

export function intersectSpawnTerrain(types) {
  return types.reduce((acc, type) => {
    const terrain = ClassTemplates[type]?.spawnTerrain || ['surf', 'water', 'deep'];
    return acc === null ? terrain : acc.filter(t => terrain.includes(t));
  }, null) || [];
}

// existingAnchors/minSeparation — анкоры разных сторон не должны сходиться
// в одном углу карты. Если карта/террейн не позволяют выдержать
// minSeparation — не проваливаем спаун, берём клетку максимально далёкую
// от уже занятых анкоров вместо строгого порога.
export function pickClusterAnchor(fleetTypes, map, existingAnchors = [], minSeparation = 0) {
  const commonTerrain = intersectSpawnTerrain([...new Set(fleetTypes)]);
  if (!commonTerrain.length) return null;
  const pool = map.flat().filter(cell => commonTerrain.includes(cell.terrainType));
  if (!pool.length) return null;

  if (!existingAnchors.length) return pool[Math.floor(Math.random() * pool.length)];

  const minDistTo = (cell) => Math.min(...existingAnchors.map(a => hexDistance(cell, a)));

  const farEnough = pool.filter(cell => minDistTo(cell) >= minSeparation);
  if (farEnough.length) return farEnough[Math.floor(Math.random() * farEnough.length)];

  return pool.reduce((best, cell) =>
    (!best || minDistTo(cell) > minDistTo(best)) ? cell : best, null);
}

// anchor может быть null (спаун полностью случайный по всей карте) — тот
// же фоллбэк-путь просто срабатывает для каждого юнита сразу.
export function spawnClusteredFleet(fleetTypes, map, units, owner, anchor) {
  for (const type of fleetTypes) {
    const allCells = getTemplateSpawnCells(type, map);
    const ownUnitsSoFar = units.filter(u => u.owner === owner);
    let hex = null;

    if (anchor) {
      // Первый проход — держим MIN_UNIT_SPACING от уже поставленных своих
      // юнитов (радиус растёт, пока не найдётся клетка, выдерживающая
      // интервал). Второй проход (без spacing-фильтра) — фоллбэк, если
      // радиус исчерпан: плотный спаун лучше, чем провал спауна.
      for (let radius = CLUSTER_RADIUS; radius <= CLUSTER_MAX_RADIUS && !hex; radius++) {
        const nearby = allCells.filter(cell => hexDistance(cell, anchor) <= radius);
        const spaced = nearby.filter(cell =>
          ownUnitsSoFar.every(u => hexDistance(cell, u) >= MIN_UNIT_SPACING)
        );
        hex = getRandomFreeHex(spaced, units);
      }
      if (!hex) {
        for (let radius = CLUSTER_RADIUS; radius <= CLUSTER_MAX_RADIUS && !hex; radius++) {
          const nearby = allCells.filter(cell => hexDistance(cell, anchor) <= radius);
          hex = getRandomFreeHex(nearby, units);
        }
      }
    }
    if (!hex) hex = getRandomFreeHex(allCells, units); // фоллбэк: старое поведение

    if (hex) units.push({ q: hex.q, r: hex.r, s: hex.s, type, owner });
  }
}
