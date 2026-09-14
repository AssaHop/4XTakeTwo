// src/utils/capturePointUtils.js
//
// Вынесено из dominator.js сессией 11 (2026-09-13) при добавлении второго
// сценария (territory.js) с точками захвата — оба сценария выбирают
// разбросанные по земле точки, отличается только КАКИЕ точки им нужны
// (dominator — просто N нейтральных; territory — по одной "домашней" на
// команду + нейтральные вокруг). См.
// docs/sessions/2026-09-13-session11.md.
import { hexDistance } from '../mechanics/hexUtils.js';

// Случайные land-гексы, разнесённые минимум на minDistance друг от друга
// И от точек в avoid (например, уже занятых "домашних" точек). Если земли
// не хватает, чтобы выдержать minDistance для всех count точек — оставшиеся
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

// Столицы/домашние точки — по мотивам реального алгоритма Polytopia
// (реконструкция, github.com/QuasiStellar/Polytopia-Map-Generator,
// app.py:85-108): каждая следующая ставится НЕ случайно среди тех, кто
// проходит порог, а туда, где МИНИМАЛЬНОЕ расстояние до уже поставленных
// точек МАКСИМАЛЬНО — жадный max-min. Даёт гарантированно равномерный
// разброс независимо от формы карты (в отличие от pickSpreadLandPoints
// выше, который может не найти хорошего варианта, если порядок
// перетасовки неудачный, и просто взять что попало в фоллбэке).
// candidates — необязательный список точек-кандидатов (если не задан,
// берутся все land-гексы карты). Добавлено сессией 11 при уточнении
// пользователем реального алгоритма Polytopia: "в некоторых алгоритмах,
// когда уже сделана карта с равноудалёнными точками, ПЕРЕНАЗНАЧАЮТСЯ
// столицы — так можно добиться равномерности не мешая росту террейна".
// То есть столицы можно выбирать max-min НЕ по всей карте с нуля, а как
// подмножество уже расставленной равномерной сетки точек
// (fillPointsUntilSaturated ниже) — см. territory.js.
export function pickMaxMinSpreadPoints(mapIndex, count, { avoid = [], candidates = null } = {}) {
  const land = candidates ?? Object.values(mapIndex).filter(c => c.terrainType === 'land');
  if (!land.length) return [];

  const picks = [];
  const remaining = [...land];

  for (let i = 0; i < count && remaining.length; i++) {
    const reference = [...avoid, ...picks];

    let bestDist = -1;
    let bestCandidates = [];
    for (const cell of remaining) {
      const minDist = reference.length
        ? Math.min(...reference.map(p => hexDistance(cell, p)))
        : 0; // первая точка — расстояние ещё не от чего считать, любая годится
      if (minDist > bestDist) {
        bestDist = minDist;
        bestCandidates = [cell];
      } else if (minDist === bestDist) {
        bestCandidates.push(cell);
      }
    }

    const chosen = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
    picks.push(chosen);
    remaining.splice(remaining.indexOf(chosen), 1);
  }

  return picks;
}

// Нейтральные/деревенские точки — по мотивам того же алгоритма
// (app.py:148-183): вместо ЗАРАНЕЕ ВЫБРАННОГО количества точек — жадно
// заполняем карту, пока остаётся хоть один land-гекс на расстоянии
// >= minDistance от ВСЕХ уже существующих точек (домашних + уже
// поставленных нейтральных). Плотность точек становится эмерджентным
// свойством размера карты, а не произвольной константой (NEUTRAL_PER_
// OWNER и т.п.) — больше карта, больше точек, само собой, как и должно
// быть по разбору пользователя ("точек нужно больше, карта тоже влияет").
export function fillPointsUntilSaturated(mapIndex, { minDistance = 3, avoid = [] } = {}) {
  const land = Object.values(mapIndex).filter(c => c.terrainType === 'land');
  const picks = [];
  const placed = () => [...avoid, ...picks];

  let eligible = land.filter(cell => placed().every(p => hexDistance(cell, p) >= minDistance));
  while (eligible.length) {
    const chosen = eligible[Math.floor(Math.random() * eligible.length)];
    picks.push(chosen);
    eligible = eligible.filter(cell => hexDistance(cell, chosen) >= minDistance);
  }

  return picks;
}
