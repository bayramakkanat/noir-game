import { PHASE, TURN, CELL_STATUS } from './constants.js';
import {
  getAliveNeighborsOfSuspect,
  getSuspectAt,
  positionOf,
} from './board.js';

export function isReverseShift(lastShift, axis, index, direction) {
  if (!lastShift) return false;
  if (lastShift.axis !== axis || lastShift.index !== index) return false;
  const opposites = {
    row: { left: 'right', right: 'left' },
    col: { up: 'down', down: 'up' },
  };
  return opposites[axis][direction] === lastShift.direction;
}

export function canShift(game, axis, index, direction) {
  if (game.gameOver) return false;
  if (isReverseShift(game.lastShift, axis, index, direction)) return false;
  return true;
}

export function getKillTargets(game, killerIdentityId) {
  // killerIdentityId null ise boş döndür
  if (killerIdentityId == null) return [];
  const neighbors = getAliveNeighborsOfSuspect(game.board, killerIdentityId);
  // katilin kendi kimliğini öldürememesi için filtrele
  return neighbors
    .filter(({ cell }) => cell.suspectId !== killerIdentityId)
    .map(({ r, c, cell }) => ({ r, c, suspectId: cell.suspectId }));
}

export function getArrestTargets(game, inspectorSecretId) {
  const targets = [];
  if (inspectorSecretId == null) return targets;

  const pos = positionOf(game.board, inspectorSecretId);
  if (!pos) return targets;

  // Komşular
  getAliveNeighborsOfSuspect(game.board, inspectorSecretId).forEach(
    ({ r, c, cell }) => targets.push({ r, c, suspectId: cell.suspectId })
  );

  // Dedektifin kendi kimliği de tutuklanabilir (self-arrest) — katilin kafasını karıştırmak için
  const inspCell = game.board[pos.r][pos.c];
  if (inspCell?.status === CELL_STATUS.ALIVE) {
    targets.push({ r: pos.r, c: pos.c, suspectId: inspectorSecretId });
  }

  return targets;
}

export function isValidKillTarget(game, killerIdentityId, suspectId) {
  if (killerIdentityId == null) return false;
  return getKillTargets(game, killerIdentityId).some(
    (t) => t.suspectId === suspectId
  );
}

export function isValidArrestTarget(game, inspectorSecretId, suspectId) {
  if (inspectorSecretId == null) return false;
  return getArrestTargets(game, inspectorSecretId).some(
    (t) => t.suspectId === suspectId
  );
}

export function getBoardCoordTargets(game, pendingAction, roleSecrets) {
  if (pendingAction === 'kill') {
    return getKillTargets(game, roleSecrets?.killerIdentityId);
  }
  if (pendingAction === 'arrest') {
    return getArrestTargets(game, roleSecrets?.inspectorSecretId);
  }
  if (pendingAction === 'solve_identity' || pendingAction === 'solve_disguise') {
    const targets = [];
    for (let r = 0; r < game.board.length; r++) {
      for (let c = 0; c < (game.board[r]?.length ?? 0); c++) {
        if (game.board[r][c]) {
          targets.push({ r, c, suspectId: game.board[r][c].suspectId });
        }
      }
    }
    return targets;
  }
  return [];
}

export function isCoordTargetable(game, r, c, pendingAction, roleSecrets) {
  const suspectId = getSuspectAt(game.board, r, c);
  if (suspectId == null) return false;
  const targets = getBoardCoordTargets(game, pendingAction, roleSecrets);
  return targets.some((t) => t.r === r && t.c === c);
}

export function whoseActionPhase(game) {
  if (game.phase === PHASE.KILLER_FIRST_KILL) return TURN.KILLER;
  if (game.phase === PHASE.INSPECTOR_PICK_IDENTITY) return TURN.INSPECTOR;
  return game.turn;
}

export function isHumanTurn(game) {
  return game.activeSide === 'human';
}
