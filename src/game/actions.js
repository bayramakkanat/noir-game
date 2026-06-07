import { CELL_STATUS, PHASE, TURN } from './constants.js';
import { shiftRow, shiftColumn, positionOf, removeEmptyRowsAndCols } from './board.js';
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
  return SUSPECTS.find(s => s.id === id)?.name ?? `#${id}`;
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
  if (checkKillerWinByDeaths(game.killCount ?? 0)) return endGame(game, 'killer');
  if (checkKillerWinByKillingInspector(game.board, inspectorSecretId, game.killedSuspectIds))
    return endGame(game, 'killer');
  return game;
}

// ─── Kill ────────────────────────────────────────────────────────────────────
export function applyKill(game, suspectId, killerIdentityId, inspectorSecretId) {
  if (!isValidKillTarget(game, killerIdentityId, suspectId)) return { ok: false, game };

  const killPos = positionOf(game.board, suspectId);
  const boardAfterMark = game.board.map(row =>
    row.map(cell => cell ? { ...cell, status: cell.suspectId === suspectId ? CELL_STATUS.DECEASED : cell.status } : null)
  );

  const killSite = killPos ? { r: killPos.r, c: killPos.c, suspectId } : null;

  let next = {
    ...game,
    board: boardAfterMark,
    pendingAction: null,
    killCount: (game.killCount ?? 0) + 1,
    killedSuspectIds: [...(game.killedSuspectIds ?? []), suspectId],
    killSites: killSite ? [...(game.killSites ?? []), killSite] : (game.killSites ?? []),
  };
  next = addLog(next, `🗡️ Öldürüldü: <b>${suspectName(suspectId)}</b>.`);

  const { board: cleaned, removedRows, removedCols } = removeEmptyRowsAndCols(boardAfterMark);
  if (removedRows.length > 0 || removedCols.length > 0) {
    next = { ...next, board: cleaned };
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

  const realKillerId = game.killer.identitySuspectId;
  if (checkInspectorWinByArrest(targetSuspectId, realKillerId)) {
    next = addLog(next, `🔍 Tutuklama başarılı: <b>${name}</b> katildi!`);
    return { ok: true, game: endGame(next, 'inspector') };
  }

  next = addLog(next, `🔍 <b>${name}</b> tutuklandı ama katil değil. Tur devam ediyor.`);
  next = {
    ...next,
    inspector: {
      ...next.inspector,
      investigated: [...(next.inspector.investigated || []), targetSuspectId],
    },
  };
  next = advanceTurnAfterAction(next);
  return { ok: true, game: next };
}

// ─── Exonerate ───────────────────────────────────────────────────────────────
export function applyExonerate(game, discardFromHandId) {
  if (game.evidenceDeck.length === 0) return { ok: false, game };
  if (!game.inspector.hand || !game.inspector.hand.includes(discardFromHandId)) return { ok: false, game };

  const isDeceased = (game.killedSuspectIds ?? []).includes(discardFromHandId);

  const { drawn, remaining } = drawCards(game.evidenceDeck, 1);
  const drawnId = drawn[0];
  const hand = game.inspector.hand.filter((id) => id !== discardFromHandId);

  let next = {
    ...game,
    evidenceDeck: remaining,
    inspector: { ...game.inspector, hand: [...hand, drawnId] },
    // Ölü kart ise sadece el yenilenir, masum listesine eklenmez
    publicExonerated: isDeceased
      ? game.publicExonerated
      : [...game.publicExonerated, discardFromHandId],
    discardPile: [...game.discardPile, discardFromHandId],
    pendingAction: null,
    pendingExonerateDiscard: null,
  };

  if (isDeceased) {
    next = addLog(next, `↺ <b>${suspectName(discardFromHandId)}</b> zaten ölmüş — kart atıldı, el yenilendi.`);
  } else {
    next = addLog(next, `✓ Temize çıkarıldı: <b>${suspectName(discardFromHandId)}</b>.`);
  }

  next = advanceTurnAfterAction(next);
  return { ok: true, game: next };
}

// ─── Disguise ────────────────────────────────────────────────────────────────
// Desteden rastgele 1 kart çekilir.
// Yaşıyorsa → başarılı: direkt yeni kimliğe geç, eski kimlik ölür.
// Ölmüşse  → başarısız: kart atılır, eski kimlik korunur, tur biter.
export function applyDisguise(game, killerState, inspectorSecretId) {
  if (game.evidenceDeck.length === 0) return { ok: false, game };

  const drawnId = game.evidenceDeck[0];
  const remaining = game.evidenceDeck.slice(1);

  const deceasedIds = new Set(game.killedSuspectIds ?? []);
  const isLiving = !deceasedIds.has(drawnId);

  if (!isLiving) {
    let next = {
      ...game,
      evidenceDeck: remaining,
      discardPile: [...game.discardPile, drawnId],
      pendingAction: null,
    };
    if (game.humanRole === 'killer') {
      next = addLog(next, `⇄ Kılık değiştirme başarısız: çekilen <b>${suspectName(drawnId)}</b> zaten ölmüş. Eski kimlik korunuyor.`);
    } else {
      next = addLog(next, `⇄ Katil kılık değiştirmeye çalıştı ama başarısız oldu.`);
    }
    next = advanceTurnAfterAction(next);
    return { ok: true, game: next };
  }

  // Başarılı: direkt yeni karta geç
  const oldIdentityId = game.killer.identitySuspectId;

  const boardAfterDisguise = game.board.map(row =>
    row.map(cell => {
      if (cell && cell.suspectId === oldIdentityId) {
        return { ...cell, status: CELL_STATUS.DECEASED };
      }
      return cell;
    })
  );
  const { board: cleanedBoard, removedRows, removedCols } = removeEmptyRowsAndCols(boardAfterDisguise);

  let next = {
    ...game,
    evidenceDeck: remaining,
    board: cleanedBoard,
    killedSuspectIds: [...(game.killedSuspectIds ?? []), oldIdentityId],
    killCount: (game.killCount ?? 0) + 1,
    killer: {
      ...game.killer,
      identitySuspectId: drawnId,
      disguiseCardSuspectId: null,
      hand: [],
    },
    pendingAction: null,
  };

  if (game.humanRole === 'killer') {
    next = addLog(next, `⇄ Kılık değiştirdin. Yeni kimliğin: <b>${suspectName(drawnId)}</b>. Eski kimlik (<b>${suspectName(oldIdentityId)}</b>) öldü.`);
  } else {
    next = addLog(next, `⇄ Katil kılık değiştirdi. Eski kimlik: <b>${suspectName(oldIdentityId)}</b>.`);
  }

  if (removedRows.length > 0 || removedCols.length > 0) {
    const parts = [];
    if (removedRows.length) parts.push(`${removedRows.length} satır`);
    if (removedCols.length) parts.push(`${removedCols.length} sütun`);
    next = addLog(next, `🧹 Tüm karakterler öldü — ${parts.join(' ve ')} tahtadan kaldırıldı.`);
  }

  next = applyWinChecks(next, drawnId, game.inspector.secretIdentitySuspectId);
  if (next.gameOver) return { ok: true, game: next };
  next = advanceTurnAfterAction(next);
  return { ok: true, game: next };
}

// ─── Shift ───────────────────────────────────────────────────────────────────
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
