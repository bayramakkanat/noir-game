import { CELL_STATUS, KILLER_WIN_DEATH_COUNT } from './constants.js';
import { positionOf } from './board.js';

export function checkKillerWinByDeaths(killCount) {
  return killCount >= KILLER_WIN_DEATH_COUNT;
}

export function checkKillerWinByKillingInspector(board, inspectorSecretId, killedSuspectIds = []) {
  if (inspectorSecretId == null) return false;
  if (killedSuspectIds.includes(inspectorSecretId)) return true;
  const pos = positionOf(board, inspectorSecretId);
  if (!pos) return false;
  return board[pos.r][pos.c]?.status === CELL_STATUS.DECEASED;
}

export function checkInspectorWinByArrest(targetSuspectId, killerIdentityId) {
  return targetSuspectId === killerIdentityId;
}
