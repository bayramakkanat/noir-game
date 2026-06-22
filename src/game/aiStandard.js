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
import { shiftRow, shiftColumn, positionOf, getAliveNeighborsOfSuspect, getNeighborsOfSuspect } from './board.js';
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

function scoreArrestTarget(target, killSites, cfg, candidates) {
  const adjacency = crimeAdjacency(target, killSites);
  let pattern = 0;
  if (killSites.length > 0) {
    let totalDist = 0;
    for (const d of killSites) totalDist += chebyshev(target.r, target.c, d.r, d.c);
    pattern = 1 / (totalDist / killSites.length + 0.5);
  }
  const candidateBonus = candidates?.has(target.suspectId)
    ? cfg.adjacencyWeight * 3 + cfg.patternWeight * 2
    : 0;
  const noise = (Math.random() - 0.5) * cfg.noiseLevel;
  return cfg.adjacencyWeight * adjacency + cfg.patternWeight * pattern + candidateBonus + noise;
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

  // Gizlilik (Stealth) Skoru: Kendi etrafındaki masum olmayan canlı komşu sayısı
  const publicExonerated = game.publicExonerated ?? [];
  const aliveNeighborsCount = getAliveNeighborsOfSuspect(board, secretId)
    .filter(n => !publicExonerated.includes(n.cell.suspectId)).length;

  // Avlanma (Hunting) Skoru: Katilin kimliğini %100 biliyorsak, ona olan mesafemiz
  let distToConfirmedKiller = Infinity;
  if (game.killerCandidates && game.killerCandidates.size === 1) {
    const confirmedId = Array.from(game.killerCandidates)[0];
    const confirmedPos = positionOf(board, confirmedId);
    if (confirmedPos) {
      distToConfirmedKiller = chebyshev(pos.r, pos.c, confirmedPos.r, confirmedPos.c);
    }
  }

  return { avgKillDist, crimeArrestCount, aliveNeighborsCount, distToConfirmedKiller };
}

