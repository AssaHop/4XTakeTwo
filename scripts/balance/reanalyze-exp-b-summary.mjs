// scripts/balance/reanalyze-exp-b-summary.mjs
//
// Пересчёт summary эксперимента B (шаг 2, протокол v2) БЕЗ новых партий —
// по замечаниям пользователя после отчёта Этапа 2:
// 1. Погрешность наклона от биномиального шума (100 партий/точку → ±5 п.п.
//    на точку → ~±1 п.п. на наклон), рядом с прежней остаточной (по 4
//    точкам, df=3, ненадёжна).
// 2. Нелинейность: ослабление стата бьёт сильнее, чем усиление помогает —
//    вероятная причина, ступеньки hits-to-kill из-за округления урона.
// 3. Наклоны сравнимы ВНУТРИ класса, не МЕЖДУ классами (в базовом флоте
//    2×WDD, 2×WCC, 1×WBB — эффект набран разным числом юнитов).
import { readFileSync, writeFileSync } from 'node:fs';
import { regressionThroughOrigin, binomialSlopeSE } from './lib/regression.mjs';

const SRC = 'scripts/balance/results/2026-09-25-exp-b.csv';
const raw = readFileSync(SRC, 'utf8').trim().split('\n');
const header = raw[0].split(',');
const rows = raw.slice(1).map(line => {
  const cells = line.split(',');
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

const CLASSES = ['WDD', 'WCC', 'WBB'];
const STATS = ['hp', 'atk', 'def'];
const K_VALUES = [0.7, 0.85, 1.15, 1.3];

const byConfig = new Map(); // "cls|stat|k" -> {wins, decisive}
for (const cls of CLASSES) for (const stat of STATS) for (const k of K_VALUES) {
  byConfig.set(`${cls}|${stat}|${k}`, { wins: 0, decisive: 0 });
}
for (const r of rows) {
  const key = `${r.cls}|${r.stat}|${r.k}`;
  const acc = byConfig.get(key);
  if (!acc) continue;
  if (r.unresolved === 'true' || !r.winner_label || r.winner_label === 'draw') continue;
  acc.decisive++;
  if (r.winner_label === 'A') acc.wins++;
}

const slopeResults = {};
for (const cls of CLASSES) {
  slopeResults[cls] = {};
  for (const stat of STATS) {
    const xs = [], ys = [], rates = [], ns = [];
    for (const k of K_VALUES) {
      const acc = byConfig.get(`${cls}|${stat}|${k}`);
      const rate = acc.decisive ? acc.wins / acc.decisive : 0.5;
      xs.push((k - 1) * 100);
      ys.push(rate * 100 - 50);
      rates.push(rate);
      ns.push(acc.decisive);
    }
    const { slope, se: seResidual, df } = regressionThroughOrigin(xs, ys);
    const seBinomial = binomialSlopeSE(xs, rates, ns);
    const slope10 = slope * 10;
    const seResidual10 = seResidual * 10;
    const seBinomial10 = seBinomial * 10;
    const tBinomial = seBinomial10 ? slope10 / seBinomial10 : 0;
    // t-критическое ~1.96 для больших df (биномиальная SE не имеет df=3
    // ограничения остаточного метода — она из прямого распространения
    // ошибки, не из подгонки по 4 точкам), 95% двусторонний.
    const significantBinomial = Math.abs(tBinomial) > 1.96;
    slopeResults[cls][stat] = { slope10, seResidual10, seBinomial10, tBinomial, significantBinomial, df };
  }
}

const lines = [];
lines.push('# Эксперимент B (протокол v2) — асимметричная чувствительность статов WDD/WCC/WBB');
lines.push('');
lines.push('Дата: 2026-09-25 (пересчёт без новых партий — правки пользователя после отчёта Этапа 2). Постановка: базовый флот [WDD×2,WCC×2,WBB×1] на обе стороны, меняется ТОЛЬКО сторона A (один класс, один стат, k∈{0.7,0.85,1.15,1.3}). 36 конфигураций × 100 партий = 3600 партий. Карта: размер 12.');
lines.push('');
lines.push('**Решение пользователя: статы оставить как есть.** Роли классов подтвердились цифрами (WDD — glass cannon, рычаг ATK; WBB — танк, рычаг DEF — по формуле боя DEF работает дважды, снижает входящий урон И определяет силу контратаки, а WBB атакует чаще всех остальных; WCC — универсал, все три стата значимы). Таблица ниже — карта рычагов на будущее (если в шаге 4 цена класса выйдет несуразной, видно, что крутить), не повод для правки сейчас.');
lines.push('');
lines.push('| Класс | Стат | Δвинрейт на +10% | SE (биномиальный шум) | SE (по 4 точкам, df=3) |');
lines.push('|---|---|---|---|---|');
for (const cls of CLASSES) for (const stat of STATS) {
  const r = slopeResults[cls][stat];
  const mark = r.significantBinomial ? '**' : '';
  lines.push(`| ${cls} | ${stat.toUpperCase()} | ${mark}${r.slope10.toFixed(2)}${mark} | ±${r.seBinomial10.toFixed(2)} п.п. | ±${r.seResidual10.toFixed(2)} п.п. |`);
}
lines.push('');
lines.push('Жирным — значимо на 95% по биномиальной SE (|t|>1.96). Биномиальная SE — из дисперсии доли побед на каждой точке (100 партий/точку, p(1-p)/n), корректно распространённой через фиксированные веса регрессии; надёжнее, чем SE по остаткам 4 точек (df=3, использовалась в первом отчёте Этапа 2) — не путает истинную нелинейность (см. ниже) со случайным шумом. Наклон (точечная оценка) не изменился, изменилась только погрешность.');
lines.push('');
lines.push('## Три оговорки к таблице (без новых партий, по замечанию пользователя)');
lines.push('');
lines.push('1. **Погрешность выше была занижена методологически** (df=3 по 4 точкам) — биномиальная SE (~1 п.п. на большинстве ячеек) надёжнее. Картина значимости не изменилась: все ячейки кроме WDD DEF остаются значимыми.');
lines.push('2. **Эффекты нелинейны — ослабление бьёт сильнее, чем усиление помогает** (см. сырые винрейты ниже: например WCC ATK −30%→19%, +30%→64%; WBB DEF −30%→25%, +30%→70%). Вероятная причина — округление урона до целого: стат влияет не плавно, а ступеньками, когда пересекает порог "на один удар меньше/больше до смерти" (hits-to-kill). При будущей правке статов ориентироваться на пороги hits-to-kill, а не на плавные проценты.');
lines.push('3. **Наклоны сравнимы ВНУТРИ класса, не МЕЖДУ классами.** В базовом флоте 2×WDD, 2×WCC, 1×WBB — эффект WDD/WCC набран двумя юнитами, WBB — одним. Эта таблица отвечает "какой стат — рычаг для этого класса", не "какой класс сильнее" — на второй вопрос отвечает шаг 4 (точка безубыточности).');
lines.push('');
lines.push('## Сырые винрейты по конфигурациям');
lines.push('');
lines.push('| Класс | Стат | k=0.7 | k=0.85 | k=1.15 | k=1.3 |');
lines.push('|---|---|---|---|---|---|');
for (const cls of CLASSES) for (const stat of STATS) {
  const cells = K_VALUES.map(k => {
    const acc = byConfig.get(`${cls}|${stat}|${k}`);
    const rate = acc.decisive ? 100 * acc.wins / acc.decisive : NaN;
    return `${rate.toFixed(1)}% (n=${acc.decisive})`;
  });
  lines.push(`| ${cls} | ${stat} | ${cells.join(' | ')} |`);
}

const outPath = 'scripts/balance/results/2026-09-25-exp-b-summary.md';
writeFileSync(outPath, lines.join('\n') + '\n');
console.error(lines.join('\n'));
console.error(`\nWritten: ${outPath}`);
