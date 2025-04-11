import { hexDistance } from './hexUtils.js';

function findPath(start, goal, map, unit) {
    const frontier = new PriorityQueue();
    frontier.enqueue(start, 0);
  
    const cameFrom = new Map();
    const costSoFar = new Map();
  
    const key = (h) => `${h.q},${h.r},${h.s}`;
    cameFrom.set(key(start), null);
    costSoFar.set(key(start), 0);
  
    while (!frontier.isEmpty()) {
      const current = frontier.dequeue();
  
      if (key(current) === key(goal)) break;
  
      for (const next of getNeighbors(current, map, unit)) {
        const newCost = costSoFar.get(key(current)) + 1;
        if (!costSoFar.has(key(next)) || newCost < costSoFar.get(key(next))) {
          costSoFar.set(key(next), newCost);
          const priority = newCost + hexDistance(next, goal);
          frontier.enqueue(next, priority);
          cameFrom.set(key(next), current);
        }
      }
    }
  
    // 🔁 Реконструкция пути
    const path = [];
    let current = goal;
    while (current && key(current) !== key(start)) {
      path.push(current);
      current = cameFrom.get(key(current));
    }
  
    if (path.length === 0) {
      console.log(`🚫 No path found for ${unit.type} to (${goal.q},${goal.r},${goal.s})`);
    }
  
    return path.reverse();
  }
  

function getNeighbors(hex, map, unit) {
  const directions = [
    { dq: 1, dr: -1, ds: 0 }, { dq: 1, dr: 0, ds: -1 }, { dq: 0, dr: 1, ds: -1 },
    { dq: -1, dr: 1, ds: 0 }, { dq: -1, dr: 0, ds: 1 }, { dq: 0, dr: -1, ds: 1 },
  ];
  const results = [];

  for (const d of directions) {
    const neighbor = { q: hex.q + d.dq, r: hex.r + d.dr, s: hex.s + d.ds };
    const tile = map.flat().find(c => c.q === neighbor.q && c.r === neighbor.r && c.s === neighbor.s);
    if (!tile) continue;

    const allowed = unit.ignoresObstacles || unit.moveTerrain.includes(tile.terrainType);
    if (allowed) results.push(neighbor);
  }

  return results;
}

class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  enqueue(item, priority) {
    this.elements.push({ item, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.elements.shift().item;
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}

export { findPath };
