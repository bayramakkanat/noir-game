/**
 * Standart mod AI — Resmi "Killer vs. Inspector" kuralları
 *
 * Klasik ai.js'e hiç dokunmaz.
 * Temel farklar:
 *  - Killer: Disguise = desteden değil, elindeki 2 kart arasında geçiş
 *  - Killer: Win = 10 öldürme (16 değil)
 *  - Inspector: Solve action kullanabilir (hem Identity hem Disguise tahmin)
 *  - Inspector: Investigated listesi yok — her suspect her zaman hedeflenebilir
 */

import { PHASE, TURN, STANDARD_KILLER_WIN_DEATH_COUNT } from './constants.js';
import { getKillTargets, getArrestTargets, canShift } from './validators.js';
import { shiftRow, shiftColumn, positionOf } from './board.js';
import {
  applyStandardKill,
  applyStandardDisguise,
  applyStandardExonerate,
  applyStandardAccuse,
  applyStandardShift,
  applyStandardInspectorPickIdentity,
  applyStandardSolve,
} from './actionsStandard.js';
import { DIFFICULTY } from './ai.js'; // Zorluk profilleri klasikle aynı

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

function chebyshev(r1, c1, r2, c2) {
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}

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

function crimeAdjacency(target, killSites) {
  let n = 0;
  for (const site of killSites) {
    const dr = Math.abs(target.r - site.r);
    const dc = Math.abs(target.c - site.c);
    if (dr <= 1 && dc <= 1 && (dr + dc > 0)) n++;
  }
  return n;
}

function scoreArrestTarget(target, killSites, cfg) {
  const adjacency = crimeAdjacency(target, killSites);
  let pattern = 0;
  if (killSites.length > 0) {
    let totalDist = 0;
    for (const d of killSites) totalDist += chebyshev(target.r, target.c, d.r, d.c);
    pattern = 1 / (totalDist / killSites.length + 0.5);
  }
  const noise = (Math.random() - 0.5) * cfg.noiseLevel;
  return cfg.adjacencyWeight * adjacency + cfg.patternWeight * pattern + noise;
}

function evaluateInspectorPos(game, board, killSites) {
  const secretId = game.inspector.secretIdentitySuspectId;
  if (secretId == null) return { avgKillDist: Infinity, crimeArrestCount: 0 };
  const pos = positionOf(board, secretId);
  if (!pos) return { avgKillDist: Infinity, crimeArrestCount: 0 };

  let avgKillDist = Infinity;
  if (killSites.length > 0) {
    const total = killSites.reduce((s, site) => s + chebyshev(pos.r, pos.c, site.r, site.c), 0);
    avgKillDist = total / killSites.length;
  }

  // Standart modda investigated listesi yok
  const killedIds = new Set(game.killedSuspectIds ?? []);
  const crimeArrestCount = getArrestTargets({ ...game, board }, secretId)
    .filter(t => !killedIds.has(t.suspectId) && crimeAdjacency(t, killSites) > 0)
    .length;

  return { avgKillDist, crimeArrestCount };
}

function scoreShiftMove(game, move, killSites, cfg) {
  const tempBoard =
    move.axis === 'row'
      ? shiftRow(game.board, move.index, move.direction)
      : shiftColumn(game.board, move.index, move.direction);

  const before = evaluateInspectorPos(game, game.board, killSites);
  const after  = evaluateInspectorPos(game, tempBoard, killSites);

  const score =
    after.avgKillDist * 2 -
    (after.crimeArrestCount - before.crimeArrestCount) * 5 -
    (before.avgKillDist - after.avgKillDist) * 3 +
    (Math.random() - 0.5) * cfg.noiseLevel * 0.15;

  return { score, distGain: before.avgKillDist - after.avgKillDist, arrestGain: after.crimeArrestCount - before.crimeArrestCount };
}

function getSmartShift(game, cfg) {
  const moves = allShiftMoves(game);
  if (!moves.length) return null;
  const killSites = getKillSites(game);
  let bestMove = null, bestScore = Infinity;
  for (const m of moves) {
    const { score } = scoreShiftMove(game, m, killSites, cfg);
    if (score < bestScore) { bestScore = score; bestMove = m; }
  }
  return bestMove || pickRandom(moves);
}

// ─── Solve kararı ─────────────────────────────────────────────────────────────
// AI Inspector, belirli koşullarda Solve hamlesi yapar.
// Klasik modda Inspector kazanmak için Arrest yeterlidir.
// Standart modda Solve = hem Identity hem Disguise doğru tahmin.
// AI bunu sadece çok yüksek güven ile yapar — yoksa yanlış tahmin = oyun biter.
function shouldSolve(game, scoredTargets, cfg, deceasedCount) {
  // En az 6 ölüm olmadan Solve yapma (eskiden 3 idi — çok erken tetikleniyordu)
  if (deceasedCount < 6) return false;

  // Yüksek puan alan tek bir aday varsa ve pattern güçlüyse
  if (!scoredTargets.length) return false;
  const top = scoredTargets[0];
  const second = scoredTargets[1];

  // Açık ara önde bir aday varsa ve güven yeterince yüksekse
  const clearLeader = !second || (top.score - second.score) > cfg.patternWeight * 1.2;
  const highConfidence = top.score >= cfg.patternWeight * 1.6 + cfg.adjacencyWeight * 3;

  return clearLeader && highConfidence && Math.random() < 0.15;
}

