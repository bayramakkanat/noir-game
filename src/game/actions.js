import { CELL_STATUS, PHASE, TURN } from './constants.js';
import { markDeceased, shiftRow, shiftColumn, positionOf } from './board.js';
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

// ─── Katil kimlik seçimi ─────────────────────────────────────────────────────
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

  // Sadece kendi rolüne ait kimlik log'a yazılır
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

  let next = { ...game, board: markDeceased(game.board, suspectId), pendingAction: null };
  next = addLog(next, `🗡️ Öldürüldü: <b>${suspectName(suspectId)}</b>.`);
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
  
  next.inspector = {
    ...next.inspector,
    investigated: [...(next.inspector.investigated || []), targetSuspectId],
  };

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

  // Ölmüş karakterleri atla: deste'den canlı bir karakter çek
  const deceasedIds = new Set(
    game.board.flat()
      .filter((c) => c && c.status === 'deceased')
      .map((c) => c.suspectId)
  );

  let deck = [...game.evidenceDeck];
  let newCardId = null;
  const skipped = [];

  while (deck.length > 0) {
    const { drawn, remaining } = drawCards(deck, 1);
    deck = remaining;
    if (!deceasedIds.has(drawn[0])) {
      newCardId = drawn[0];
      deck = [...deck, ...skipped];
      break;
    }
    skipped.push(drawn[0]);
  }

  const oldIdentityId = killerState.identitySuspectId;
  
  const oldDisguiseId = killerState.disguiseCardSuspectId;
  const nextKiller = { ...killerState, hand: [oldDisguiseId, newCardId], identitySuspectId: null, disguiseCardSuspectId: null };

  let next = { 
    ...game, 
    evidenceDeck: deck, 
    discardPile: [...game.discardPile, oldIdentityId],
    killer: nextKiller, 
    pendingAction: null, 
    phase: PHASE.KILLER_PICK_DISGUISE 
  };

  // Kılık değiştirince eski kimlik herkese açıklanır (açık olarak atılır)
  if (game.humanRole === 'killer') {
    next = addLog(next, `⇄ Kılık değiştiriyorsun. Eski kimliğin <b>${suspectName(oldIdentityId)}</b> açığa çıktı. Tahtadan yeni kimliğini seç.`);
  } else {
    next = addLog(next, `⇄ Katil kılık değiştirdi! Önceki kimliği <b>${suspectName(oldIdentityId)}</b> imiş.`);
  }

  // Turn advance is deferred to pick disguise phase
  return { ok: true, game: next };
}

// ─── Katil Kılık Değiştirme Kimlik Seçimi ──────────────────────────────────────
export function applyKillerPickDisguise(game, cardSuspectId) {
  if (game.phase !== PHASE.KILLER_PICK_DISGUISE) return { ok: false, game };
  if (!game.killer.hand.includes(cardSuspectId)) return { ok: false, game };

  const disguiseCardId = game.killer.hand.find((id) => id !== cardSuspectId);

  let next = {
    ...game,
    killer: {
      ...game.killer,
      identitySuspectId: cardSuspectId,
      disguiseCardSuspectId: disguiseCardId,
      hand: [],
    },
    inspector: {
      ...game.inspector,
      investigated: [], // Katil kılık değiştirdiğinde dedektifin hafızası sıfırlanır
    },
  };

  if (game.humanRole === 'killer') {
    next = addLog(next, `Yeni kimliğin: <b>${suspectName(cardSuspectId)}</b>.`);
  }
  
  next = applyWinChecks(next, next.killer.identitySuspectId, game.inspector.secretIdentitySuspectId);
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

  // Sadece kendi rolüne ait kimlik log'a yazılır
  if (game.humanRole === 'inspector') {
    next = addLog(next, `🔍 Gizli kimliğin: <b>${suspectName(cardSuspectId)}</b>. Oyun başlıyor.`);
  } else {
    next = addLog(next, `Dedektif kimliğini seçti. Oyun başlıyor.`);
  }
  return { ok: true, game: next };
}
