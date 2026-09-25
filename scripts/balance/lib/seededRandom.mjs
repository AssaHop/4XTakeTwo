// scripts/balance/lib/seededRandom.mjs
//
// Node's Math.random() не сидируется — значит map-генерация (частично,
// см. ниже) и расстановка юнитов внутри кучи (getRandomFreeHex) на самом
// деле НЕ детерминированы по seed, даже когда карта строится через
// createSeededRNG(seed) (islandBuilder.js передаёт свой rng-параметр в
// growLandFromSeeds/clusterizeTerrain, но applyVerticalIslandGrowth/
// applyLandToHillFilter/applySurfRim/applyWaterToDeepFilter внутри себя
// зовут ГОЛЫЙ Math.random(), в обход параметра). Единственный надёжный
// способ сделать ВЕСЬ пайплайн (включая эти внутренние вызовы) честно
// детерминированным без правки исходников генератора карты — временно
// подменить глобальный Math.random на сидируемый PRNG на время вызова,
// затем вернуть оригинал.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Выполняет fn() с Math.random, подменённым на mulberry32(seed); гарантированно
// восстанавливает оригинал (даже если fn бросит) — иначе одна упавшая партия
// испортила бы случайность для всех последующих.
export function withSeededRandom(seed, fn) {
  const original = Math.random;
  Math.random = mulberry32(seed >>> 0);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

// Целочисленный сид для "потока Б" (спаун-плейсмент внутри кучи, за
// пределами map+anchor фазы) — детерминированная, но другая от mapSeed
// последовательность на каждую партию пары (game=0|1), чтобы позиционный
// микро-рандом внутри кластера не был побитово одинаковым в обеих
// зеркальных партиях (протокол: "случайность ИИ/спауна зеркалить не
// нужно, усреднится по сидам").
export function deriveSpawnSeed(seed, gameIndex) {
  return ((seed * 2654435761) ^ (gameIndex + 1) * 0x9E3779B1) >>> 0;
}
