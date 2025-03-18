// 📂 ui/render.js

import { cubeToPixel, HEX_RADIUS } from '../world/map.js';
import { state, mapOffsetX, mapOffsetY } from '../core/game.js';

const squashFactor = 0.7;

let scale = 1;
let hexOffsetX = 0;
let hexOffsetY = 0;

function renderMap(newScale = state.scale ?? scale, offset = state.offset ?? { x: 0, y: 0 }, hexOffset = { x: hexOffsetX, y: hexOffsetY }) {
    scale = newScale;
    state.scale = scale;
    state.offset = offset;

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const offsetX = offset.x;
    const offsetY = offset.y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.scale(1, squashFactor); // 🟡 Визуальное сжатие применяется здесь

    if (!state.map || state.map.length === 0) return;

    state.map.forEach(row => {
        row.forEach(cell => {
            const { x, y } = cubeToPixel(cell.q, cell.r, cell.s, 0, 0, hexOffset.x, hexOffset.y);
            const isHighlighted = state.highlightedHexes.some(hex => cubeEquals(hex, cell));
            drawHex(ctx, x, y, HEX_RADIUS, cell.terrainType, isHighlighted);
        });
    });

    ctx.restore();
}

function getTerrainColor(terrainType) {
    switch (terrainType) {
        case 'surf': return '#3b92eb';
        case 'water': return '#0e62d0';
        case 'deep': return '#0f50a0';
        case 'land': return '#51ad42';
        case 'hill': return '#a2bb60';
        case 'mount': return '#9d5a36';
        case 'peak': return '#fddef4';
        default: return '#cccccc';
    }
}

function drawHex(ctx, x, y, radius, terrainType, isHighlighted = false) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = 2 * Math.PI / 6 * (i + 0.5);
        const x_i = x + radius * Math.cos(angle);
        const y_i = y + radius * Math.sin(angle); // 🟢 Больше НЕТ squashFactor здесь
        if (i === 0) ctx.moveTo(x_i, y_i);
        else ctx.lineTo(x_i, y_i);
    }
    ctx.closePath();
    ctx.fillStyle = isHighlighted ? '#ffff00' : getTerrainColor(terrainType);
    ctx.fill();
    ctx.stroke();
}

function renderUnits(newScale = state.scale ?? scale, offset = state.offset ?? { x: 0, y: 0 }, hexOffset = { x: hexOffsetX, y: hexOffsetY }) {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const offsetX = offset.x;
    const offsetY = offset.y;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(newScale, newScale);
    ctx.scale(1, squashFactor);

    state.units.forEach(unit => {
        const { x, y } = cubeToPixel(unit.q, unit.r, unit.s, 0, 0, hexOffset.x, hexOffset.y);
        drawUnit(ctx, x, y, unit);
    });

    ctx.restore();
}

function drawUnit(ctx, x, y, unit) {
    ctx.save();

    if (unit.type === 'WDD') {
        ctx.beginPath();
        ctx.moveTo(x, y - HEX_RADIUS / 2);
        ctx.lineTo(x - HEX_RADIUS / 2, y + HEX_RADIUS / 2);
        ctx.lineTo(x + HEX_RADIUS / 2, y + HEX_RADIUS / 2);
        ctx.closePath();
    } else if (unit.type === 'WCC') {
        ctx.beginPath();
        ctx.rect(x - HEX_RADIUS / 2, y - HEX_RADIUS / 4, HEX_RADIUS, HEX_RADIUS / 2);
    } else if (unit.type === 'WBB') {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (2 * Math.PI / 5) * i - Math.PI / 2;
            const px = x + (HEX_RADIUS / 2) * Math.cos(angle);
            const py = y + (HEX_RADIUS / 2) * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    } else {
        ctx.beginPath();
        ctx.arc(x, y, HEX_RADIUS / 2, 0, 2 * Math.PI);
    }

    ctx.fillStyle = unit.color || '#000';
    ctx.fill();
    ctx.stroke();

    if (unit.selected) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ff0';
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000';
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${unit.hp}/${unit.maxHp}`, x, y + HEX_RADIUS / 2 + 12);
    ctx.restore();
}

function highlightHexes(hexes) {
    state.highlightedHexes = hexes;
    renderMap(state.scale, state.offset);
}

function cubeEquals(a, b) {
    return a.q === b.q && a.r === b.r && a.s === b.s;
}

export { renderMap, renderUnits, highlightHexes, cubeEquals };
