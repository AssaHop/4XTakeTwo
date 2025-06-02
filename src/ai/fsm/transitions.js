// src/ai/fsm/transitions.js
export function getTransitions() {
  return [
    {
      from: 'defend', to: 'attack',
      condition: gs => countEnemy(gs) < countPlayer(gs) * 0.5
    },
    {
      from: 'attack', to: 'expand',
      condition: gs => gs.units.some(u => u.canCapture && u.owner === gs.currentPlayer)
    },
    {
      from: 'attack', to: 'economy',
      condition: gs => countEnemy(gs) === 0
    },
    {
      from: 'expand', to: 'defend',
      condition: gs => countEnemy(gs) > countPlayer(gs) * 1.5
    },
    {
      from: 'economy', to: 'attack',
      condition: gs => countEnemy(gs) > 0
    }
  ];
}

function countEnemy(gameState) {
  return gameState.units.filter(u => u.owner !== gameState.currentPlayer).length;
}

function countPlayer(gameState) {
  return gameState.units.filter(u => u.owner === gameState.currentPlayer).length;
}
