// 📂 src/ui/uiControls.js — финализированная логика кнопки End Turn

function setupEndTurnButton(callback) {
    const btn = document.getElementById('end-turn-button');
    btn.addEventListener('click', callback);
  }
  
  function updateEndTurnButton() {
    const btn = document.getElementById('end-turn-button');
    btn.disabled = false; // всегда доступна для пропуска хода
  
    const hasActions = window.state?.units?.some(u => u.owner === 'player1' && u.actions > 0);
  
    if (hasActions) {
      btn.classList.add('btn-pending');
      btn.classList.remove('btn-done');
    } else {
      btn.classList.remove('btn-pending');
      btn.classList.add('btn-done');
    }
  }
  
  export { setupEndTurnButton, updateEndTurnButton };
  