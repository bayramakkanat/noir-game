import { PHASE, TURN } from './constants.js';
import { getKillTargets, getArrestTargets, canShift } from './validators.js';
import { shiftRow, shiftColumn, positionOf } from './board.js';
import {
  applyKillerPickIdentity,
  applyKill,
  applyArrest,
  applyExonerate,
  applyDisguise,
  applyShift,
  applyInspectorPickIdentity,
} from './actions.js';

function pickRandom(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function allShiftMoves(game) {
  const moves = [];
  for (let i = 0; i < game.board.length; i++) {
    if (game.board[i].every((cell) => cell === null)) continue;
    for (const d of ['left', 'right']) {
      if (canShift(game, 'row', i, d)) moves.push({ axis: 'row', index: i, direction: d });
    }
  }

  const numCols = game.board[0]?.length ?? 0;
  for (let i = 0; i < numCols; i++) {
    if (game.board.every((row) => row[i] === null)) continue;
    for (const d of ['up', 'down']) {
      if (canShift(game, 'col', i, d)) moves.push({ axis: 'col', index: i, direction: d });
    }
  }
  return moves;
}

function getSmartInspectorShift(game) {
  const moves = allShiftMoves(game);
  if (!moves.length) return null;

  const deceasedCoords = [];
  for (let r = 0; r < game.board.length; r++) {
    for (let c = 0; c < (game.board[r]?.length ?? 0); c++) {
      if (game.board[r][c]?.status === 'deceased') {
        deceasedCoords.push({ r, c });
      }
    }
  }

  // Eğer hiç ölü yoksa rastgele kaydır
  if (deceasedCoords.length === 0) return pickRandom(moves);

  let bestMove = null;
  let minAvgDist = Infinity;

  for (const m of moves) {
    const tempBoard = m.axis === 'row' 
      ? shiftRow(game.board, m.index, m.direction)
      : shiftColumn(game.board, m.index, m.direction);
    
    const inspPos = positionOf(tempBoard, game.inspector.secretIdentitySuspectId);
    if (!inspPos) continue;

    let totalDist = 0;
    // Geçici tahtadaki ölülerin konumunu bulmaya gerek yok çünkü ölüler de kaymış olabilir.
    // O yüzden geçici tahtadaki ölüleri tekrar bulmalıyız.
    let tempDeceasedCount = 0;
    for (let r = 0; r < tempBoard.length; r++) {
      for (let c = 0; c < (tempBoard[r]?.length ?? 0); c++) {
        if (tempBoard[r][c]?.status === 'deceased') {
          // Chebyshev mesafesi (en fazla olan x veya y farkı)
          const dist = Math.max(Math.abs(r - inspPos.r), Math.abs(c - inspPos.c));
          totalDist += dist;
          tempDeceasedCount++;
        }
      }
    }
    
    const avgDist = totalDist / Math.max(1, tempDeceasedCount);
    
    // Küçük bir rastgelelik ekle (aynı mesafedeki hamleler arasında çeşitlilik)
    const score = avgDist + (Math.random() * 0.1); 

    if (score < minAvgDist) {
      minAvgDist = score;
      bestMove = m;
    }
  }

  return bestMove || pickRandom(moves);
}

export function runAiTurn(game) {
  if (game.gameOver || game.activeSide !== 'ai') return game;

  // YENİ: AI katil kimlik seçimi (Oyun Başı ve Kılık Değiştirme)
  if (game.phase === PHASE.KILLER_PICK_IDENTITY) {
    const card = pickRandom(game.killer.hand);
    if (!card) return game;
    return applyKillerPickIdentity(game, card).game;
  }
  
  if (game.phase === PHASE.KILLER_PICK_DISGUISE) {
  const card = pickRandom(game.killer.hand);
  if (!card) return game;
  return applyDisguise(game, { ...game.killer, disguiseCardSuspectId: card }, game.inspector.secretIdentitySuspectId).game;
}

  if (game.phase === PHASE.KILLER_FIRST_KILL) {
    const targets = getKillTargets(game, game.killer.identitySuspectId);
    const t = pickRandom(targets);
    if (!t) return game;
    return applyKill(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
  }

  if (game.phase === PHASE.INSPECTOR_PICK_IDENTITY) {
    const card = pickRandom(game.inspector.hand);
    if (!card) return game;
    return applyInspectorPickIdentity(game, card).game;
  }

  if (game.turn === TURN.KILLER) {
    const roll = Math.random();
    const targets = getKillTargets(game, game.killer.identitySuspectId);
    if (roll < 0.45 && targets.length) {
      const t = pickRandom(targets);
      return applyKill(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
    }
    if (roll < 0.7 && game.evidenceDeck.length) {
      return applyDisguise(game, game.killer, game.inspector.secretIdentitySuspectId).game;
    }
    const shifts = allShiftMoves(game);
    if (shifts.length) {
      const s = pickRandom(shifts);
      return applyShift(game, s.axis, s.index, s.direction).game;
    }
    if (targets.length) {
      const t = pickRandom(targets);
      return applyKill(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
    }
    return game;
  }

  // Inspector AI
  const rawArrestTargets = getArrestTargets(game, game.inspector.secretIdentitySuspectId);
  // Daha önce sorgulanıp masum olduğu anlaşılanları (ve ölüleri) filtrele
  const arrestTargets = rawArrestTargets.filter(t => {
    const isInvestigated = (game.inspector.investigated || []).includes(t.suspectId);
    const isDead = game.board[t.r]?.[t.c]?.status === 'deceased';
    return !isInvestigated && !isDead;
  });
  // Hedefleri puanla: Ölü bedenlere komşu olan şüpheliler katil olmaya çok daha yatkındır.
  const scoredTargets = arrestTargets.map(t => {
    let score = 0;
    // t.r ve t.c komşularına bak
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = t.r + dr;
        const nc = t.c + dc;
        if (nr >= 0 && nr < game.board.length && nc >= 0 && nc < (game.board[nr]?.length ?? 0)) {
          if (game.board[nr][nc]?.status === 'deceased') {
            score++;
          }
        }
      }
    }
    return { ...t, score };
  });

  // Puana göre büyükten küçüğe sırala
  scoredTargets.sort((a, b) => b.score - a.score);
  const roll = Math.random();

  // Eğer yüksek puanlı (cinayet mahalline komşu) biri varsa %75 ihtimalle onu tutukla.
  // Yoksa rastgele tutuklama ihtimali düşük olsun (%20).
  const highestScore = scoredTargets.length ? scoredTargets[0].score : 0;
  
  const deceasedCount = game.board.flat().filter((c) => c?.status === 'deceased').length;
  
  if (scoredTargets.length > 0) {
    let shouldArrest = false;
    
    if (highestScore > 0 && roll < 0.75) {
      // Cinayet mahalline komşu şüpheliler varsa yüksek ihtimalle tutukla
      shouldArrest = true;
    } else if (highestScore === 0) {
      // Eğer komşulardan hiçbiri ölü bedenlere komşu değilse...
      if (deceasedCount === 0) {
        // Henüz cinayet işlenmediyse (istisnai durum) ufak bir ihtimalle rastgele tutukla
        shouldArrest = (roll < 0.2 || (scoredTargets.length <= 2 && roll < 0.5));
      } else {
        // Cinayet işlenmiş ama bizim etrafımız temiz. Katil muhtemelen burada değil!
        // Tutuklama yapmak yerine tahtayı kaydırmaya yönelmesi için pas geç.
        shouldArrest = false;
      }
    }

    if (shouldArrest) {
      // En yüksek puanlılar arasından rastgele seç
      const bestTargets = scoredTargets.filter(t => t.score === highestScore);
      const t = pickRandom(bestTargets);
      return applyArrest(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
    }
  }

  // %45 Şans ile temize çıkar (Eğer geçerli kart varsa)
  if (roll < 0.65 && game.evidenceDeck.length && game.inspector.hand.length) {
    const deceasedIds = new Set(
      game.board.flat().filter((c) => c && c.status === 'deceased').map((c) => c.suspectId)
    );
    const validDiscard = game.inspector.hand.filter(
      (id) => id !== game.killer.identitySuspectId && !deceasedIds.has(id)
    );
    if (validDiscard.length > 0) {
      const toDiscard = pickRandom(validDiscard);
      return applyExonerate(game, toDiscard).game;
    }
  }

  // Kalan ihtimalle tahtayı kaydır (Akıllı Kaydırma)
  const shiftMove = getSmartInspectorShift(game);
  if (shiftMove) {
    return applyShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
  }

  // Hiçbir şey yapamazsa rastgele tutukla
  if (arrestTargets.length) {
    const t = pickRandom(arrestTargets);
    return applyArrest(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
  }

  return game;
}
