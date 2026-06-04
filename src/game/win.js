import { CELL_STATUS, KILLER_WIN_DEATH_COUNT } from './constants.js';
import { countDeceased, positionOf } from './board.js';

export function checkKillerWinByDeaths(board) {
  return countDeceased(board) >= KILLER_WIN_DEATH_COUNT;
}

export function checkKillerWinByKillingInspector(board, inspectorSecretId) {
  if (inspectorSecretId == null) return false;
  const pos = positionOf(board, inspectorSecretId);
  if (!pos) return false;
  return board[pos.r][pos.c]?.status === CELL_STATUS.DECEASED;
}

export function checkInspectorWinByArrest(targetSuspectId, killerIdentityId) {
  return targetSuspectId === killerIdentityId;
}
