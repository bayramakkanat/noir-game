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
  if (checkKillerWinByDeaths(game.killCount ?? 0)) return endGame(game, 'killer');
  if (checkKillerWinByKillingInspector(game.board, inspectorSecretId, game.killedSuspectIds))
    return endGame(game, 'killer');
  return game;
}

// ─── Katil kimlik seçimi ──────────────────────────────────────────────────────
export function applyKillerPickIdentity(game, cardSuspectId) {
  const validPhase = game.phase === PHASE.KILLER_PICK_IDENTITY || game.phase === PHASE.KILLER_PICK_DISGUISE;
  if (!validPhase) return { ok: false, game };
  if (!game.killer.hand.includes(cardSuspectId)) return { ok: false, game };

  const disguiseCardId = game.killer.hand.find((id) => id !== cardSuspectId);

  // Kılık değiştirme seçimi: eski kimliği desteye geri at, yeni kimlik ve kılık kartını güncelle
  if (game.phase === PHASE.KILLER_PICK_DISGUISE) {
    const oldIdentityId = game.killer.identitySuspectId;
    let next = {
      ...game,
      phase: PHASE.PLAY,
      evidenceDeck: [...game.evidenceDeck, oldIdentityId],
      killer: {
        ...game.killer,
        identitySuspectId: cardSuspectId,
        disguiseCardSuspectId: disguiseCardId,
        hand: [],
      },
      pendingAction: null,
    };
    if (game.humanRole === 'killer') {
      next = addLog(next, `⇄ Kılık değiştirdin. Yeni kimliğin: <b>${suspectName(cardSuspectId)}</b>.`);
    } else {
      next = addLog(next, `⇄ Katil kılık değiştirdi.`);
    }
    next = applyWinChecks(next, cardSuspectId, game.inspector.secretIdentitySuspectId);
    next = advanceTurnAfterAction(next);
    return { ok: true, game: next };
  }

  // Oyun başı seçimi
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
  const killPos = positionOf(game.board, suspectId);
  const boardAfterMark = (() => {
    const next = game.board.map(row => row.map(cell => cell ? { ...cell } : null));
    const pos = positionOf(next, suspectId);
    if (pos) next[pos.r][pos.c].status = CELL_STATUS.DECEASED;
    return next;
  })();

  const killSite = killPos ? { r: killPos.r, c: killPos.c, suspectId } : null;

  // Boş satır/sütun kontrolü
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

  // Masum olduğu kanıtlanan karakteri investigated listesine ekle
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
  if (!game.inspector.hand.includes(discardFromHandId)) return { ok: false, game };
  if ((game.killedSuspectIds ?? []).includes(discardFromHandId)) return { ok: false, game };

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

// ─── Disguise: kart çek ve seçim fazını başlat ──────────────────────────────
// executeDisguise çağırdığında desteden 1 kart çekilir.
// Elindekiler: [mevcut disguiseCard, yeni kart] → KILLER_PICK_DISGUISE fazına geçilir.
// Oyuncu hangisini kimlik olarak kullanacağını seçer; diğeri yeni disguiseCard olur.
export function applyDisguise(game, killerState, inspectorSecretId) {
  if (game.evidenceDeck.length === 0) return { ok: false, game };

  // Ölü karakterlerin id'leri — tahtadan kaldırılmış satır/sütunlar dahil
  const deceasedIds = new Set(game.killedSuspectIds ?? []);

  // Desteden ölü olmayan bir kart çek
  let newCardId = null;
  let remaining = [...game.evidenceDeck];
  for (let i = 0; i < remaining.length; i++) {
    if (!deceasedIds.has(remaining[i])) {
      newCardId = remaining[i];
      remaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      break;
    }
  }

  // Tüm destede ölü olmayan kart yoksa başarısız
  if (newCardId === null) return { ok: false, game };

  // Mevcut disguiseCard + yeni kart → oyuncuya seçim sun
  const currentDisguise = killerState.disguiseCardSuspectId;
  const hand = currentDisguise != null ? [currentDisguise, newCardId] : [newCardId];

  let next = {
    ...game,
    phase: PHASE.KILLER_PICK_DISGUISE,
    evidenceDeck: remaining,
    killer: {
      ...game.killer,
      hand,
    },
    pendingAction: null,
    activeSide: game.humanRole === 'killer' ? 'human' : 'ai',
  };

  if (game.humanRole === 'killer') {
    next = addLog(next, `⇄ Kılık değiştirme: elindeki 2 karttan yeni kimliğini seç.`);
  }

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