// Disguise tahmini: Inspector'ın elindeki ve tahtadaki kartlardan en az şüpheli olanı seç
function guessDisguise(game, guessIdentityId, killSites, cfg) {
  const allIds = [
    ...game.board.flat().filter(Boolean).map(c => c.suspectId),
    ...(game.killedSuspectIds ?? []),
  ];
  const candidates = [...new Set(allIds)].filter(id => id !== guessIdentityId);

  // En düşük puanlı (en az şüpheli) adayı seç — katil kılığı saf görünür
  const killedIds = new Set(game.killedSuspectIds ?? []);
  const scored = candidates.map(id => {
    const pos = positionOf(game.board, id);
    const adj = pos ? crimeAdjacency(pos, killSites) : 0;
    let pattern = 0;
    if (pos && killSites.length > 0) {
      const avgDist = killSites.reduce((s, site) => s + chebyshev(pos.r, pos.c, site.r, site.c), 0) / killSites.length;
      pattern = 1 / (avgDist + 0.5);
    }
    const noise = (Math.random() - 0.5) * cfg.noiseLevel;
    return { id, score: cfg.adjacencyWeight * adj + cfg.patternWeight * pattern + noise };
  });

  // Düşük puanlı = az şüpheli = muhtemel kılık
  scored.sort((a, b) => a.score - b.score);
  return scored[0]?.id ?? pickRandom(candidates);
}

