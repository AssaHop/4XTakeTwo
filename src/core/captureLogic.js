// core/captureLogic.js
import { hexDistance } from '../mechanics/hexUtils.js';

// Called at the end of each player's individual turn (before nextTurn()).
// A point is captured when one owner is the sole contestant for 2 consecutive
// end-of-turns.  Any absence or contestation by a second owner resets progress.
export function updateCapturePoints(state) {
  for (const cp of state.capturePoints) {
    const nearby = state.units.filter(u => hexDistance(u, cp) <= 3);
    const owners = [...new Set(nearby.map(u => u.owner))];

    if (owners.length === 0 || owners.length >= 2) {
      // Empty or contested — reset in-progress claim
      cp.claimant = null;
      cp.claimTurns = 0;
      continue;
    }

    const contestant = owners[0];

    if (contestant === cp.owner) {
      // Owner is present — cancel any enemy claim
      cp.claimant = null;
      cp.claimTurns = 0;
      continue;
    }

    // Single non-owner contestant is making progress
    if (cp.claimant === contestant) {
      cp.claimTurns++;
    } else {
      cp.claimant = contestant;
      cp.claimTurns = 1;
    }

    if (cp.claimTurns >= 2) {
      console.log(`🚩 ${contestant} captured point (${cp.q},${cp.r},${cp.s})`);
      cp.owner = contestant;
      cp.claimant = null;
      cp.claimTurns = 0;
    }
  }
}