function scoreShiftMove(game, move, killSites, cfg) {
  const tempBoard =
    move.axis === 'row'
      ? shiftRow(game.board, move.index, move.direction)
      : shiftColumn(game.board, move.index, move.direction);

  const before = evaluateInspectorPos(game, game.board, killSites);
  const after  = evaluateInspectorPos(game, tempBoard, killSites);

  let huntingBonus = 0;
  if (after.distToConfirmedKiller < before.distToConfirmedKiller) {
    huntingBonus = -30;
  }
  if (after.distToConfirmedKiller <= 1 && before.distToConfirmedKiller > 1) {
    huntingBonus -= 50;
  }

  const score =
    after.avgKillDist * 2 -
    (after.crimeArrestCount - before.crimeArrestCount) * 5 -
    (after.aliveNeighborsCount - before.aliveNeighborsCount) * 4 +
    huntingBonus -
    (before.avgKillDist - after.avgKillDist) * 3 +
    (Math.random() - 0.5) * cfg.noiseLevel * 0.15;

  return { score, distGain: before.avgKillDist - after.avgKillDist, arrestGain: after.crimeArrestCount - before.crimeArrestCount, huntingBonus };
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
function shouldSolve(game, scoredTargets, cfg, deceasedCount, killerCandidates, disguiseCandidates) {
  if (killerCandidates?.size === 1 && disguiseCandidates?.size === 1 && deceasedCount >= 2 && scoredTargets.length) {
    const top = scoredTargets[0];
    if (top.isCandidate) return true;
  }

  if (deceasedCount < 8) return false;

  if (!scoredTargets.length) return false;
  const top = scoredTargets[0];
  const second = scoredTargets[1];

  const clearLeader = !second || (top.score - second.score) > cfg.patternWeight * 1.2;
  const highConfidence = top.score >= cfg.patternWeight * 1.6 + cfg.adjacencyWeight * 3;

  return clearLeader && highConfidence && Math.random() < 0.15;
}

function guessDisguise(game, guessIdentityId, killSites, cfg, disguiseCandidates) {
  const knownInnocents = new Set(game.knownInnocentIds ?? []);
  const allIds = [
    ...game.board.flat().filter(Boolean).map(c => c.suspectId),
    ...(game.killedSuspectIds ?? []),
  ];
  let candidates = [...new Set(allIds)].filter(id => id !== guessIdentityId && !knownInnocents.has(id));

  if (disguiseCandidates?.size > 0) {
    const narrowed = candidates.filter(id => disguiseCandidates.has(id));
    if (narrowed.length > 0) candidates = narrowed;
  }

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
    const killerIdentityId = game.killer.identitySuspectId;
    const disguiseSuspectId = game.killer.disguiseSuspectId;
    const isDisguiseDead = (game.killedSuspectIds ?? []).includes(disguiseSuspectId);
    const killCountNow = game.killCount ?? 0;
    const killSitesNow = getKillSites(game);

    const allAliveIds = game.board.flat().filter(c => c && c.status === 'alive').map(c => c.suspectId);
    const inspectorCandidates = game.inspectorCandidates ?? new Set(allAliveIds);
    const publicExonerated = game.publicExonerated ?? [];

    const killerPos = positionOf(game.board, killerIdentityId);
    const disguisePos = !isDisguiseDead ? positionOf(game.board, disguiseSuspectId) : null;

    // Örüntü/tehlike skoru: şu anki kimliğin etrafında ne kadar "iz" var
    const currentDeadCount = getNeighborsOfSuspect(game.board, killerIdentityId).filter(n => n.cell.status === 'dead').length;
    const clusterScore = killerPos ? killSitesNow.filter(s =>
      chebyshev(killerPos.r, killerPos.c, s.r, s.c) <= 2
    ).length : 0;

    // Dedektif adayı şu anki kimliğe ne kadar yakın?
    let minInspectorDist = Infinity;
    for (const candId of inspectorCandidates) {
      const cpos = positionOf(game.board, candId);
      if (cpos && killerPos) {
        const d = chebyshev(killerPos.r, killerPos.c, cpos.r, cpos.c);
        if (d < minInspectorDist) minInspectorDist = d;
      }
    }
    const inspectorThreat = minInspectorDist <= 1;
    const inspectorClose  = minInspectorDist <= 2;
    const tightPool       = inspectorCandidates.size <= 3;

    const targets = getKillTargets(game, killerIdentityId).map(t => {
      let score = 0;
      if (inspectorCandidates.has(t.suspectId)) {
        score += inspectorCandidates.size <= 3 ? 1000 : 100;
      }
      if (publicExonerated.includes(t.suspectId)) {
        score += 500;
      }
      const tPos = positionOf(game.board, t.suspectId);
      if (tPos && killSitesNow.length > 0) {
        let minDist = Infinity;
        for (const site of killSitesNow) {
          const d = chebyshev(tPos.r, tPos.c, site.r, site.c);
          if (d < minDist) minDist = d;
        }
        if (minDist === 1) score += 30;
        else if (minDist === 2) score += 15;
        else score -= minDist * 5;
      }

      let inspectorAdjCount = 0;
      for (const candId of inspectorCandidates) {
        const cpos = positionOf(game.board, candId);
        if (cpos && chebyshev(tPos.r, tPos.c, cpos.r, cpos.c) <= 1) {
           inspectorAdjCount++;
        }
      }
      if (inspectorCandidates.size <= 5) {
         score += inspectorAdjCount * 40;
      } else {
         score += inspectorAdjCount * 10;
      }

      score += Math.random() * 15;
      return { ...t, score };
    }).sort((a, b) => b.score - a.score);

    // Kılık değiştirme değerlendirmesi (Artık daha agresif bir saldırı aracı)
    let disguiseScore = 0;
    if (!isDisguiseDead && disguisePos) {
      const disguiseTargets = getKillTargets(game, disguiseSuspectId);
      const disguiseHasInspector = disguiseTargets.some(t => inspectorCandidates.has(t.suspectId));
      const currentHasInspector = targets.some(t => inspectorCandidates.has(t.suspectId));
      
      if (disguiseHasInspector && !currentHasInspector) disguiseScore += 100;
      
      const disguiseDeadCount = getNeighborsOfSuspect(game.board, disguiseSuspectId).filter(n => n.cell.status === 'dead').length;
      if (currentDeadCount >= 2 && disguiseDeadCount < 1) disguiseScore += 50;

      if (inspectorThreat) disguiseScore += 40;
      if (clusterScore >= 2) disguiseScore += 25;
      if (killCountNow > 0 && killCountNow % 4 === 0) disguiseScore += 30;
    }
    disguiseScore += Math.random() * 20;
    const shouldDisguise = !isDisguiseDead && disguiseScore >= 60;

    // Kaydırma değerlendirmesi: dedektiften uzaklaş / örüntüyü dağıt
    const shifts = allShiftMoves(game);
    let bestKillerShift = null;
    let bestKillerShiftScore = -Infinity;
    for (const s of shifts) {
      const tempBoard = s.axis === 'row'
        ? shiftRow(game.board, s.index, s.direction)
        : shiftColumn(game.board, s.index, s.direction);

      const newKillerPos = positionOf(tempBoard, killerIdentityId);
      if (!newKillerPos) continue;

      let newMinDist = Infinity;
      for (const candId of inspectorCandidates) {
        const cpos = positionOf(tempBoard, candId);
        if (cpos) {
          const d = chebyshev(newKillerPos.r, newKillerPos.c, cpos.r, cpos.c);
          if (d < newMinDist) newMinDist = d;
        }
      }
      const baseDist = minInspectorDist === Infinity ? 0 : minInspectorDist;
      const newDist  = newMinDist === Infinity ? 0 : newMinDist;
      const distGain = newDist - baseDist;

      const newCluster = killSitesNow.filter(site =>
        chebyshev(newKillerPos.r, newKillerPos.c, site.r, site.c) <= 2
      ).length;
      const clusterGain = clusterScore - newCluster;

      const shiftScore = distGain * 20 + clusterGain * 12 + (Math.random() - 0.5) * 10;
      if (shiftScore > bestKillerShiftScore) {
        bestKillerShiftScore = shiftScore;
        bestKillerShift = s;
      }
    }
    const shiftWorthIt = bestKillerShift != null && bestKillerShiftScore > 8;

    // KARAR AĞACI

    // 1. Dedektif adayını öldürebiliyorsak vur
    const canKillInspector = targets.some(t => inspectorCandidates.has(t.suspectId));
    if (canKillInspector && (tightPool || Math.random() < 0.8)) {
      const bestScore = targets[0].score;
      const t = targets.find(t => inspectorCandidates.has(t.suspectId) && t.score >= bestScore - 100) || targets.find(t => inspectorCandidates.has(t.suspectId));
      if (t) return applyStandardKill(game, t.suspectId, killerIdentityId, game.inspector.secretIdentitySuspectId).game;
    }

    // 2. Tehdit altındaysak: önce kaç (kılık değiştir veya kaydır)
    if (inspectorThreat) {
      if (shouldDisguise && Math.random() < 0.75) {
        const { ok, game: next } = applyStandardDisguise(game);
        if (ok) return next;
      }
      if (shiftWorthIt && Math.random() < 0.65) {
        return applyStandardShift(game, bestKillerShift.axis, bestKillerShift.index, bestKillerShift.direction).game;
      }
    }

    // 3. Örüntü çok belirginse: kılık değiştir veya kaydır, ama %100 değil (blöf)
    if (clusterScore >= 2 || currentDeadCount >= 2) {
      if (shouldDisguise && Math.random() < 0.60) {
        const { ok, game: next } = applyStandardDisguise(game);
        if (ok) return next;
      }
      if (shiftWorthIt && Math.random() < 0.35) {
        return applyStandardShift(game, bestKillerShift.axis, bestKillerShift.index, bestKillerShift.direction).game;
      }
    }

    // 4. Normal durum: çoğunlukla öldür ama düzenli aralıklarla kılık değiştir/kaydır
    const disguisePriority = shouldDisguise ? 0.22 : 0;
    const shiftPriority    = (!shouldDisguise && shiftWorthIt) ? (0.12 + (inspectorClose ? 0.1 : 0)) : 0;

    const roll = Math.random();
    if (roll < disguisePriority) {
      const { ok, game: next } = applyStandardDisguise(game);
      if (ok) return next;
    } else if (roll < disguisePriority + shiftPriority && bestKillerShift) {
      return applyStandardShift(game, bestKillerShift.axis, bestKillerShift.index, bestKillerShift.direction).game;
    }

    if (targets.length > 0) {
      const bestScore = targets[0].score;
      const bestTargets = targets.filter(t => t.score === bestScore);
      const t = pickRandom(bestTargets);
      return applyStandardKill(game, t.suspectId, killerIdentityId, game.inspector.secretIdentitySuspectId).game;
    }

    if (bestKillerShift) {
      return applyStandardShift(game, bestKillerShift.axis, bestKillerShift.index, bestKillerShift.direction).game;
    }

    if (!isDisguiseDead) {
      const { ok, game: next } = applyStandardDisguise(game);
      if (ok) return next;
    }

    return game;
  }

  // ── Dedektif turu ──
  const secretId = game.inspector.secretIdentitySuspectId;
  const killedIds = new Set(game.killedSuspectIds ?? []);
  const killSites = getKillSites(game);
  const deceasedCount = game.killCount ?? killSites.length;

  const knownInnocents = new Set(game.knownInnocentIds ?? []);
  const killerCandidates = new Set((game.killerCandidates ?? []).filter(id => !killedIds.has(id) && !knownInnocents.has(id)));
  const disguiseCandidates = new Set((game.disguiseCandidates ?? []).filter(id => !killedIds.has(id) && !knownInnocents.has(id)));

  const lastFailed = game.lastArrestedId ?? null;
  const excluded = new Set(game.aiExcludedSuspects ?? []);

  const rawArrestTargets = getArrestTargets(game, secretId);
  const arrestTargets = rawArrestTargets.filter(t =>
    !killedIds.has(t.suspectId) &&
    t.suspectId !== lastFailed &&
    !excluded.has(t.suspectId) &&
    !knownInnocents.has(t.suspectId)
  );

  const isNarrowedDown = killerCandidates.size > 0 && killerCandidates.size <= 4;
  const isVeryNarrowed = killerCandidates.size > 0 && killerCandidates.size <= 2;

  const scoredTargets = arrestTargets
    .map(t => ({
      ...t,
      crimeAdj: crimeAdjacency(t, killSites),
      isCandidate: killerCandidates.has(t.suspectId),
      score: scoreArrestTarget(t, killSites, cfg, killerCandidates),
    }))
    .filter(t => {
      if (isVeryNarrowed && !t.isCandidate) return false;
      return deceasedCount === 0 || t.crimeAdj > 0 || t.isCandidate;
    })
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

  const isMatchPoint = deceasedCount >= STANDARD_KILLER_WIN_DEATH_COUNT - 1;

  if (isMatchPoint || (shouldSolve(game, scoredTargets, cfg, deceasedCount, killerCandidates, disguiseCandidates) && scoredTargets.length)) {
    const identityGuessId = scoredTargets.length > 0
      ? scoredTargets[0].suspectId
      : (Array.from(killerCandidates)[0] || pickRandom(game.board.flat().filter(c => c && c.status === 'alive').map(c => c.suspectId)));

    if (identityGuessId) {
      const disguiseGuess = guessDisguise(game, identityGuessId, killSites, cfg, new Set([...disguiseCandidates].filter(id => id !== identityGuessId)));
      if (disguiseGuess) {
        const { ok, game: next } = applyStandardSolve(game, identityGuessId, disguiseGuess);
        if (ok) return next;
      }
    }
  }

  const arrestStreak = game.consecutiveArrests ?? 0;

  if (scoredTargets.length > 0 && arrestStreak < 2) {
    const top = scoredTargets[0];

    const publicExonerated = game.publicExonerated ?? [];
    const stealthyNeighborsCount = getAliveNeighborsOfSuspect(game.board, top.suspectId)
      .filter(n => !publicExonerated.includes(n.cell.suspectId)).length;
    const isStealthyEnough = stealthyNeighborsCount >= 4 || isVeryNarrowed;

    const isStrongCandidate = top.isCandidate && isVeryNarrowed;
    const strongPattern = top.crimeAdj > 0 && top.score >= cfg.patternWeight * 0.9 + cfg.adjacencyWeight * 1.5;

    const strongSignal = (isStrongCandidate || strongPattern) && isStealthyEnough;

    let currentArrestP = cfg.highScoreArrestP;
    if (killerCandidates.size > 4) {
      currentArrestP = cfg.highScoreArrestP * 0.25;
    } else if (isNarrowedDown) {
      currentArrestP = cfg.highScoreArrestP * 0.45;
    }

    if (strongSignal && Math.random() < currentArrestP) {
      const t = pickBestArrest();
      if (t) return applyStandardAccuse(game, t.suspectId, game.killer.identitySuspectId, secretId).game;
    }
  }

  const deadInHand = game.inspector.hand.filter(id => killedIds.has(id));
  if (deadInHand.length > 0 && game.evidenceDeck.length > 0) {
    const { ok, game: next } = applyStandardExonerate(game, pickRandom(deadInHand), game.killer.identitySuspectId);
    if (ok) return next;
  }

  let exonerateChance = cfg.exonerateP;
  if (arrestStreak >= 2) {
    exonerateChance = 1;
  } else if (killerCandidates.size > 4) {
    exonerateChance = cfg.exonerateP * 1.8;
  } else if (isNarrowedDown) {
    exonerateChance = cfg.exonerateP * 1.5;
  } else if (scoredTargets.length > 0 && scoredTargets[0].crimeAdj > 0) {
    exonerateChance = cfg.exonerateP * 0.55;
  } else {
    exonerateChance = cfg.exonerateP * 1.2;
  }

  if (Math.random() < exonerateChance && game.evidenceDeck.length > 0 && game.inspector.hand.length > 0) {
    const liveInHand = game.inspector.hand.filter(id => !killedIds.has(id));
    if (liveInHand.length > 0) {
      let bestCardId = liveInHand[0];
      let bestInfoScore = -1;

      for (const handId of liveInHand) {
        const aliveNeighbors = getAliveNeighborsOfSuspect(game.board, handId);
        let adjCandidatesCount = 0;
        for (const n of aliveNeighbors) {
          if (killerCandidates.has(n.cell.suspectId)) {
            adjCandidatesCount++;
          }
        }

        const score = Math.min(adjCandidatesCount, killerCandidates.size - adjCandidatesCount);

        if (score > bestInfoScore) {
          bestInfoScore = score;
          bestCardId = handId;
        } else if (score === bestInfoScore && Math.random() < 0.5) {
          bestCardId = handId;
        }
      }

      const { ok, game: next } = applyStandardExonerate(game, bestCardId, game.killer.identitySuspectId);
      if (ok) return next;
    }
  }

  if (shiftMove) {
    let shiftChance = needsReposition ? 0.75 : 0.45;
    if (arrestStreak > 0) shiftChance = 0.95;
    if (shiftHelps) shiftChance += 0.2;

    if (Math.random() < shiftChance) {
      return applyStandardShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
    }
  }

  if (scoredTargets.length > 0 && arrestStreak === 0 && killerCandidates.size <= 4) {
    const top = scoredTargets[0];
    const moderateSignal = deceasedCount === 0 || (top.crimeAdj > 0 && highestScore > cfg.patternWeight * 0.45);

    const publicExonerated = game.publicExonerated ?? [];
    const stealthyNeighborsCount = getAliveNeighborsOfSuspect(game.board, top.suspectId)
      .filter(n => !publicExonerated.includes(n.cell.suspectId)).length;
    const isStealthyEnough = stealthyNeighborsCount >= 4;

    if (moderateSignal && isStealthyEnough && Math.random() < cfg.highScoreArrestP * 0.4) {
      const t = pickBestArrest();
      if (t) return applyStandardAccuse(game, t.suspectId, game.killer.identitySuspectId, secretId).game;
    }
  }

  if (shiftMove) {
    return applyStandardShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
  }

  if (scoredTargets.length && arrestStreak === 0 && Math.random() < 0.1) {
    return applyStandardAccuse(game, pickRandom(scoredTargets).suspectId, game.killer.identitySuspectId, secretId).game;
  }

  return game;
}
