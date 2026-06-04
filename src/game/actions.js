import { CELL_STATUS, PHASE, TURN } from './constants.js';
import { markDeceased, shiftRow, shiftColumn, positionOf, removeEmptyRowsAndCols, cloneBoard } from './board.js';
import {
  checkInspectorWinByArrest,
  checkKillerWinByDeaths,
  checkKillerWinByKillingInspector,
} from './win.js';
import {
  isReverseShift,
  isValidKillTarget,
  isValidArrestTarget,
} from './validators.js';
import { drawCards } from './deck.js';
import { SUSPECTS } from '../data/suspects.js';

function suspectName(id) {
  return SUSPECTS[id]?.name ?? `#${id}`;
}

function addLog(game, html) {
  return { ...game, logs: [html, ...game.logs].slice(0, 40) };
}

function endGame(game, winner) {
  return {
    ...game,
    gameOver: true,
    winner,
    pendingAction: null,
    pendingShift: null,
    pendingExonerateDiscard: null,
  };
}

function advanceTurnAfterAction(game) {
  if (game.phase === PHASE.KILLER_FIRST_KILL) {
    return {
      ...game,
      phase: PHASE.INSPECTOR_PICK_IDENTITY,
      activeSide: game.humanRole === 'inspector' ? 'human' : 'ai',
    };
  }
  const nextTurn = game.turn === TURN.KILLER ? TURN.INSPECTOR : TURN.KILLER;
  const humanIsKiller = game.humanRole === 'killer';
  const nextActiveSide =
    (nextTurn === TURN.KILLER && humanIsKiller) ||
    (nextTurn === TURN.INSPECTOR && !humanIsKiller)
      ? 'human'
      : 'ai';
  return { ...game, phase: PHASE.PLAY, turn: nextTurn, activeSide: nextActiveSide };
}

function applyWinChecks(game, killerIdentityId, inspectorSecretId) {
  if (checkKillerWinByDeaths(game.board)) return endGame(game, 'killer');
  if (checkKillerWinByKillingInspector(game.board, inspectorSecretId))
    return endGame(game, 'killer');
  return game;
}

/**
 * Öldürme sonrası boş satır/sütunları temizle ve log ekle.
 */
function applyCleanup(game, boardBeforeClean) {
  const { board: cleaned, removedRows, removedCols } = removeEmptyRowsAndCols(boardBeforeClean);
  let next = { ...game, board: cleaned };

  if (removedRows.length > 0) {
    next = addLog(next, `🧹 Boş satır temizlendi — ${removedRows.length} satır kaldırıldı.`);
  }
  if (removedCols.length > 0) {
    next = addLog(next, `🧹 Boş sütun temizlendi — ${removedCols.length} sütun kaldırıldı.`);
  }

  return next;
}

// ─── Katil kimlik seçimi ──────────────────────────────────────────────────────
export function applyKillerPickIdentity(game, cardSuspectId) {
  if (game.phase !== PHASE.KILLER_PICK_IDENTITY) return { ok: false, game };
  if (!game.killer.hand.includes(cardSuspectId)) return { ok: false, game };

  const disguiseCardId = game.killer.hand.find((id) => id !== cardSuspectId);
  let next = {
    ...game,
    phase: PHASE.KILLER_FIRST_KILL,
    turn: TURN.KILLER,
    killer: {
      ...game.killer,
      identitySuspectId: cardSuspectId,
      disguiseCardSuspectId: disguiseCardId,
      hand: [],
    },
    activeSide: game.humanRole === 'killer' ? 'human' : 'ai',
  };

  if (game.humanRole === 'killer') {
    next = addLog(next, `🗡️ Gizli kimliğin: <b>${suspectName(cardSuspectId)}</b>. İlk hamle: komşunu öldür.`);
  } else {
    next = addLog(next, `Katil kimliğini seçti. İlk hamle başlıyor...`);
  }
  return { ok: true, game: next };
}

// ─── Kill ─────────────────────────────────────────────────────────────────────
export function applyKill(game, suspectId, killerIdentityId, inspectorSecretId) {
  if (!isValidKillTarget(game, killerIdentityId, suspectId)) return { ok: false, game };

  // Önce deceased olarak işaretle (cloneBoard üzerinde)
  const boardAfterMark = (() => {
    const next = game.board.map(row => row.map(cell => cell ? { ...cell } : null));
    const pos = positionOf(next, suspectId);
    if (pos) next[pos.r][pos.c].status = CELL_STATUS.DECEASED;
    return next;
  })();

  // Boş satır/sütun kontrolü
  const { board: cleaned, removedRows, removedCols } = removeEmptyRowsAndCols(boardAfterMark);

  let next = { ...game, board: cleaned, pendingAction: null };
  next = addLog(next, `🗡️ Öldürüldü: <b>${suspectName(suspectId)}</b>.`);

  if (removedRows.length > 0 || removedCols.length > 0) {
    const parts = [];
    if (removedRows.length) parts.push(`${removedRows.length} satır`);
    if (removedCols.length) parts.push(`${removedCols.length} sütun`);
    next = addLog(next, `🧹 Tüm karakterler öldü — ${parts.join(' ve ')} tahtadan kaldırıldı.`);
  }

  next = applyWinChecks(next, killerIdentityId, inspectorSecretId);
  if (next.gameOver) return { ok: true, game: next };
  next = advanceTurnAfterAction(next);
  return { ok: true, game: next };
}

