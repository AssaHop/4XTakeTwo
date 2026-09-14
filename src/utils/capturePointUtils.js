// src/utils/capturePointUtils.js
//
// Вынесено из dominator.js сессией 11 (2026-09-13). Сейчас используется
// только dominator.js (нейтральные точки захвата на готовой земле,
// сценарий про уничтожение флота, не про экономику точек).
//
// territory.js/skirmish.js больше НЕ используют этот файл (2026-09-14) —
// у них точки захвата теперь появляются в ОДНОМ проходе вместе с
// генерацией самой земли (см. scenarios/territoryScenarioFactory.js:
// generateSeededTerritoryMap/hexMapCorners), а не отдельным подбором по
// уже готовому mapIndex. pickMaxMinSpreadPoints/fillPointsUntilSaturated,
// которые раньше здесь жили для этого, удалены как мёртвый код (см.
// docs/sessions/2026-09-13-session11.md).
import { hexDistance } from '../mechanics/hexUtils.js';

// Случайные land-гексы, разнесённые минимум на minDistance друг от друга
// И от точек в avoid (например, уже занятых точек). Если земли не
// хватает, чтобы выдержать minDistance для всех count точек — оставшиеся
// добираются без ограничения на разброс (не проваливаем генерацию совсем).
export function pickSpreadLandPoints(mapIndex, count, { minDistance = 5, avoid = [] } = {}) {
  const land = Object.values(mapIndex).filter(c => c.terrainType === 'land');
  if (!land.length) return [];

  // Fisher-Yates shuffle
  for (let i = land.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [land[i], land[j]] = [land[j], land[i]];
  }

  const picks = [];
  for (const h of land) {
    if (picks.length >= count) break;
    const okVsAvoid = avoid.every(p => hexDistance(h, p) >= minDistance);
    const okVsPicks = picks.every(p => hexDistance(h, p) >= minDistance);
    if (okVsAvoid && okVsPicks) picks.push(h);
  }

  // Fallback: добираем оставшиеся без ограничения на разброс
  for (const h of land) {
    if (picks.length >= count) break;
    const taken = picks.some(p => p.q === h.q && p.r === h.r && p.s === h.s) ||
                  avoid.some(p => p.q === h.q && p.r === h.r && p.s === h.s);
    if (!taken) picks.push(h);
  }

  return picks.slice(0, count);
}
