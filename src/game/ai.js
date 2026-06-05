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

// ─── Zorluk Profilleri ────────────────────────────────────────────────────────
// Her parametre ne işe yarıyor:
//
//  patternWeight      : Cinayet örüntüsü (tüm ölü bedenlerden ortalama mesafe)
//                       skoruna verilen ağırlık. Yükseldikçe AI katili daha iyi takip eder.
//  adjacencyWeight    : Ölüye komşu olmanın skora katkısı (anlık ipucu).
//  arrestThreshold    : Bu puanın altındaki hedefleri tutuklama ihtimali (0-1).
//  highScoreArrestP   : Yüksek puanlı hedefi tutuklama olasılığı.
//  lowScoreArrestP    : Düşük/sıfır puanlı hedefi rastgele tutuklama olasılığı.
//  exonerateP         : Temize çıkarma olasılığı (deste + el varken).
//  killerShiftP       : Katil AI'ın kaydırma yapma olasılığı.
//  killerDisguiseP    : Katil AI'ın kılık değiştirme olasılığı.
//  noiseLevel         : Skor hesabına eklenen rastgele gürültü (0 = deterministik).
//
export const DIFFICULTY = {
  easy: {
    patternWeight:     0.4,   // Örüntüyü az dikkate al
    adjacencyWeight:   1.0,
    highScoreArrestP:  0.50,  // İyi ipucu olsa bile sık sık kaçırır
    lowScoreArrestP:   0.25,  // Rastgele tutuklamaya meyilli
    exonerateP:        0.50,
    killerShiftP:      0.20,
    killerDisguiseP:   0.20,
    noiseLevel:        1.2,   // Çok gürültülü — karar verme tutarsız
  },
  normal: {
    patternWeight:     1.0,
    adjacencyWeight:   1.0,
    highScoreArrestP:  0.75,
    lowScoreArrestP:   0.10,
    exonerateP:        0.65,
    killerShiftP:      0.30,
    killerDisguiseP:   0.25,
    noiseLevel:        0.3,
  },
  hard: {
    patternWeight:     2.0,   // Örüntüye çok ağırlık verir — katili geometrik olarak izler
    adjacencyWeight:   1.0,
    highScoreArrestP:  0.92,
    lowScoreArrestP:   0.02,  // Neredeyse hiç boş hamle yapmaz
    exonerateP:        0.80,
    killerShiftP:      0.35,
    killerDisguiseP:   0.30,
    noiseLevel:        0.05,  // Neredeyse deterministik
  },
};

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
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

// Chebyshev mesafesi (8 yönlü hareket için doğal birim)
function chebyshev(r1, c1, r2, c2) {
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}

// Tüm ölü bedenlerin koordinatlarını döndürür
function getDeceasedCoords(board) {
  const coords = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < (board[r]?.length ?? 0); c++) {
      if (board[r][c]?.status === 'deceased') coords.push({ r, c });
    }
  }
  return coords;
}

// ─── Dedektif tutuklama skoru ─────────────────────────────────────────────────
// Her canlı şüpheli için iki sinyal hesaplanır ve ağırlıklı olarak birleştirilir:
//
//  1. adjacencyScore : Kaç tane ölü bedenin komşusunda olduğu (anlık ipucu).
//     "Bu karakter cinayet mahallindeydi" anlamına gelir.
//
//  2. patternScore   : Tüm ölü bedenlere ortalama mesafenin tersi.
//     Mesafe küçüldükçe (katil hareket etmeden öldürdükçe) skor büyür.
//     "Bu karakter tüm cinayetlerin geometrik merkezinde" anlamına gelir.
//     4 cinayet, hiç kaydırma yok → Knox Reed gibi sabit bir katil için
//     bu skor çok erken belirginleşir.
//
function scoreArrestTarget(target, board, deceasedCoords, cfg) {
  // 1. Anlık komşuluk skoru
  let adjacency = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = target.r + dr;
      const nc = target.c + dc;
      if (nr >= 0 && nr < board.length && nc >= 0 && nc < (board[nr]?.length ?? 0)) {
        if (board[nr][nc]?.status === 'deceased') adjacency++;
      }
    }
  }

  // 2. Örüntü skoru — tüm ölü bedenlerden ortalama mesafe (tersine çevrilmiş)
  let pattern = 0;
  if (deceasedCoords.length > 0) {
    let totalDist = 0;
    for (const d of deceasedCoords) {
      totalDist += chebyshev(target.r, target.c, d.r, d.c);
    }
    const avgDist = totalDist / deceasedCoords.length;
    // avgDist = 0 → yakın (ama 0'a bölünmemeli); +0.5 ile sıfır koruması
    pattern = 1 / (avgDist + 0.5);
  }

  // Gürültü ekle — zorluk seviyesine göre kararı bulanıklaştırır
  const noise = (Math.random() - 0.5) * cfg.noiseLevel;

  return cfg.adjacencyWeight * adjacency + cfg.patternWeight * pattern + noise;
}

// ─── Akıllı Dedektif Kaydırması ───────────────────────────────────────────────
// Kaydırma sonrası dedektifin gizli kimliği ölü bedenlere ne kadar yaklaşıyor?
// En yakın hamleyi seç — dedektif soruşturma için kendini doğru konuma taşır.
function getSmartInspectorShift(game) {
  const moves = allShiftMoves(game);
  if (!moves.length) return null;

  let bestMove = null;
  let minAvgDist = Infinity;

  for (const m of moves) {
    const tempBoard = m.axis === 'row'
      ? shiftRow(game.board, m.index, m.direction)
      : shiftColumn(game.board, m.index, m.direction);

    const inspPos = positionOf(tempBoard, game.inspector.secretIdentitySuspectId);
    if (!inspPos) continue;

    let totalDist = 0;
    let count = 0;
    for (let r = 0; r < tempBoard.length; r++) {
      for (let c = 0; c < (tempBoard[r]?.length ?? 0); c++) {
        if (tempBoard[r][c]?.status === 'deceased') {
          totalDist += chebyshev(r, c, inspPos.r, inspPos.c);
          count++;
        }
      }
    }

    const avgDist = count > 0 ? totalDist / count : Infinity;
    const score = avgDist + Math.random() * 0.1;
    if (score < minAvgDist) {
      minAvgDist = score;
      bestMove = m;
    }
  }

  return bestMove || pickRandom(moves);
}