// ─── Arrest ──────────────────────────────────────────────────────────────────
export function applyArrest(game, targetSuspectId, killerIdentityId, inspectorSecretId) {
  if (!isValidArrestTarget(game, inspectorSecretId, targetSuspectId)) return { ok: false, game };

  let next = { ...game, pendingAction: null };
  const name = suspectName(targetSuspectId);

  if (checkInspectorWinByArrest(targetSuspectId, killerIdentityId)) {
    next = addLog(next, `🔍 Tutuklama başarılı: <b>${name}</b> katildi!`);
    return { ok: true, game: endGame(next, 'inspector') };
  }

  next = addLog(next, `🔍 <b>${name}</b> tutuklandı ama katil değil. Tur devam ediyor.`);
  next = advanceTurnAfterAction(next);
  return { ok: true, game: next };
}

// ─── Exonerate ───────────────────────────────────────────────────────────────
export function applyExonerate(game, discardFromHandId) {
  if (game.evidenceDeck.length === 0) return { ok: false, game };
  if (!game.inspector.hand.includes(discardFromHandId)) return { ok: false, game };

  const { drawn, remaining } = drawCards(game.evidenceDeck, 1);
  const drawnId = drawn[0];
  const hand = game.inspector.hand.filter((id) => id !== discardFromHandId);

  let next = {
    ...game,
    evidenceDeck: remaining,
    inspector: { ...game.inspector, hand: [...hand, drawnId] },
    publicExonerated: [...game.publicExonerated, discardFromHandId],
    discardPile: [...game.discardPile, discardFromHandId],
    pendingAction: null,
    pendingExonerateDiscard: null,
  };
  next = addLog(next, `✓ Temize çıkarıldı: <b>${suspectName(discardFromHandId)}</b>.`);
  next = advanceTurnAfterAction(next);
  return { ok: true, game: next };
}

// ─── Disguise ─────────────────────────────────────────────────────────────────
export function applyDisguise(game, killerState, inspectorSecretId) {
  if (game.evidenceDeck.length === 0) return { ok: false, game };

  const { drawn, remaining } = drawCards(game.evidenceDeck, 1);
  const newCardId = drawn[0];
  const oldIdentityId = killerState.identitySuspectId;
  const nextDeck = [...remaining, oldIdentityId];
  const nextKiller = { ...killerState, identitySuspectId: newCardId };

  let next = { ...game, evidenceDeck: nextDeck, killer: nextKiller, pendingAction: null };

  if (game.humanRole === 'killer') {
    next = addLog(next, `⇄ Kılık değiştirdin. Yeni kimliğin: <b>${suspectName(newCardId)}</b>.`);
  } else {
    next = addLog(next, `⇄ Katil kılık değiştirdi.`);
  }

  next = applyWinChecks(next, nextKiller.identitySuspectId, inspectorSecretId);
  if (next.gameOver) return { ok: true, game: next };
  next = advanceTurnAfterAction(next);
  return { ok: true, game: next };
}

// ─── Shift ────────────────────────────────────────────────────────────────────
export function applyShift(game, axis, index, direction) {
  if (isReverseShift(game.lastShift, axis, index, direction)) return { ok: false, game };

  const board =
    axis === 'row'
      ? shiftRow(game.board, index, direction)
      : shiftColumn(game.board, index, direction);

  const axisTr = axis === 'row' ? 'Satır' : 'Sütun';
  const dirTr = { left: 'Sola', right: 'Sağa', up: 'Yukarı', down: 'Aşağı' }[direction];

  let next = {
    ...game,
    board,
    lastShift: { axis, index, direction },
    pendingAction: null,
    pendingShift: null,
  };
  next = addLog(next, `↔ Tahta kaydırıldı (${axisTr} ${index + 1}, ${dirTr}).`);
  next = applyWinChecks(next, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId);
  if (next.gameOver) return { ok: true, game: next };
  next = advanceTurnAfterAction(next);
  return { ok: true, game: next };
}

// ─── Inspector kimlik seçimi ──────────────────────────────────────────────────
export function applyInspectorPickIdentity(game, cardSuspectId) {
  if (game.phase !== PHASE.INSPECTOR_PICK_IDENTITY) return { ok: false, game };
  if (!game.inspector.hand.includes(cardSuspectId)) return { ok: false, game };

  const hand = game.inspector.hand.filter((id) => id !== cardSuspectId);
  let next = {
    ...game,
    phase: PHASE.PLAY,
    turn: TURN.KILLER,
    inspector: { ...game.inspector, secretIdentitySuspectId: cardSuspectId, hand },
    activeSide: game.humanRole === 'killer' ? 'human' : 'ai',
  };

  if (game.humanRole === 'inspector') {
    next = addLog(next, `🔍 Gizli kimliğin: <b>${suspectName(cardSuspectId)}</b>. Oyun başlıyor.`);
  } else {
    next = addLog(next, `Dedektif kimliğini seçti. Oyun başlıyor.`);
  }
  return { ok: true, game: next };
}
