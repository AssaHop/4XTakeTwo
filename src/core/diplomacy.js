// src/core/diplomacy.js
//
// Allegiance-матрица между владельцами (player1/enemy0/enemy1/...), по
// образцу Diplomacy.java из форка Tribes (см. docs/ai-design-notes-tribes.md).
// Одно число на пару владельцев, симметричное, в диапазоне
// [-ALLEGIANCE_MAX, +ALLEGIANCE_MAX]. Чем ниже — тем выше приоритет цели
// в scoreTarget() (attackState.js).

export const ALLEGIANCE_MAX = 60;

// Насколько портятся отношения атакующий↔цель за один удар (см. performAttack).
export const ATTACK_REPERCUSSION = -5;

// Стартовый перекос против игрока: враги считают player1 приоритетной целью
// с первого хода, а не только когда между ними уже был бой.
const DEFAULT_PLAYER_BIAS = -30;

// owners: ['player1', 'enemy0', 'enemy1', ...] — обычно state.turnOrder.
// playerBias: стартовое allegiance для любой пары (player1, enemyX).
// Пары enemyX↔enemyY стартуют нейтрально (0) — сценарий может переопределить
// через собственный getInitialAllegiance(), если нужен другой баланс
// (например симметричный free-for-all без перекоса).
export function initAllegiance(owners, { playerBias = DEFAULT_PLAYER_BIAS } = {}) {
  const matrix = {};
  for (const owner of owners) matrix[owner] = {};

  for (let i = 0; i < owners.length; i++) {
    for (let j = i + 1; j < owners.length; j++) {
      const a = owners[i];
      const b = owners[j];
      const value = (a === 'player1' || b === 'player1') ? playerBias : 0;
      matrix[a][b] = value;
      matrix[b][a] = value;
    }
  }

  return matrix;
}

export function getAllegiance(state, ownerA, ownerB) {
  if (ownerA === ownerB) return ALLEGIANCE_MAX;
  return state.allegiance?.[ownerA]?.[ownerB] ?? 0;
}

// Симметрично двигает отношения ownerA↔ownerB на delta, зажимая в
// [-ALLEGIANCE_MAX, ALLEGIANCE_MAX]. delta < 0 — ухудшение (после атаки),
// delta > 0 — потенциальный будущий дипломатический жест игрока.
export function adjustAllegiance(state, ownerA, ownerB, delta) {
  if (ownerA === ownerB || !state.allegiance) return;

  const current = state.allegiance[ownerA]?.[ownerB] ?? 0;
  const next = Math.max(-ALLEGIANCE_MAX, Math.min(ALLEGIANCE_MAX, current + delta));

  state.allegiance[ownerA] = state.allegiance[ownerA] || {};
  state.allegiance[ownerB] = state.allegiance[ownerB] || {};
  state.allegiance[ownerA][ownerB] = next;
  state.allegiance[ownerB][ownerA] = next;
}

// "Ганг-ап на лидера" (запрошено пользователем 2026-09-13, см.
// docs/sessions/2026-09-13-session11.md — попытка сбить экономический
// снежный ком точек захвата): чем сильнее owner опережает СРЕДНЕЕ число
// точек захвата среди всех владельцев, тем выше приоритет атаковать
// именно ЕГО юниты у ВСЕХ остальных — не диплом.пара конкретных двух
// сторон (это getAllegiance выше), а общий сигнал "кто сейчас впереди".
//
// Первая версия была линейной без потолка (excess × WEIGHT) — пользователь
// справедливо указал: без ограничения при большом отрыве бонус мог
// разрастись настолько, что забивал вообще все остальные соображения
// (опасность/дистанция/allegiance), и выглядело бы неестественно, будто
// остальные стороны вообще перестают воевать друг с другом. Заменено на
// насыщающуюся экспоненту: bonus = CAP×(1 − e^(−excess/SCALE)) — растёт
// быстро на старте отрыва, но НИКОГДА не превышает CAP (30 — сопоставимо
// с dangerRatio×30, заметно меньше ALLEGIANCE_MAX=60, то есть не может в
// одиночку перевесить прямую военную необходимость). LEADER_PRESSURE_CAP=0
// отключает эффект полностью. Если владельцев с точками меньше двух —
// сравнивать не с чем, эффект не применяется (иначе на старте партии,
// когда у всех по одной домашней точке, любой счёт "выше среднего" был бы
// шумом округления, не сигналом лидерства).
export const LEADER_PRESSURE_CAP = 30;
export const LEADER_PRESSURE_SCALE = 5;

export function getLeaderPressure(state, owner) {
  if (!LEADER_PRESSURE_CAP) return 0;
  const cps = state.capturePoints || [];
  const owners = [...new Set(cps.map(cp => cp.owner).filter(Boolean))];
  if (owners.length < 2) return 0;

  const counts = Object.fromEntries(owners.map(o => [o, cps.filter(cp => cp.owner === o).length]));
  const avg = Object.values(counts).reduce((a, b) => a + b, 0) / owners.length;
  const excess = Math.max(0, (counts[owner] || 0) - avg);

  return LEADER_PRESSURE_CAP * (1 - Math.exp(-excess / LEADER_PRESSURE_SCALE));
}
