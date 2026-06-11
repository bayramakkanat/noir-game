/**
 * Standart mod action'ları — Resmi "Killer vs. Inspector" kuralları
 *
 * Bu dosya klasik actions.js'e hiç dokunmaz.
 * Paylaşılan yardımcılar (shift, board utils) import edilir.
 */

import { CELL_STATUS, PHASE, TURN, STANDARD_KILLER_WIN_DEATH_COUNT, INSPECTOR_HAND_SIZE } from './constants.js';
import { shiftRow, shiftColumn, positionOf, removeEmptyRowsAndCols, getAliveNeighborsOfSuspect, areAdjacent } from './board.js';
import { drawCards } from './deck.js';
import { isReverseShift, isValidKillTarget, isValidArrestTarget } from './validators.js';
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
    pendingCanvas: null,
  };
}

function advanceTurn(game) {
  if (game.phase === PHASE.KILLER_FIRST_KILL) {
    const killedIds = new Set(game.killedSuspectIds ?? []);
    let deck = game.evidenceDeck;
    const hand = [];
    // Döngüyle 4 canlı kart çekene kadar devam et
    while (hand.length < INSPECTOR_HAND_SIZE && deck.length > 0) {
      const { drawn, remaining } = drawCards(deck, 1);
      deck = remaining;
      if (!killedIds.has(drawn[0])) hand.push(drawn[0]);
    }
    return {
      ...game,
      evidenceDeck: deck,
      inspector: { ...game.inspector, hand },
      phase: PHASE.INSPECTOR_PICK_IDENTITY,
      activeSide: game.humanRole === 'inspector' ? 'human' : 'ai',
    };
  }
  const nextTurn = game.turn === TURN.KILLER ? TURN.INSPECTOR : TURN.KILLER;
  const humanIsKiller = game.humanRole === 'killer';
  const nextActiveSide =
    (nextTurn === TURN.KILLER && humanIsKiller) ||
    (nextTurn === TURN.INSPECTOR && !humanIsKiller)
      ? 'human' : 'ai';
  return { ...game, phase: PHASE.PLAY, turn: nextTurn, activeSide: nextActiveSide };
}

// Win kontrolü — sadece öldürme sonrası çağrılmalı
function applyWinChecks(game, inspectorSecretId) {
  if ((game.killCount ?? 0) >= STANDARD_KILLER_WIN_DEATH_COUNT)
    return endGame({ ...game, winReason: 'deaths' }, 'killer');
  if (inspectorSecretId != null && (game.killedSuspectIds ?? []).includes(inspectorSecretId)) {
    return endGame({ ...game, winReason: 'inspector_killed' }, 'killer');
  }
  return game;
}

function isIdentityAdjacentTo(game, identityId, targetSuspectId) {
  if (identityId == null) return false;
  const identityPos = positionOf(game.board, identityId);
  const targetPos   = positionOf(game.board, targetSuspectId);
  return areAdjacent(identityPos, targetPos);
}