// ─── Ana AI turu ──────────────────────────────────────────────────────────────
export function runAiTurn(game) {
  if (game.gameOver || game.activeSide !== 'ai') return game;

  // Zorluk seviyesini oyun state'inden al; yoksa 'normal' varsayılan
  const cfg = DIFFICULTY[game.difficulty ?? 'normal'];

  // Faz: Katil kimlik seçimi
  if (game.phase === PHASE.KILLER_PICK_IDENTITY) {
    const card = pickRandom(game.killer.hand);
    if (!card) return game;
    return applyKillerPickIdentity(game, card).game;
  }

  // Faz: Kılık değiştirme
  if (game.phase === PHASE.KILLER_PICK_DISGUISE) {
    // El: [disguiseCard, yeni kart] — AI rastgele birini kimlik olarak seçer
    const card = pickRandom(game.killer.hand);
    if (!card) return game;
    return applyKillerPickIdentity(game, card).game;
  }

  // Faz: İlk öldürme
  if (game.phase === PHASE.KILLER_FIRST_KILL) {
    const targets = getKillTargets(game, game.killer.identitySuspectId);
    const t = pickRandom(targets);
    if (!t) return game;
    return applyKill(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
  }

  // Faz: Dedektif kimlik seçimi
  if (game.phase === PHASE.INSPECTOR_PICK_IDENTITY) {
    const card = pickRandom(game.inspector.hand);
    if (!card) return game;
    return applyInspectorPickIdentity(game, card).game;
  }

  // ── Katil turu ──
  if (game.turn === TURN.KILLER) {
    const roll = Math.random();
    const targets = getKillTargets(game, game.killer.identitySuspectId);

    // Önce öldür (sabit %45)
    if (roll < 0.45 && targets.length) {
      const t = pickRandom(targets);
      return applyKill(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
    }
    // Kılık değiştir
    if (roll < 0.45 + cfg.killerDisguiseP && game.evidenceDeck.length) {
      return applyDisguise(game, game.killer, game.inspector.secretIdentitySuspectId).game;
    }
    // Kaydır
    const shifts = allShiftMoves(game);
    if (roll < 0.45 + cfg.killerDisguiseP + cfg.killerShiftP && shifts.length) {
      const s = pickRandom(shifts);
      return applyShift(game, s.axis, s.index, s.direction).game;
    }
    // Fallback: yine öldür
    if (targets.length) {
      const t = pickRandom(targets);
      return applyKill(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
    }
    return game;
  }

  // ── Dedektif turu ──
  const rawArrestTargets = getArrestTargets(game, game.inspector.secretIdentitySuspectId);
  const arrestTargets = rawArrestTargets.filter(t => {
    const investigated = (game.inspector.investigated || []).includes(t.suspectId);
    const isDead = game.board[t.r]?.[t.c]?.status === 'deceased';
    return !investigated && !isDead;
  });

  const deceasedCoords = getDeceasedCoords(game.board);
  const deceasedCount = deceasedCoords.length;

  // Hedefleri yeni bileşik skorla puanla
  const scoredTargets = arrestTargets
    .map(t => ({ ...t, score: scoreArrestTarget(t, game.board, deceasedCoords, cfg) }))
    .sort((a, b) => b.score - a.score);

  const roll = Math.random();
  const highestScore = scoredTargets.length ? scoredTargets[0].score : 0;

  // Arrest kararı:
  // • Skor anlamlıysa (ölü komşu + örüntü sinyali) → highScoreArrestP ile tutukla
  // • Skor anlamsızsa ve cinayet varsa → lowScoreArrestP ile tutukla (neredeyse hiç yapmamalı)
  // • Hiç cinayet yoksa → çok küçük ihtimalle rastgele tutukla
  if (scoredTargets.length > 0) {
    const meaningfulScore = deceasedCount > 0 && highestScore > cfg.patternWeight * 0.4;
    const threshold = meaningfulScore
      ? cfg.highScoreArrestP
      : (deceasedCount === 0 ? 0.15 : cfg.lowScoreArrestP);

    if (roll < threshold) {
      const bestTargets = scoredTargets.filter(t => t.score >= highestScore - cfg.noiseLevel * 0.5);
      const t = pickRandom(bestTargets);
      return applyArrest(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
    }
  }

  // Temize çıkar
  if (roll < cfg.exonerateP && game.evidenceDeck.length && game.inspector.hand.length) {
    const deceasedIds = new Set(
      game.board.flat().filter(c => c?.status === 'deceased').map(c => c.suspectId)
    );
    const validDiscard = game.inspector.hand.filter(
      id => id !== game.killer.identitySuspectId && !deceasedIds.has(id)
    );
    if (validDiscard.length > 0) {
      return applyExonerate(game, pickRandom(validDiscard)).game;
    }
  }

  // Akıllı kaydırma
  const shiftMove = getSmartInspectorShift(game);
  if (shiftMove) {
    return applyShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
  }

  // Fallback: son çare tutukla
  if (arrestTargets.length) {
    return applyArrest(game, pickRandom(arrestTargets).suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
  }

  return game;
}
