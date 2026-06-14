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
  // killerCandidates dışarıdan (game üzerinden) de alınabilir ama doğrudan game object'inde mevcutsa oradan alıyoruz
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
    huntingBonus = -30; // Katile yaklaşıyorsa devasa bonus
  }
  if (after.distToConfirmedKiller <= 1 && before.distToConfirmedKiller > 1) {
    huntingBonus -= 50; // Katilin dibine giriyorsa (tutuklama pozisyonu) inanılmaz bir bonus!
  }

  const score =
    after.avgKillDist * 2 -
    (after.crimeArrestCount - before.crimeArrestCount) * 5 -
    (after.aliveNeighborsCount - before.aliveNeighborsCount) * 4 + // Gizliliğe (Stealth) yüksek önem ver, köşelerden kaç!
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
// AI Inspector, belirli koşullarda Solve hamlesi yapar.
// Klasik modda Inspector kazanmak için Arrest yeterlidir.
// Standart modda Solve = hem Identity hem Disguise doğru tahmin.
// AI bunu sadece çok yüksek güven ile yapar — yoksa yanlış tahmin = oyun biter.
function shouldSolve(game, scoredTargets, cfg, deceasedCount, killerCandidates, disguiseCandidates) {
  // Şüpheli kümesi tek kişiye düştüyse ve kılık (disguise) da tek kişiye düştüyse %100 emindir, hemen çözer
  if (killerCandidates?.size === 1 && disguiseCandidates?.size === 1 && deceasedCount >= 2 && scoredTargets.length) {
    const top = scoredTargets[0];
    if (top.isCandidate) return true;
  }

  // Sadece kimliği biliyor ama kılığı bilmiyorsa, maç sonuna kadar asla "Çöz" (Solve) atarak kumar oynamasın!
  // Çöz hamlesinde ikisini de bilmek zorunda. Sadece birini biliyorsa gidip "Tutukla" (Arrest) yapmalı.
  if (deceasedCount < 8) return false;

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
// disguiseCandidates daral mışsa (Disguise hamlelerinden kesişimle), öncelik ona verilir.
function guessDisguise(game, guessIdentityId, killSites, cfg, disguiseCandidates) {
  const knownInnocents = new Set(game.knownInnocentIds ?? []);
  const allIds = [
    ...game.board.flat().filter(Boolean).map(c => c.suspectId),
    ...(game.killedSuspectIds ?? []),
  ];
  let candidates = [...new Set(allIds)].filter(id => id !== guessIdentityId && !knownInnocents.has(id));

  // Eğer disguise için daraltılmış bir küme varsa ve guessIdentityId dışında elemanı varsa, ona daralt
  if (disguiseCandidates?.size > 0) {
    const narrowed = candidates.filter(id => disguiseCandidates.has(id));
    if (narrowed.length > 0) candidates = narrowed;
  }

  // En düşük puanlı (en az şüpheli) adayı seç — katil kılığı saf görünür
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
    const killerIdentityId = game.killer.identitySuspectId;
    const disguiseSuspectId = game.killer.disguiseSuspectId;
    const isDisguiseDead = (game.killedSuspectIds ?? []).includes(disguiseSuspectId);
    
    // Dedektif adayları
    const allAliveIds = game.board.flat().filter(c => c && c.status === 'alive').map(c => c.suspectId);
    const inspectorCandidates = game.inspectorCandidates ?? new Set(allAliveIds);
    const publicExonerated = game.publicExonerated ?? [];
    
    // Hedefleri puanla
    const targets = getKillTargets(game, killerIdentityId).map(t => {
      let score = 0;
      if (inspectorCandidates.has(t.suspectId)) {
        // Eğer bu kişi dedektif adayıysa ve aday havuzu çok küçükse (örneğin <=3), DEVASA puan!
        score += inspectorCandidates.size <= 3 ? 1000 : 100;
      }
      if (publicExonerated.includes(t.suspectId)) {
        // Masumları öldürmek rozet (badge) kontrolü tetikler ve dedektifin yerini ele verir
        score += 500;
      }
      return { ...t, score };
    }).sort((a, b) => b.score - a.score);

    // Kılık Değiştirme (Disguise) Değerlendirmesi
    let shouldDisguise = false;
    if (!isDisguiseDead) {
      // 1. Eğer Disguise kimliğinin etrafında bir "Dedektif Adayı" varsa ve şu anki kimliğimizin yoksa
      const disguiseTargets = getKillTargets(game, disguiseSuspectId);
      const disguiseHasInspector = disguiseTargets.some(t => inspectorCandidates.has(t.suspectId));
      const currentHasInspector = targets.some(t => inspectorCandidates.has(t.suspectId));
      
      if (disguiseHasInspector && !currentHasInspector && inspectorCandidates.size <= 3) {
        shouldDisguise = true; // Oyunu kazanma şansı var!
      }
      
      // 2. Eğer şu anki kimliğimizin etrafı ceset kaynıyorsa (Dikkat çekiyorsak) ve yedek kılığımız daha temizse
      const currentDeadCount = getNeighborsOfSuspect(game.board, killerIdentityId).filter(n => n.cell.status === 'dead').length;
      const disguiseDeadCount = getNeighborsOfSuspect(game.board, disguiseSuspectId).filter(n => n.cell.status === 'dead').length;
      
      if (currentDeadCount >= 3 && disguiseDeadCount < 2) {
        shouldDisguise = true; // Kaçış!
      }
    }

    // Karar Ağacı
    if (shouldDisguise && Math.random() < 0.8) {
      const { ok, game: next } = applyStandardDisguise(game);
      if (ok) return next;
    }

    // Yüksek puanlı hedef varsa öldür
    if (targets.length > 0) {
      const bestScore = targets[0].score;
      if (bestScore > 0 || Math.random() < 0.6) {
        const bestTargets = targets.filter(t => t.score === bestScore);
        const t = pickRandom(bestTargets);
        return applyStandardKill(game, t.suspectId, killerIdentityId, game.inspector.secretIdentitySuspectId).game;
      }
    }

    // Kaydır (Avlanma veya Kaçış)
    const shifts = allShiftMoves(game);
    if (shifts.length > 0 && Math.random() < 0.7) {
      // Akıllı kaydırma: Eğer dedektifin yerini daralttıysak ona yaklaş, yoksa rastgele kaydır
      let bestShift = null;
      let bestShiftScore = -Infinity;
      
      if (inspectorCandidates.size <= 3) {
        for (const s of shifts) {
          const tempBoard = s.axis === 'row' 
            ? shiftRow(game.board, s.index, s.direction)
            : shiftColumn(game.board, s.index, s.direction);
            
          const currentPos = positionOf(tempBoard, killerIdentityId);
          if (!currentPos) continue;
          
          let shiftScore = 0;
          for (const candId of inspectorCandidates) {
            const candPos = positionOf(tempBoard, candId);
            if (candPos) {
              const dist = chebyshev(currentPos.r, currentPos.c, candPos.r, candPos.c);
              if (dist <= 1) shiftScore += 100; // Dibine girdik!
              else shiftScore -= dist * 10; // Yaklaşmaya çalış
            }
          }
          if (shiftScore > bestShiftScore) {
            bestShiftScore = shiftScore;
            bestShift = s;
          }
        }
      }
      
      const s = bestShift || pickRandom(shifts);
      return applyStandardShift(game, s.axis, s.index, s.direction).game;
    }

    // Fallback öldür
    if (targets.length > 0) {
      const t = pickRandom(targets);
      return applyStandardKill(game, t.suspectId, killerIdentityId, game.inspector.secretIdentitySuspectId).game;
    }
    
    // Hiçbir şey yapamazsa (etrafında adam yok, kaydırma da yapmıyor) Kılık değiştirsin
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

  // Önceki cinayetlerden kesişimle elde edilen şüpheli kümesi (her zaman ölü kişiler filtrelenir)
  // + Dedektifin elinden geçmiş kartlar kesin masum olduğu için kümeden çıkarılır.
  const knownInnocents = new Set(game.knownInnocentIds ?? []);
  const killerCandidates = new Set((game.killerCandidates ?? []).filter(id => !killedIds.has(id) && !knownInnocents.has(id)));
  const disguiseCandidates = new Set((game.disguiseCandidates ?? []).filter(id => !killedIds.has(id) && !knownInnocents.has(id)));

  // Son başarısız tutuklama + kalıcı dışlananlar
  const lastFailed = game.lastArrestedId ?? null;
  const excluded = new Set(game.aiExcludedSuspects ?? []);

  const rawArrestTargets = getArrestTargets(game, secretId);
  const arrestTargets = rawArrestTargets.filter(t =>
    !killedIds.has(t.suspectId) &&
    t.suspectId !== lastFailed &&
    !excluded.has(t.suspectId) &&
    !knownInnocents.has(t.suspectId) // kesin masum — tutuklamak anlamsız
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
      // Eğer aday havuzu 1 veya 2 kişiye kadar düştüyse (çok yüksek eminlik),
      // asla ama asla aday olmayan alakasız bir karaktere "pattern" üzerinden saldırmasın!
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

  // A) Solve — yeterince emin isek veya ÖLÜM KALIM (Match Point) anındaysak
  const isMatchPoint = deceasedCount >= STANDARD_KILLER_WIN_DEATH_COUNT - 1;
  
  if (isMatchPoint || (shouldSolve(game, scoredTargets, cfg, deceasedCount, killerCandidates, disguiseCandidates) && scoredTargets.length)) {
    // Match Point ise elindeki en iyi adayı seçmek zorunda (boş geçemez). Değilse normal hedefini alır.
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

  // B) Çok güçlü sinyal → Arrest (art arda 2 tutuklamadan sonra önce bilgi topla)
  const arrestStreak = game.consecutiveArrests ?? 0;
  
  if (scoredTargets.length > 0 && arrestStreak < 2) {
    const top = scoredTargets[0];
    
    // Gizlilik Kontrolü (Stealth): Eğer hedef tahtanın kenarındaysa veya etrafı ölülerle doluysa,
    // dedektif tutuklama yaptığında kendi yerini 1-2 kişiye düşürür (kabak gibi ortaya çıkar).
    // DÜZELTME: Temize çıkarılmış (Masum) karakterler dedektif olamayacağı için onları da sayma!
    const publicExonerated = game.publicExonerated ?? [];
    const stealthyNeighborsCount = getAliveNeighborsOfSuspect(game.board, top.suspectId)
      .filter(n => !publicExonerated.includes(n.cell.suspectId)).length;
    const isStealthyEnough = stealthyNeighborsCount >= 4 || isVeryNarrowed;

    // Birinin sadece "katil adayı" olması yeterli değildir, çünkü erken oyunda 8-9 aday olabilir.
    // Aday havuzu 2'ye veya 1'e düştüğünde ancak "güçlü sinyal" sayılır.
    const isStrongCandidate = top.isCandidate && isVeryNarrowed;
    const strongPattern = top.crimeAdj > 0 && top.score >= cfg.patternWeight * 0.9 + cfg.adjacencyWeight * 1.5;
    
    const strongSignal = (isStrongCandidate || strongPattern) && isStealthyEnough;
    
    // Katili daralttıysa her şeyi hemen belli etmemek için tutuklama ihtimalini düşür
    let currentArrestP = cfg.highScoreArrestP;
    if (killerCandidates.size > 4) {
      // Hala çok fazla aday varsa gereksiz tutuklama yapıp kendini asla ele verme
      currentArrestP = isVeryNarrowed ? 0.25 : 0.0; 
    } else if (isNarrowedDown) {
      currentArrestP = cfg.highScoreArrestP * 0.45;
    }

    if (strongSignal && Math.random() < currentArrestP) {
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

  // D) Temize çıkarma (Bilgi Toplama / Tarama)
  let exonerateChance = cfg.exonerateP;
  if (arrestStreak >= 2) {
    exonerateChance = 1;
  } else if (killerCandidates.size > 4) {
    // Katili henüz tam daraltamadıysa, ölü sayısından BAĞIMSIZ olarak kılıç (tehdit) arayışına agresif devam et
    exonerateChance = cfg.exonerateP * 1.8; 
  } else if (isNarrowedDown) {
    exonerateChance = cfg.exonerateP * 1.5; // Daraltılmışsa yine çok kullanıp blöf yapsın
  } else if (scoredTargets.length > 0 && scoredTargets[0].crimeAdj > 0) {
    exonerateChance = cfg.exonerateP * 0.55;
  } else {
    exonerateChance = cfg.exonerateP * 1.2;
  }

  // Şans tutarsa temize çıkarma hamlesini uygula
  if (Math.random() < exonerateChance && game.evidenceDeck.length > 0 && game.inspector.hand.length > 0) {
    const liveInHand = game.inspector.hand.filter(id => !killedIds.has(id));
    if (liveInHand.length > 0) {
      // Akıllı Temize Çıkarma (Smart Exonerate): Aday havuzunu en iyi bölecek kartı seç (Binary Search)
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
        
        // En iyi senaryo, adayların yarısının kapsanmasıdır. Kılıç çıksa da çıkmasa da havuz daralır.
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

  // E) Konumlanma için kaydır (Arrest yaptıysa kesinlikle kaçmalı!)
  if (shiftMove) {
    // Eğer yakın zamanda tutuklama yaptıysa yerini belli etmiştir, acilen kaydırıp izini kaybettirmeli
    let shiftChance = needsReposition ? 0.75 : 0.45;
    if (arrestStreak > 0) shiftChance = 0.95; // Tutuklamadan sonra kaçış önceliği
    if (shiftHelps) shiftChance += 0.2;

    if (Math.random() < shiftChance) {
      return applyStandardShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
    }
  }

  // F) Orta sinyal → Arrest
  // Tutuklama serisi varken orta sinyale hiç girme, yerini belli etme
  if (scoredTargets.length > 0 && arrestStreak === 0 && killerCandidates.size <= 4) {
    const top = scoredTargets[0];
    const moderateSignal = deceasedCount === 0 || (top.crimeAdj > 0 && highestScore > cfg.patternWeight * 0.45);
    
    // Gizlilik Kontrolü: Ortada kabak gibi kalmamak için etrafında yeterince "gizlenebilecek" (masum olmayan) canlı komşu yoksa tutuklamayı reddet
    const publicExonerated = game.publicExonerated ?? [];
    const stealthyNeighborsCount = getAliveNeighborsOfSuspect(game.board, top.suspectId)
      .filter(n => !publicExonerated.includes(n.cell.suspectId)).length;
    const isStealthyEnough = stealthyNeighborsCount >= 4;

    // Orta sinyalde tutuklama ihtimalini düşürdük ki gereksiz risk almasın
    if (moderateSignal && isStealthyEnough && Math.random() < cfg.highScoreArrestP * 0.4) {
      const t = pickBestArrest();
      if (t) return applyStandardAccuse(game, t.suspectId, game.killer.identitySuspectId, secretId).game;
    }
  }

  // G) Fallback: kaydır
  if (shiftMove) {
    return applyStandardShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
  }

  // H) Son çare: arrest (Rastgele tutuklama dedektifin yerini kabak gibi belli eder, bu yüzden çok kısıtlandı)
  if (scoredTargets.length && arrestStreak === 0 && Math.random() < 0.1) {
    return applyStandardAccuse(game, pickRandom(scoredTargets).suspectId, game.killer.identitySuspectId, secretId).game;
  }

  return game;
}
