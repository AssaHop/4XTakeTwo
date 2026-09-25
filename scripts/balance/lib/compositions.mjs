// scripts/balance/lib/compositions.mjs — перебор составов флота по классам.
const CLASSES = ['WDD', 'WCC', 'WBB'];

// Все [wdd,wcc,wbb] с суммой ровно total (эксперимент 1 — равное число юнитов).
export function enumerateByCount(total) {
  const out = [];
  for (let wdd = 0; wdd <= total; wdd++) {
    for (let wcc = 0; wcc <= total - wdd; wcc++) {
      const wbb = total - wdd - wcc;
      out.push({ WDD: wdd, WCC: wcc, WBB: wbb });
    }
  }
  return out;
}

// Все [wdd,wcc,wbb] чья суммарная цена помещается в budget (эксперимент 2).
export function enumerateByBudget(budget, costs) {
  const out = [];
  const maxWdd = Math.floor(budget / costs.WDD);
  for (let wdd = 0; wdd <= maxWdd; wdd++) {
    const remAfterWdd = budget - wdd * costs.WDD;
    const maxWcc = Math.floor(remAfterWdd / costs.WCC);
    for (let wcc = 0; wcc <= maxWcc; wcc++) {
      const remAfterWcc = remAfterWdd - wcc * costs.WCC;
      const wbb = Math.floor(remAfterWcc / costs.WBB);
      const cost = wdd * costs.WDD + wcc * costs.WCC + wbb * costs.WBB;
      out.push({ WDD: wdd, WCC: wcc, WBB: wbb, cost });
    }
  }
  return out;
}

// "Полный расход" — состав, к которому нельзя добавить ни одного юнита
// самого дешёвого класса без превышения бюджета. Для честного сравнения
// "что можно купить на N токенов" не хотим сравнивать состав, который
// оставил токены неизрасходованными, с составом, потратившим всё.
export function maximalSpendOnly(compositions, budget, costs) {
  const minCost = Math.min(costs.WDD, costs.WCC, costs.WBB);
  return compositions.filter(c => budget - c.cost < minCost);
}

export function compToArray(comp) {
  const arr = [];
  for (const c of CLASSES) for (let i = 0; i < comp[c]; i++) arr.push(c);
  return arr;
}

export function compLabel(comp) {
  return `${comp.WDD}w${comp.WCC}c${comp.WBB}b`;
}

export { CLASSES };
