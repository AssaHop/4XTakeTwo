// 📂 core/turnQueue.js — Очередь ходов

const turnQueue = [];

function initializeTurnQueue(units) {
  turnQueue.length = 0;
  const playerUnits = units.filter(u => u.owner === 'player1');
  const enemyUnits = units.filter(u => u.owner !== 'player1');
  turnQueue.push(...playerUnits, ...enemyUnits); // можно рандомизировать/по инициативе
}

function getNextUnit() {
  return turnQueue.shift();
}

function addToQueue(unit) {
  turnQueue.push(unit);
}

function isQueueEmpty() {
  return turnQueue.length === 0;
}

function getQueue() {
  return [...turnQueue];
}

export {
  initializeTurnQueue,
  getNextUnit,
  addToQueue,
  isQueueEmpty,
  getQueue
};
