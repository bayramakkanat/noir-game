import { PHASE, TURN } from './constants.js';
import { getKillTargets, getArrestTargets, canShift } from './validators.js';
import { shiftRow, shiftColumn, positionOf } from './board.js';
import {
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

// Cinayet mahalleri — satır/sütun kaldırılsa bile koordinatlar korunur
function getKillSites(game) {
  if (game.killSites?.length) return game.killSites;
  const coords = [];
  for (let r = 0; r < game.board.length; r++) {
    for (let c = 0; c < (game.board[r]?.length ?? 0); c++) {
      if (game.board[r][c]?.status === 'deceased') {
        coords.push({ r, c, suspectId: game.board[r][c].suspectId });
      }
    }
  }
  return coords;
}

function crimeAdjacencyToKillSites(target, killSites) {
  let n = 0;
  for (const site of killSites) {
    const dr = Math.abs(target.r - site.r);
    const dc = Math.abs(target.c - site.c);
    if (dr <= 1 && dc <= 1 && (dr + dc > 0)) n++;
  }
  return n;
}

/** Dedektif konumunun cinayetlere uzaklığı ve tutuklayabileceği cinayet-komşusu sayısı */
function evaluateInspectorInvestigation(game, board, killSites) {
  const secretId = game.inspector.secretIdentitySuspectId;
  if (secretId == null) {
    return { avgKillDist: Infinity, crimeArrestCount: 0 };
  }

  const inspPos = positionOf(board, secretId);
  if (!inspPos) {
    return { avgKillDist: Infinity, crimeArrestCount: 0 };
  }

  let avgKillDist = Infinity;
  if (killSites.length > 0) {
    let total = 0;
    for (const site of killSites) {
      total += chebyshev(inspPos.r, inspPos.c, site.r, site.c);
    }
    avgKillDist = total / killSites.length;
  }

  const investigated = new Set(game.inspector.investigated || []);
  const killedIds = new Set(game.killedSuspectIds ?? []);
  const crimeArrestCount = getArrestTargets({ ...game, board }, secretId).filter(
    (t) => !investigated.has(t.suspectId) && !killedIds.has(t.suspectId) &&
      crimeAdjacencyToKillSites(t, killSites) > 0
  ).length;

  return { avgKillDist, crimeArrestCount };
}

function scoreInspectorShiftMove(game, move, killSites, cfg) {
  const tempBoard =
    move.axis === 'row'
      ? shiftRow(game.board, move.index, move.direction)
      : shiftColumn(game.board, move.index, move.direction);

  const before = evaluateInspectorInvestigation(game, game.board, killSites);
  const after = evaluateInspectorInvestigation(game, tempBoard, killSites);

  const distGain = before.avgKillDist - after.avgKillDist;
  const arrestGain = after.crimeArrestCount - before.crimeArrestCount;

  const score =
    after.avgKillDist * 2 -
    arrestGain * 5 -
    distGain * 3 +
    (Math.random() - 0.5) * cfg.noiseLevel * 0.15;

  return { score, distGain, arrestGain, after };
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
function scoreArrestTarget(target, killSites, cfg) {
  // 1. Cinayet mahaline komşuluk (katil öldürme kuralıyla uyumlu ipucu)
  const adjacency = crimeAdjacencyToKillSites(target, killSites);

  // 2. Örüntü skoru — tüm cinayetlerden ortalama mesafe (tersine çevrilmiş)
  let pattern = 0;
  if (killSites.length > 0) {
    let totalDist = 0;
    for (const d of killSites) {
      totalDist += chebyshev(target.r, target.c, d.r, d.c);
    }
    const avgDist = totalDist / killSites.length;
    pattern = 1 / (avgDist + 0.5);
  }

  // Gürültü ekle — zorluk seviyesine göre kararı bulanıklaştırır
  const noise = (Math.random() - 0.5) * cfg.noiseLevel;

  return cfg.adjacencyWeight * adjacency + cfg.patternWeight * pattern + noise;
}

// ─── Akıllı Dedektif Kaydırması ───────────────────────────────────────────────
// Cinayet mahallerine yaklaşır ve sonraki turda cinayet-komşusu tutuklama açar.
function getSmartInspectorShift(game, cfg) {
  const moves = allShiftMoves(game);
  if (!moves.length) return null;

  const killSites = getKillSites(game);
  let bestMove = null;
  let bestScore = Infinity;

  for (const m of moves) {
    const { score } = scoreInspectorShiftMove(game, m, killSites, cfg);
    if (score < bestScore) {
      bestScore = score;
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
  const killedIds = new Set(game.killedSuspectIds ?? []);
  const arrestTargets = rawArrestTargets.filter(t => {
    const investigated = (game.inspector.investigated || []).includes(t.suspectId);
    return !investigated && !killedIds.has(t.suspectId);
  });

  const killSites = getKillSites(game);
  const deceasedCount = game.killCount ?? killSites.length;
  const investigation = evaluateInspectorInvestigation(game, game.board, killSites);

  const scoredTargets = arrestTargets
    .map(t => ({
      ...t,
      crimeAdj: crimeAdjacencyToKillSites(t, killSites),
      score: scoreArrestTarget(t, killSites, cfg),
    }))
    .filter(t => deceasedCount === 0 || t.crimeAdj > 0)
    .sort((a, b) => b.score - a.score);

  const highestScore = scoredTargets.length ? scoredTargets[0].score : 0;
  const shiftMove = getSmartInspectorShift(game, cfg);
  const shiftEval = shiftMove ? scoreInspectorShiftMove(game, shiftMove, killSites, cfg) : null;

  const needsReposition =
    deceasedCount > 0 &&
    (scoredTargets.length === 0 || investigation.crimeArrestCount === 0);

  const shiftHelps =
    shiftEval != null &&
    (shiftEval.arrestGain > 0 || shiftEval.distGain >= 0.5);

  const pickArrestTarget = () => {
    const best = scoredTargets.filter(t => t.score >= highestScore - cfg.noiseLevel * 0.5);
    return pickRandom(best.length ? best : scoredTargets);
  };

  // 1) Güçlü ipucu — cinayet komşusu ve yüksek skor
  if (scoredTargets.length > 0) {
    const top = scoredTargets[0];
    const strongSignal =
      top.crimeAdj > 0 &&
      top.score >= cfg.patternWeight * 0.55 + cfg.adjacencyWeight;
    if (strongSignal && Math.random() < cfg.highScoreArrestP) {
      const t = pickArrestTarget();
      if (t) {
        return applyArrest(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
      }
    }
  }

  // 2) Cinayet bölgesine yaklaş (kaydır) — alakasız tutuklama yerine konumlan
  if (shiftMove && (needsReposition || shiftHelps)) {
    const shiftChance = needsReposition ? 0.9 : 0.6;
    if (Math.random() < shiftChance) {
      return applyShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
    }
  }

  // 3) Orta düzey tutuklama — yalnızca cinayet-komşusu ve anlamlı skor
  if (scoredTargets.length > 0) {
    const top = scoredTargets[0];
    const moderateSignal =
      deceasedCount === 0 ||
      (top.crimeAdj > 0 && highestScore > cfg.patternWeight * 0.45);
    if (moderateSignal && Math.random() < cfg.highScoreArrestP * 0.65) {
      const t = pickArrestTarget();
      if (t) {
        return applyArrest(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
      }
    }
  }

  // 4) Temize çıkar — soruşturma sıcakken daha seyrek
  const exonerateChance =
    deceasedCount > 0 && (needsReposition || shiftHelps)
      ? cfg.exonerateP * 0.3
      : cfg.exonerateP;
  if (Math.random() < exonerateChance && game.evidenceDeck.length && game.inspector.hand.length) {
    const deceasedIds = new Set(game.killedSuspectIds ?? []);
    const validDiscard = game.inspector.hand.filter(
      id => id !== game.killer.identitySuspectId && !deceasedIds.has(id)
    );
    if (validDiscard.length > 0) {
      return applyExonerate(game, pickRandom(validDiscard)).game;
    }
  }

  // 5) Kaydırma yedek
  if (shiftMove) {
    return applyShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
  }

  // 6) Son çare: erken oyunda rastgele tutuklama; cinayet sonrası yalnızca cinayet-komşusu
  if (arrestTargets.length) {
    const pool =
      deceasedCount > 0
        ? arrestTargets.filter(t => crimeAdjacencyToKillSites(t, killSites) > 0)
        : arrestTargets;
    if (pool.length) {
      return applyArrest(game, pickRandom(pool).suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
    }
  }

  return game;
}