// ─── Ana AI turu (Standart mod) ───────────────────────────────────────────────
export function runStandardAiTurn(game) {
  if (game.gameOver || game.activeSide !== 'ai') return game;

  const cfg = DIFFICULTY[game.difficulty ?? 'normal'];

  // ── Faz: İlk öldürme ──
  if (game.phase === PHASE.KILLER_FIRST_KILL) {
    const targets = getKillTargets(game, game.killer.identitySuspectId);
    const t = pickRandom(targets);
    if (!t) return game;
    return applyStandardKill(game, t.suspectId, game.killer.identitySuspectId, game.inspector.secretIdentitySuspectId).game;
  }

  // ── Faz: Dedektif kimlik seçimi ──
  if (game.phase === PHASE.INSPECTOR_PICK_IDENTITY) {
    const killedIds = new Set(game.killedSuspectIds ?? []);
    const hand = (game.inspector.hand ?? []).filter(id => !killedIds.has(id));
    if (!hand.length) {
      // Elde seçilebilir kart yoksa tahtadan canlı bir karakter al
      const aliveIds = game.board.flat()
        .filter(c => c && c.status === 'alive')
        .map(c => c.suspectId);
      const fallback = pickRandom(aliveIds);
      if (!fallback) return game;
      return applyStandardInspectorPickIdentity(
        { ...game, inspector: { ...game.inspector, hand: [fallback] } }, fallback
      ).game;
    }
    return applyStandardInspectorPickIdentity(game, pickRandom(hand)).game;
  }

  // ── Katil turu ──
  if (game.turn === TURN.KILLER) {
    const roll = Math.random();
    const killerIdentityId = game.killer.identitySuspectId;
    const targets = getKillTargets(game, killerIdentityId);

    // Öldür (sabit %45)
    if (roll < 0.45 && targets.length) {
      const t = pickRandom(targets);
      return applyStandardKill(game, t.suspectId, killerIdentityId, game.inspector.secretIdentitySuspectId).game;
    }

    // Kılık değiştir — standart modda: yedek ölmediyse geçiş yap
    const disguiseDead = (game.killedSuspectIds ?? []).includes(game.killer.disguiseSuspectId);
    if (roll < 0.45 + cfg.killerDisguiseP && !disguiseDead) {
      const { ok, game: next } = applyStandardDisguise(game);
      if (ok) return next;
    }

    // Kaydır
    const shifts = allShiftMoves(game);
    if (roll < 0.45 + cfg.killerDisguiseP + cfg.killerShiftP && shifts.length) {
      const s = pickRandom(shifts);
      return applyStandardShift(game, s.axis, s.index, s.direction).game;
    }

    // Fallback: yine öldür
    if (targets.length) {
      const t = pickRandom(targets);
      return applyStandardKill(game, t.suspectId, killerIdentityId, game.inspector.secretIdentitySuspectId).game;
    }
    return game;
  }

  // ── Dedektif turu ──
  const secretId = game.inspector.secretIdentitySuspectId;
  const killedIds = new Set(game.killedSuspectIds ?? []);
  const killSites = getKillSites(game);
  const deceasedCount = game.killCount ?? killSites.length;

  // Son başarısız tutuklama + kalıcı dışlananlar
  const lastFailed = game.lastArrestedId ?? null;
  const excluded = new Set(game.aiExcludedSuspects ?? []);

  const rawArrestTargets = getArrestTargets(game, secretId);
  const arrestTargets = rawArrestTargets.filter(t =>
    !killedIds.has(t.suspectId) &&
    t.suspectId !== lastFailed &&
    !excluded.has(t.suspectId)
  );

  const scoredTargets = arrestTargets
    .map(t => ({
      ...t,
      crimeAdj: crimeAdjacency(t, killSites),
      score: scoreArrestTarget(t, killSites, cfg),
    }))
    .filter(t => deceasedCount === 0 || t.crimeAdj > 0)
    .sort((a, b) => b.score - a.score);

  const highestScore = scoredTargets.length ? scoredTargets[0].score : 0;
  const shiftMove = getSmartShift(game, cfg);
  const shiftEval = shiftMove ? scoreShiftMove(game, shiftMove, killSites, cfg) : null;
  const investigation = evaluateInspectorPos(game, game.board, killSites);

  const needsReposition = deceasedCount > 0 && (scoredTargets.length === 0 || investigation.crimeArrestCount === 0);
  const shiftHelps = shiftEval != null && (shiftEval.arrestGain > 0 || shiftEval.distGain >= 0.5);

  const pickBestArrest = () => {
    const best = scoredTargets.filter(t => t.score >= highestScore - cfg.noiseLevel * 0.5);
    return pickRandom(best.length ? best : scoredTargets);
  };

  // A) Solve — yeterince emin isek
  if (shouldSolve(game, scoredTargets, cfg, deceasedCount) && scoredTargets.length) {
    const top = scoredTargets[0];
    const disguiseGuess = guessDisguise(game, top.suspectId, killSites, cfg);
    if (disguiseGuess) {
      const { ok, game: next } = applyStandardSolve(game, top.suspectId, disguiseGuess);
      if (ok) return next;
    }
  }

  // B) Çok güçlü sinyal → Arrest
  if (scoredTargets.length > 0) {
    const top = scoredTargets[0];
    const strongSignal = top.crimeAdj > 0 && top.score >= cfg.patternWeight * 0.55 + cfg.adjacencyWeight;
    if (strongSignal && Math.random() < cfg.highScoreArrestP) {
      const t = pickBestArrest();
      if (t) return applyStandardAccuse(game, t.suspectId, game.killer.identitySuspectId, secretId).game;
    }
  }

  // C) Elimde ölü kart varsa → at, el yenile
  const deadInHand = game.inspector.hand.filter(id => killedIds.has(id));
  if (deadInHand.length > 0 && game.evidenceDeck.length > 0) {
    const { ok, game: next } = applyStandardExonerate(game, pickRandom(deadInHand), game.killer.identitySuspectId);
    if (ok) return next;
  }

  // D) Temize çıkarma
  const exonerateChance =
    scoredTargets.length > 0 && scoredTargets[0].crimeAdj > 0
      ? cfg.exonerateP * 0.55
      : cfg.exonerateP * 1.2;
  if (Math.random() < exonerateChance && game.evidenceDeck.length > 0 && game.inspector.hand.length > 0) {
    const liveInHand = game.inspector.hand.filter(id => !killedIds.has(id));
    if (liveInHand.length > 0) {
      const { ok, game: next } = applyStandardExonerate(game, pickRandom(liveInHand), game.killer.identitySuspectId);
      if (ok) return next;
    }
  }

  // E) Konumlanma için kaydır
  if (shiftMove && (needsReposition || shiftHelps)) {
    const shiftChance = needsReposition ? 0.75 : 0.45;
    if (Math.random() < shiftChance) {
      return applyStandardShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
    }
  }

  // F) Orta sinyal → Arrest
  if (scoredTargets.length > 0) {
    const top = scoredTargets[0];
    const moderateSignal = deceasedCount === 0 || (top.crimeAdj > 0 && highestScore > cfg.patternWeight * 0.45);
    if (moderateSignal && Math.random() < cfg.highScoreArrestP * 0.65) {
      const t = pickBestArrest();
      if (t) return applyStandardAccuse(game, t.suspectId, game.killer.identitySuspectId, secretId).game;
    }
  }

  // G) Fallback: kaydır
  if (shiftMove) {
    return applyStandardShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
  }

  // H) Son çare: arrest
  if (arrestTargets.length) {
    const pool = deceasedCount > 0
      ? arrestTargets.filter(t => crimeAdjacency(t, killSites) > 0)
      : arrestTargets;
    if (pool.length) {
      return applyStandardAccuse(game, pickRandom(pool).suspectId, game.killer.identitySuspectId, secretId).game;
    }
  }

  return game;
}
