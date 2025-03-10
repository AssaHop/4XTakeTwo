import { renderUnits } from '../ui/render.js';
import { updateEndTurnButton } from '../ui/events.js';
import { state } from '../core/state.js';

function performAttack(attacker, target) {
    if (attacker.actions <= 0) return;

    target.hp -= 1;
    attacker.actions -= 1;

    console.log(`⚔️ ${attacker.type} атакует ${target.type} → ${target.hp}/${target.maxHp}`);

    if (target.hp <= 0) {
        const idx = state.units.indexOf(target);
        if (idx >= 0) state.units.splice(idx, 1);
        console.log(`💀 ${target.type} погиб`);
    }

    // 🟡 Если атакер исчерпал действия — снять выделение
    if (attacker.actions <= 0) {
        attacker.deselect?.(); // ⛑️ На случай если это обычный объект, не класс
        state.selectedUnit = null;
        state.highlightedHexes = [];
    }

    state.hasActedThisTurn = true;
    renderUnits(state.scale, state.offset);
    updateEndTurnButton(true);
}

function canAttack(attacker, target) {
    if (!attacker || !target) return false;
    if (attacker.actions <= 0) return false;
    if (attacker.owner === target.owner) return false;

    const dx = Math.abs(attacker.q - target.q);
    const dy = Math.abs(attacker.r - target.r);
    const dz = Math.abs(attacker.s - target.s);
    return dx <= attacker.attackRange && dy <= attacker.attackRange && dz <= attacker.attackRange;
}

export { performAttack, canAttack };