// ─── Kill ─────────────────────────────────────────────────────────────────────
export function applyStandardKill(game, suspectId, killerIdentityId, inspectorSecretId) {
  if (!isValidKillTarget(game, killerIdentityId, suspectId)) return { ok: false, game };

  const killPos = positionOf(game.board, suspectId);
  const boardAfterMark = game.board.map(row =>
    row.map(cell => cell
      ? { ...cell, status: cell.suspectId === suspectId ? CELL_STATUS.DECEASED : cell.status }
      : null
    )
  );

  const killSite = killPos ? { r: killPos.r, c: killPos.c, suspectId } : null;
  const isExonerated = (game.publicExonerated ?? []).includes(suspectId);

  let next = {
    ...game,
    board: boardAfterMark,
    pendingAction: null,
    killCount: (game.killCount ?? 0) + 1,
    killedSuspectIds: [...(game.killedSuspectIds ?? []), suspectId],
    killSites: killSite ? [...(game.killSites ?? []), killSite] : (game.killSites ?? []),
    publicExonerated: (game.publicExonerated ?? []).filter(id => id !== suspectId),
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

  // Win kontrolü — sadece burada çağrılır
  next = applyWinChecks(next, inspectorSecretId);
  if (next.gameOver) return { ok: true, game: next };

  if (isExonerated) {
    // Komşuluk kontrolü öldürme ÖNCESİ board üzerinde yapılmalı
    // Çünkü öldürme sonrası karakter board'dan kalkmış olabilir
    const inspectorIsAdjacent = isIdentityAdjacentTo(
      { ...next, board: game.board }, // orijinal board
      inspectorSecretId,
      suspectId
    );
    next = {
      ...next,
      positiveInspectorCanvases: inspectorIsAdjacent
        ? [...(next.positiveInspectorCanvases ?? []), suspectId]
        : (next.positiveInspectorCanvases ?? []),
      pendingCanvas: {
        type: 'inspector_answers',
        triggerSuspectId: suspectId,
        isAdjacent: inspectorIsAdjacent,
      },
    };
    next = addLog(next, `📍 Dedektif kimliğinin <b>${suspectName(suspectId)}</b>'a komşu olup olmadığı sorgulandı.`);
    next = advanceTurn(next);
    return { ok: true, game: next };
  }

  next = advanceTurn(next);
  return { ok: true, game: next };
}

// ─── Disguise ─────────────────────────────────────────────────────────────────
export function applyStandardDisguise(game) {
  const { identitySuspectId, disguiseSuspectId } = game.killer;
  const isDisguiseDead = (game.killedSuspectIds ?? []).includes(disguiseSuspectId);
  if (isDisguiseDead) return { ok: false, game, reason: 'disguise_dead' };

  const newKiller = {
    ...game.killer,
    identitySuspectId: disguiseSuspectId,
    disguiseSuspectId: identitySuspectId,
  };

  let next = { ...game, killer: newKiller, pendingAction: null, lastArrestedId: null, aiFailedArrests: {} };

  if (game.humanRole === 'killer') {
    next = addLog(next, `⇄ Kılık değiştirdin. Yeni kimliğin: <b>${suspectName(disguiseSuspectId)}</b>.`);
  } else {
    next = addLog(next, `⇄ Katil kılık değiştirdi.`);
  }

  next = advanceTurn(next);
  return { ok: true, game: next };
}

// ─── Accuse ───────────────────────────────────────────────────────────────────
export function applyStandardAccuse(game, targetSuspectId, killerIdentityId, inspectorSecretId) {
  if (!isValidArrestTarget(game, inspectorSecretId, targetSuspectId)) return { ok: false, game };

  const name = suspectName(targetSuspectId);

  if (targetSuspectId === killerIdentityId) {
    let next = { ...game, pendingAction: null, lastArrestedId: targetSuspectId };
    next = addLog(next, `🔗 Tutuklama başarılı: <b>${name}</b> katildi!`);
    return { ok: true, game: endGame({ ...next, winReason: 'arrest' }, 'inspector') };
  }

  // Başarısız tutuklama — aynı kişi 2 kez denendiyse kalıcı olarak dışla
  const prevFailed = game.aiFailedArrests ?? {};
  const failCount = (prevFailed[targetSuspectId] ?? 0) + 1;
  const newFailed = { ...prevFailed, [targetSuspectId]: failCount };
  const aiExcluded = failCount >= 2
    ? [...(game.aiExcludedSuspects ?? []), targetSuspectId]
    : (game.aiExcludedSuspects ?? []);

  let next = {
    ...game,
    pendingAction: null,
    lastArrestedId: targetSuspectId,
    arrestFailCount: (game.arrestFailCount ?? 0) + 1,
    aiFailedArrests: newFailed,
    aiExcludedSuspects: [...new Set(aiExcluded)],
  };
  next = addLog(next, `🔗 <b>${name}</b> tutuklandı ama katil değil. Tur devam ediyor.`);
  next = advanceTurn(next);
  return { ok: true, game: next };
}

// ─── Exonerate ────────────────────────────────────────────────────────────────
export function applyStandardExonerate(game, discardFromHandId, killerIdentityId) {
  if (game.evidenceDeck.length === 0) return { ok: false, game };
  if (!game.inspector.hand?.includes(discardFromHandId)) return { ok: false, game };

  const isDeceased = (game.killedSuspectIds ?? []).includes(discardFromHandId);
  const { drawn, remaining } = drawCards(game.evidenceDeck, 1);
  const drawnId = drawn[0];
  const hand = game.inspector.hand.filter(id => id !== discardFromHandId);

  let next = {
    ...game,
    evidenceDeck: remaining,
    inspector: { ...game.inspector, hand: [...hand, drawnId] },
    pendingAction: null,
    pendingExonerateDiscard: null,
  };

  if (isDeceased) {
    next = addLog(next, `↺ <b>${suspectName(discardFromHandId)}</b> zaten ölmüş — kart atıldı, el yenilendi.`);
  } else {
    next = {
      ...next,
      publicExonerated: [...(game.publicExonerated ?? []), discardFromHandId],
    };
    const killerIsAdjacent = isIdentityAdjacentTo(next, killerIdentityId, discardFromHandId);
    next = {
      ...next,
      positiveKillerCanvases: killerIsAdjacent
        ? [...(next.positiveKillerCanvases ?? []), discardFromHandId]
        : (next.positiveKillerCanvases ?? []),
      pendingCanvas: {
        type: 'killer_answers',
        triggerSuspectId: discardFromHandId,
        isAdjacent: killerIsAdjacent,
      },
    };
    next = addLog(next, `✓ Temize çıkarıldı: <b>${suspectName(discardFromHandId)}</b>. 📍 Katil kimliğinin <b>${suspectName(discardFromHandId)}</b>'a komşu olup olmadığı sorgulandı.`);
  }

  next = advanceTurn(next);
  return { ok: true, game: next };
}

// ─── Solve ────────────────────────────────────────────────────────────────────
export function applyStandardSolve(game, guessIdentityId, guessDisguiseId) {
  const realIdentity = game.killer.identitySuspectId;
  const realDisguise = game.killer.disguiseSuspectId;
  let next = { ...game, pendingAction: null, solveGuess: {} };

  if (guessIdentityId === realIdentity && guessDisguiseId === realDisguise) {
    next = addLog(next, `🎯 Çözüm doğru! Katil: <b>${suspectName(realIdentity)}</b>, Kılık: <b>${suspectName(realDisguise)}</b>.`);
    return { ok: true, game: endGame({ ...next, winReason: 'solve' }, 'inspector') };
  }

  next = addLog(next, `❌ Yanlış tahmin! Gerçek Katil: <b>${suspectName(realIdentity)}</b>, Kılık: <b>${suspectName(realDisguise)}</b>.`);
  return { ok: true, game: endGame({ ...next, winReason: 'wrong_solve', solveGuess: { identityId: guessIdentityId, disguiseId: guessDisguiseId } }, 'killer') };
}

// ─── Shift ────────────────────────────────────────────────────────────────────
// NOT: Shift sırasında kimse ölmez — win check YOKTUR.
export function applyStandardShift(game, axis, index, direction) {
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
  next = advanceTurn(next);
  return { ok: true, game: next };
}

// ─── Inspector kimlik seçimi ──────────────────────────────────────────────────
export function applyStandardInspectorPickIdentity(game, cardSuspectId) {
  if (game.phase !== PHASE.INSPECTOR_PICK_IDENTITY) return { ok: false, game };
  if (!game.inspector.hand.includes(cardSuspectId)) return { ok: false, game };

  const isKilled = (game.killedSuspectIds ?? []).includes(cardSuspectId);
  if (isKilled) return { ok: false, game };

  const hand = game.inspector.hand.filter(id => id !== cardSuspectId);
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

// ─── Canvas temizle ───────────────────────────────────────────────────────────
export function clearCanvas(game) {
  return { ...game, pendingCanvas: null };
}
