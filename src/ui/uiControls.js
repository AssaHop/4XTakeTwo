// 📂 ui/uiControls.js

function updateEndTurnButton(enabled) {
    const button = document.getElementById('end-turn-button');
    if (button) {
        button.disabled = !enabled;
        button.style.opacity = enabled ? '1.0' : '0.5';
    }
}

function setupEndTurnButton(onClick) {
    const button = document.getElementById('end-turn-button');
    if (button) {
        button.addEventListener('click', onClick);
    }
}

export { updateEndTurnButton, setupEndTurnButton };
