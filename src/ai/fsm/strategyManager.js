export const FSMStates = {
  ATTACK: 'ATTACK',
  DEFEND: 'DEFEND',
  EXPAND: 'EXPAND',
  ECONOMY: 'ECONOMY'
};

export function getCurrentFSMState(gameState) {
  return FSMStates.ATTACK; // 🔧 пока фиксированное поведение для тестов
}
