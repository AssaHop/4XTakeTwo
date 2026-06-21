import { cubeToPixel, HEX_RADIUS } from '../world/map.js';
import { state } from '../core/state.js';
import { getOwnerColor } from '../mechanics/units.js';

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

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offset.x, offset.y);
  ctx.scale(scale, scale);
  ctx.scale(1, squashFactor);

  // Render map terrain
  if (!state.map || state.map.length === 0) return;
  state.map.forEach(row => {
    row.forEach(cell => {
      const { x, y } = cubeToPixel(cell.q, cell.r, cell.s, 0, 0, hexOffset.x, hexOffset.y);
      drawHex(ctx, x, y, HEX_RADIUS, cell.terrainType);
    });
  });

  // Render movement highlights
  (state.highlightedHexes || []).forEach(cell => {
    const { x, y } = cubeToPixel(cell.q, cell.r, cell.s, 0, 0, hexOffset.x, hexOffset.y);
    drawHighlightCircle(ctx, x, y);
  });

  // Render attack outlines
  (state.attackHexes || []).forEach(cell => {
    const { x, y } = cubeToPixel(cell.q, cell.r, cell.s, 0, 0, hexOffset.x, hexOffset.y);
    drawHexAttackOutline(ctx, x, y);
  });

  // Render capture points
  (state.capturePoints || []).forEach(cp => {
    const { x, y } = cubeToPixel(cp.q, cp.r, cp.s, 0, 0, hexOffset.x, hexOffset.y);
    drawCapturePoint(ctx, x, y, cp);
  });

  ctx.restore();

  renderUnits(scale, offset, hexOffset);
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

function drawHex(ctx, x, y, radius, terrainType) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = 2 * Math.PI / 6 * (i + 0.5);
    const x_i = x + radius * Math.cos(angle);
    const y_i = y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x_i, y_i);
    else ctx.lineTo(x_i, y_i);
  }
  ctx.closePath();
  ctx.fillStyle = getTerrainColor(terrainType);
  ctx.fill();
  ctx.stroke();
}

function drawHighlightCircle(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, HEX_RADIUS / 4, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
  ctx.fill();
}

function drawHexAttackOutline(ctx, x, y) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = 2 * Math.PI / 6 * (i + 0.5);
    const x_i = x + HEX_RADIUS * Math.cos(angle);
    const y_i = y + HEX_RADIUS * Math.sin(angle);
    if (i === 0) ctx.moveTo(x_i, y_i);
    else ctx.lineTo(x_i, y_i);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function renderUnits(newScale = state.scale ?? scale, offset = state.offset ?? { x: 0, y: 0 }, hexOffset = { x: hexOffsetX, y: hexOffsetY }) {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(offset.x, offset.y);
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

  ctx.fillStyle = unit.color;
  ctx.fill();

  // Обводка: жёлтая если выделен, иначе цвет владельца
  ctx.lineWidth = unit.selected ? 3 : 1.5;
  ctx.strokeStyle = unit.selected ? '#ffff00' : unit.color;
  ctx.stroke();

  // HP
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${unit.hp}/${unit.maxHp}`, x, y + HEX_RADIUS / 2 + 12);

  // Тип юнита (сокращённо)
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(unit.type, x, y + 3);

  ctx.restore();
}

// Diamond flag: colored by owner, progress arc if being claimed
function drawCapturePoint(ctx, x, y, cp) {
  const r = HEX_RADIUS * 0.38;
  const ownerCol  = cp.owner   ? getOwnerColor(cp.owner)   : '#888888';
  const claimCol  = cp.claimant ? getOwnerColor(cp.claimant) : null;

  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(x,     y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x,     y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle   = ownerCol + 'aa';
  ctx.strokeStyle = ownerCol;
  ctx.lineWidth   = 2;
  ctx.fill();
  ctx.stroke();

  // Claim progress arc (0 → full circle when claimTurns reaches 2)
  if (claimCol && cp.claimTurns > 0) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, -Math.PI / 2, -Math.PI / 2 + (cp.claimTurns / 2) * 2 * Math.PI);
    ctx.strokeStyle = claimCol;
    ctx.lineWidth   = 3;
    ctx.stroke();
  }
}

function highlightHexes(hexes) {
  state.highlightedHexes = hexes;
  renderMap(state.scale, state.offset);
}

function highlightAttackHexes(hexes) {
  state.attackHexes = hexes;
  renderMap(state.scale, state.offset);
}

function cubeEquals(a, b) {
  return a.q === b.q && a.r === b.r && a.s === b.s;
}

export {
  renderMap,
  renderUnits,
  highlightHexes,
  highlightAttackHexes,
  cubeEquals
};
