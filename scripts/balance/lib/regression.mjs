// scripts/balance/lib/regression.mjs
//
// Ручная реализация МНК (для эксп. B) и логистической регрессии (для
// эксп. 1/2) — без ML-библиотек, протокол требует "реализовать вручную —
// библиотека не нужна для трёх предикторов".

// z-score по каждому столбцу отдельно. Возвращает { standardized, means, stds }.
export function standardize(rows) {
  const n = rows.length;
  const k = rows[0].length;
  const means = new Array(k).fill(0);
  const stds = new Array(k).fill(0);

  for (const row of rows) for (let j = 0; j < k; j++) means[j] += row[j] / n;
  for (const row of rows) for (let j = 0; j < k; j++) stds[j] += (row[j] - means[j]) ** 2 / n;
  for (let j = 0; j < k; j++) stds[j] = Math.sqrt(stds[j]) || 1; // избегаем деления на 0, если предиктор константа

  const standardized = rows.map(row => row.map((v, j) => (v - means[j]) / stds[j]));
  return { standardized, means, stds };
}

function matMulTranspose(X) {
  // X^T X, X — n×k
  const n = X.length, k = X[0].length;
  const out = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let sum = 0;
      for (let r = 0; r < n; r++) sum += X[r][i] * X[r][j];
      out[i][j] = sum;
    }
  }
  return out;
}

function matVecTranspose(X, y) {
  const n = X.length, k = X[0].length;
  const out = new Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    let sum = 0;
    for (let r = 0; r < n; r++) sum += X[r][i] * y[r];
    out[i] = sum;
  }
  return out;
}

// Решает A·x = b методом Гаусса-Жордана с частичным выбором ведущего
// элемента (A — k×k, b — k). Общий, не завязан на конкретный размер.
function solveLinearSystem(A, b) {
  const k = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < k; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < k; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) pivotRow = r;
    }
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) continue; // вырожденный столбец (константный предиктор) — пропускаем

    for (let c = col; c <= k; c++) M[col][c] /= pivot;

    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= k; c++) M[r][c] -= factor * M[col][c];
    }
  }

  return M.map(row => row[k]);
}

// X — n×k (без intercept-столбца), y — n. Добавляет intercept сам.
// Возвращает { intercept, coefficients: [...k] }.
export function olsFit(X, y) {
  const n = X.length;
  const Xi = X.map(row => [1, ...row]); // intercept
  const XtX = matMulTranspose(Xi);
  const Xty = matVecTranspose(Xi, y);
  const beta = solveLinearSystem(XtX, Xty);
  return { intercept: beta[0], coefficients: beta.slice(1) };
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

// Батч градиентный спуск (не IRLS — достаточно для 3-4 предикторов и
// нескольких сотен строк, не требует библиотек). X — n×k, y — n (0/1).
export function logisticFit(X, y, { iterations = 5000, lr = 0.1 } = {}) {
  const n = X.length;
  const k = X[0].length;
  let intercept = 0;
  let weights = new Array(k).fill(0);

  for (let it = 0; it < iterations; it++) {
    const gradW = new Array(k).fill(0);
    let gradB = 0;
    for (let r = 0; r < n; r++) {
      const z = intercept + X[r].reduce((s, v, j) => s + v * weights[j], 0);
      const err = sigmoid(z) - y[r];
      gradB += err;
      for (let j = 0; j < k; j++) gradW[j] += err * X[r][j];
    }
    intercept -= (lr * gradB) / n;
    for (let j = 0; j < k; j++) weights[j] -= (lr * gradW[j]) / n;
  }

  return { intercept, coefficients: weights };
}
