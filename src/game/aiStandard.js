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
  applyStandardPass,
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

// Bir karakteri (örn. masum işaretli bir kartı) öldürmenin dedektif aday havuzunu
// ne kadar iyi böleceğini ölçer. İdeal durum: komdu kümesi mevcut adayların
// yaklaşık yarısını kapsıyorsa (hangi sonuç çıkarsa çıksın havuz ciddi daralır).
// Komdu kümesi boşsa ya da tüm adayları kapsıyorsa, sonuç hemen hemen bilgisizdir.
function killInfoSplitValue(board, suspectId, inspectorCandidates) {
  if (!inspectorCandidates || inspectorCandidates.size === 0) return 0;
  const neighborIds = new Set(getAliveNeighborsOfSuspect(board, suspectId).map((n) => n.cell.suspectId));
  let overlap = 0;
  for (const id of inspectorCandidates) {
    if (neighborIds.has(id)) overlap++;
  }
  const half = inspectorCandidates.size / 2;
  return half - Math.abs(overlap - half); // 0 = bilgisiz, half = mükemmel ikiye bölme
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

  // Avlanma (Hunting) Skoru: Katilin kimliğini daralttıysak (<= 6 aday), onlara olan mesafe
  let distToConfirmedKiller = Infinity;
  let candidateExposure = 0;

  if (game.killerCandidates && game.killerCandidates.length > 0 && game.killerCandidates.length <= 8) {
    for (const candId of game.killerCandidates) {
      const posCand = positionOf(board, candId);
      if (posCand) {
        if (game.killerCandidates.length <= 6) {
          const d = chebyshev(pos.r, pos.c, posCand.r, posCand.c);
          if (d < distToConfirmedKiller) {
            distToConfirmedKiller = d;
          }
        }
        
        // Katili canlıların bol olduğu ve tuzaklı (masum) bölgelere çekme isteği
        const aliveNeighbors = getAliveNeighborsOfSuspect(board, candId);
        candidateExposure += aliveNeighbors.length;
        for (const n of aliveNeighbors) {
          if (publicExonerated.includes(n.cell.suspectId)) {
            candidateExposure += 3; // Masum işaretli kişilere komşu olmak katil için mayın tarlasıdır!
          }
        }
      }
    }
    candidateExposure = candidateExposure / game.killerCandidates.length;
  }

  return { avgKillDist, crimeArrestCount, aliveNeighborsCount, distToConfirmedKiller, candidateExposure };
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
    huntingBonus = -40;
  }
  if (after.distToConfirmedKiller <= 1 && before.distToConfirmedKiller > 1) {
    huntingBonus -= 60;
  }
  
  // Zor modda, eğer katili avlıyorsak (huntingBonus aktifse) gizliliği umursama!
  const isHard = game.difficulty === 'hard';
  let stealthPenalty = (after.aliveNeighborsCount - before.aliveNeighborsCount) * 4;
  if (isHard && (huntingBonus < 0 || (game.killerCandidates && game.killerCandidates.length <= 6))) {
    stealthPenalty = 0; // Avcı modundayken ölülerin arasına girmekten korkma
  }

  // Kendi bulunduğumuz satırı/sütunu kaydırarak katilin yanına gitmek, katile "ben geldim" demektir.
  // Katili kendi güvenli bölgemize çekmek (katilin satır/sütununu kaydırmak) çok daha güvenlidir!
  let exposingPenalty = 0;
  const myPos = positionOf(game.board, game.inspector.secretIdentitySuspectId);
  if (myPos && ((move.axis === 'row' && move.index === myPos.r) || (move.axis === 'col' && move.index === myPos.c))) {
    // Eğer aktif olarak katile yaklaşıyorsak (huntingBonus), kendi yerimizi belli etmek İNTİHARDIR. Asla yapma!
    if (huntingBonus < 0) {
      exposingPenalty = 500; 
    } else {
      exposingPenalty = 50; // Normal durumlarda da kendi yerini değiştirmekten hafifçe kaçın
    }
  }

  const exposureGain = (after.candidateExposure ?? 0) - (before.candidateExposure ?? 0);

  const score =
    after.avgKillDist * 2 -
    (after.crimeArrestCount - before.crimeArrestCount) * 5 -
    stealthPenalty +
    huntingBonus +
    exposingPenalty -
    exposureGain * 5 -
    (before.avgKillDist - after.avgKillDist) * 4 +
    (Math.random() - 0.5) * cfg.noiseLevel * 0.15;

  return { score, distGain: before.avgKillDist - after.avgKillDist, arrestGain: after.crimeArrestCount - before.crimeArrestCount, huntingBonus };
}

function isSameShiftAsLast(game, move) {
  const last = game.lastShift;
  return !!last && last.axis === move.axis && last.index === move.index && last.direction === move.direction;
}

function getSmartShift(game, cfg) {
  const moves = allShiftMoves(game);
  if (!moves.length) return null;
  const killSites = getKillSites(game);
  const scored = moves
    .map((m) => ({ move: m, ...scoreShiftMove(game, m, killSites, cfg) }))
    .sort((a, b) => a.score - b.score);

  // Aynı hamleyi tekrar tekrar seçmekten kaçın — döngüsel kaydırmayı önler.
  const best = scored[0];
  if (best && isSameShiftAsLast(game, best.move)) {
    const tolerance = Math.abs(best.score) * 0.15 + 0.5;
    const alt = scored.find((s) => !isSameShiftAsLast(game, s.move) && s.score <= best.score + tolerance);
    if (alt) return alt.move;
  }

  return best?.move || pickRandom(moves);
}

// ─── Solve kararı ─────────────────────────────────────────────────────────────
function shouldSolve(game, scoredTargets, cfg, deceasedCount, killerCandidates, disguiseCandidates) {
  if (killerCandidates?.size === 1 && disguiseCandidates?.size === 1 && deceasedCount >= 2 && scoredTargets.length) {
    const top = scoredTargets[0];
    if (top.isCandidate) return true;
  }
  
  if (game.difficulty === 'hard' && (killerCandidates?.size > 2)) return false;

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
    
    let score = cfg.adjacencyWeight * adj + cfg.patternWeight * pattern;
    
    // Ölü karakterleri yedek kılık olarak tahmin etme ihtimalini DÜŞÜR.
    // Katiller genellikle kendi yedek kılıklarını öldürmezler (çok nadir bir blöftür).
    const isDead = (game.killedSuspectIds ?? []).includes(id);
    if (isDead) {
      score -= 500; // Ölüleri tahmin etmeyi bırak
    }

    const noise = (Math.random() - 0.5) * cfg.noiseLevel;
    return { id, score: score + noise };
  });

  scored.sort((a, b) => b.score - a.score);
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
    const isHard = game.difficulty === 'hard';
    let chosenId = pickRandom(hand);
    
    if (isHard) {
      const killSites = getKillSites(game);
      const firstKill = killSites[0];
      if (firstKill) {
        const scoredHand = hand.map(id => {
          const pos = positionOf(game.board, id);
          const dist = pos ? chebyshev(pos.r, pos.c, firstKill.r, firstKill.c) : 0;
          return { id, dist };
        }).sort((a, b) => b.dist - a.dist);
        chosenId = scoredHand[0]?.id || chosenId;
      }
    }
    
    return applyStandardInspectorPickIdentity(game, chosenId).game;
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
    const tightPool       = inspectorCandidates.size <= 4;
    // Eğer dedektif havuzu çok genişse (örn. 25 kişi), yanımızdaki kişinin dedektif olma ihtimali çok düşüktür.
    // Bu yüzden sadece havuz daraldığında (<=4) paniğe kapılıp "tehdit (threat)" algılamalıyız.
    const inspectorThreat = minInspectorDist <= 1 && tightPool;
    const inspectorClose  = minInspectorDist <= 2 && inspectorCandidates.size <= 8;

    // Dedektif bizim kimliğimizi matematiksel olarak (hançer uzaklıkları ile) çözdü mü?
    const exposedThreat = game.killerCandidates && game.killerCandidates.length <= 3;

    const targets = getKillTargets(game, killerIdentityId).map(t => {
      let score = 0;
      if (inspectorCandidates.has(t.suspectId)) {
        score += inspectorCandidates.size <= 3 ? 1000 : 100;
      }

      const tPos = positionOf(game.board, t.suspectId);
      
      let inspectorAdjCount = 0;
      for (const candId of inspectorCandidates) {
        const cpos = positionOf(game.board, candId);
        if (cpos && tPos && chebyshev(tPos.r, tPos.c, cpos.r, cpos.c) <= 1) {
           inspectorAdjCount++;
        }
      }

      if (publicExonerated.includes(t.suspectId)) {
        if (inspectorAdjCount > 0) {
          // Bu masumu öldürmek bize dedektifin yeri hakkında taze bilgi (silüet) verecek!
          score += 500; 
        } else {
          // Bu masumun etrafındaki herkes zaten adaylıktan elenmiş. Buradan yeni bilgi çıkmaz.
          score += 50; 
        }
      }

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

      if (t.suspectId === disguiseSuspectId) {
        if (inspectorCandidates.size > 4 && killCountNow < 7) {
          score -= 500; // Erken aşamada kılığını öldürmek intihardır, yapma!
        } else {
          // Oyun sonuna doğru veya dedektif yaklaştığında, kılığını öldürüp kafa karıştırmak (blöf) mantıklı olabilir.
          score -= 30; 
        }
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
      if (exposedThreat) disguiseScore += 100; // DEŞİFRE OLDUM! KESİNLİKLE KAÇMAM LAZIM!
      if (clusterScore >= 2) disguiseScore += 25;
      if (killCountNow > 0 && killCountNow % 4 === 0) disguiseScore += 30;
      
      // Eğer köşedeysek (etrafımızda az hedef varsa) kılık değiştirmek daha caziptir
      if (targets.length <= 4) {
        disguiseScore += (5 - targets.length) * 10;
      }
    }
    disguiseScore += Math.random() * 20;
    const shouldDisguise = !isDisguiseDead && disguiseScore >= 60;

    // Kaydırma değerlendirmesi: dedektiften uzaklaş / örüntüyü dağıt
    const shifts = allShiftMoves(game);
    let bestKillerShift = null;
    let bestKillerShiftScore = -Infinity;
    
    // Rastgele kafa karıştırıcı (blöf) kaydırma ihtimali (%25)
    let bluffSuspectId = null;
    if (Math.random() < 0.25) {
       bluffSuspectId = pickRandom(allAliveIds);
    }
    
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

      let shiftScore = distGain * 20 + clusterGain * 12 + (Math.random() - 0.5) * 10;

      // Masum işaretli (henüz öldürülmemiş) bir karakteri, öldürüldüğünde dedektif
      // aday havuzunu iyi bölecek bir konuma getirmek için pozisyon avantajı ara.
      // Böylece katil o karakteri hemen orada öldürmek yerine, önce daha bilgilendirici
      // bir noktaya taşımayı tercih edebiliyor.
      let huntExoneratedBonus = 0;
      for (const exId of publicExonerated) {
        if ((game.killedSuspectIds ?? []).includes(exId)) continue;
        const exPosAfter = positionOf(tempBoard, exId);
        if (!exPosAfter) continue;
        if (chebyshev(newKillerPos.r, newKillerPos.c, exPosAfter.r, exPosAfter.c) === 1) {
          const splitValue = killInfoSplitValue(tempBoard, exId, inspectorCandidates);
          huntExoneratedBonus = Math.max(huntExoneratedBonus, splitValue * 8);
        }
      }
      shiftScore += huntExoneratedBonus;
      
      // Kılık değiştirme planımız varsa, yedek kılığı merkeze çekmek harika bir hamledir
      if (shouldDisguise && !isDisguiseDead && disguisePos) {
        const newDisguisePos = positionOf(tempBoard, disguiseSuspectId);
        if (newDisguisePos) {
          const oldCenterDist = Math.abs(disguisePos.r - 2) + Math.abs(disguisePos.c - 2);
          const newCenterDist = Math.abs(newDisguisePos.r - 2) + Math.abs(newDisguisePos.c - 2);
          shiftScore += (oldCenterDist - newCenterDist) * 15;
        }
      } else if (bluffSuspectId) {
        // Blöf yapıyorsak, tamamen alakasız bir karakteri merkeze çekip dedektifi kandıralım!
        const oldBluffPos = positionOf(game.board, bluffSuspectId);
        const newBluffPos = positionOf(tempBoard, bluffSuspectId);
        if (oldBluffPos && newBluffPos) {
          const oldCenterDist = Math.abs(oldBluffPos.r - 2) + Math.abs(oldBluffPos.c - 2);
          const newCenterDist = Math.abs(newBluffPos.r - 2) + Math.abs(newBluffPos.c - 2);
          shiftScore += (oldCenterDist - newCenterDist) * 12; // Kendi kimliğimiz gibi puanla
        }
      } else if (targets.length <= 4 && killerPos) {
        // Şu anki kimliğimiz köşedeyse (hedefimiz azsa) ve blöf yapmıyorsak, merkeze doğru kaymak iyidir
        const oldCenterDist = Math.abs(killerPos.r - 2) + Math.abs(killerPos.c - 2);
        const newCenterDist = Math.abs(newKillerPos.r - 2) + Math.abs(newKillerPos.c - 2);
        shiftScore += (oldCenterDist - newCenterDist) * 10;
      }

      if (shiftScore > bestKillerShiftScore) {
        bestKillerShiftScore = shiftScore;
        bestKillerShift = s;
      }
    }
    const shiftWorthIt = bestKillerShift != null && bestKillerShiftScore > 8;

    // KARAR AĞACI

    const canKillInspector = targets.some(t => inspectorCandidates.has(t.suspectId));
    const isHard = game.difficulty === 'hard';
    const killGambleChance = isHard ? 1.0 / inspectorCandidates.size : 0.8;
    const shouldGamble = inspectorCandidates.size <= 2 || Math.random() < killGambleChance;

    if (canKillInspector && shouldGamble) {
      const bestScore = targets[0].score;
      const t = targets.find(t => inspectorCandidates.has(t.suspectId) && t.score >= bestScore - 100) || targets.find(t => inspectorCandidates.has(t.suspectId));
      if (t) return applyStandardKill(game, t.suspectId, killerIdentityId, game.inspector.secretIdentitySuspectId).game;
    }

    // 2. Tehdit altındaysak veya Deşifre olduysak: önce kaç (kılık değiştir veya kaydır)
    if (inspectorThreat || exposedThreat) {
      if (shouldDisguise && Math.random() < 0.75) {
        const { ok, game: next } = applyStandardDisguise(game);
        if (ok) return next;
      }
      if (shiftWorthIt && Math.random() < 0.65) {
        return applyStandardShift(game, bestKillerShift.axis, bestKillerShift.index, bestKillerShift.direction).game;
      }
    }

    // 3. Örüntü çok belirginse: kılık değiştir veya kaydır
    if (clusterScore >= 2 || currentDeadCount >= 2) {
      const forceEscape = isHard ? 1.0 : 0.60;
      if (shouldDisguise && Math.random() < forceEscape) {
        const { ok, game: next } = applyStandardDisguise(game);
        if (ok) return next;
      }
      const forceShift = isHard ? 1.0 : 0.35;
      if (shiftWorthIt && Math.random() < forceShift) {
        return applyStandardShift(game, bestKillerShift.axis, bestKillerShift.index, bestKillerShift.direction).game;
      }
      if (isHard && shifts.length > 0) {
        // Zor modda hala kaçamadıysa rastgele kaydırarak kaç
        const s = pickRandom(shifts);
        return applyStandardShift(game, s.axis, s.index, s.direction).game;
      }
    }

    // 4. Avlanma veya Stratejik Pozisyon Alma (Çok İyi Bir Kaydırma Fırsatı)
    // Eğer yanımızda öldürecek çok değerli biri (hedef puanı >= 400) yoksa, 
    // ama tahtayı kaydırarak bize harika bir ipucu verecek birini (veya çok iyi bir pozisyonu) 
    // yanımıza çekebiliyorsak (shiftScore >= 20), o zaman kesinlikle kaydır!
    const bestTargetScore = targets.length > 0 ? targets[0].score : 0;
    if (bestKillerShift && bestKillerShiftScore >= 20 && bestTargetScore < 400) {
      if (Math.random() < 0.85) { // %85 ihtimalle bu harika kaydırmayı yap
        return applyStandardShift(game, bestKillerShift.axis, bestKillerShift.index, bestKillerShift.direction).game;
      }
    }

    // 5. Normal durum: çoğunlukla öldür ama düzenli aralıklarla kılık değiştir/kaydır
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

    // Gerçekten hiçbir hamle mümkün değilse (öldürme yok, kaydırma yok, disguise
    // yok/ölmüş): oyunun katil tarafında kilitlenmemesi için turu güvenle geç.
    return applyStandardPass(game).game;
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

  // Katilin bir sonraki turda cinayet işleme ihtimali var mı?
  // Eğer tüm katil adaylarının etrafı tamamen cesetlerle kaplıysa (hiç canlı komşuları yoksa),
  // katil istese de cinayet işleyemez ve mecburen kaydırma/kılık değiştirme yapacaktır.
  let killerCanKill = false;
  for (const candId of killerCandidates) {
    const aliveNeighbors = getAliveNeighborsOfSuspect(game.board, candId);
    if (aliveNeighbors.length > 0) {
      killerCanKill = true;
      break;
    }
  }

  // Maç puanı: Katil 8 cinayete ulaştıysa VE bir sonraki turda cinayet işleyebilecek durumdaysa!
  // Eğer katil köşeye sıkıştıysa (etrafı ölülerle doluysa), dedektif paniğe kapılıp rastgele Solve YAPMAMALIDIR.
  const isMatchPoint = deceasedCount >= STANDARD_KILLER_WIN_DEATH_COUNT - 1 && killerCanKill;

  if (isMatchPoint) {
    // Maç sayısı: katil bir sonraki turda neredeyse kesin kazanacak. Dedektif
    // MUTLAKA kararlı bir hamle yapmalı. Öncelik sırası:
    //  1) Güvenli tutuklama — yanlış çıksa bile oyun bitmez, tur devam eder.
    //  2) Solve — sadece net bir tutuklama adayı yoksa ya da kimlik+kılık zaten
    //     tam olarak daralmışsa (bu durumda solve zaten neredeyse garanti doğru).
    //     Solve yanlış çıkarsa oyun anında biter, bu yüzden son çare olarak kullanılır.
    const confidentTop = scoredTargets.length > 0 ? scoredTargets[0] : null;
    const hasConfidentArrest =
      confidentTop &&
      confidentTop.isCandidate &&
      (isVeryNarrowed || confidentTop.score >= cfg.patternWeight * 1.2);

    if (hasConfidentArrest) {
      const { ok, game: next } = applyStandardAccuse(game, confidentTop.suspectId, game.killer.identitySuspectId, secretId);
      if (ok) return next;
    }

    const identityGuessId =
      confidentTop?.suspectId ??
      Array.from(killerCandidates)[0] ??
      pickRandom(game.board.flat().filter(c => c && c.status === 'alive').map(c => c.suspectId));

    if (identityGuessId) {
      const disguiseGuess = guessDisguise(game, identityGuessId, killSites, cfg, new Set([...disguiseCandidates].filter(id => id !== identityGuessId)));
      if (disguiseGuess) {
        const { ok, game: next } = applyStandardSolve(game, identityGuessId, disguiseGuess);
        if (ok) return next;
      }
    }
  } else if (shouldSolve(game, scoredTargets, cfg, deceasedCount, killerCandidates, disguiseCandidates) && scoredTargets.length) {
    const identityGuessId = scoredTargets[0].suspectId;
    const disguiseGuess = guessDisguise(game, identityGuessId, killSites, cfg, new Set([...disguiseCandidates].filter(id => id !== identityGuessId)));
    if (disguiseGuess) {
      const { ok, game: next } = applyStandardSolve(game, identityGuessId, disguiseGuess);
      if (ok) return next;
    }
  }

  const arrestStreak = game.consecutiveArrests ?? 0;

  if (scoredTargets.length > 0 && arrestStreak < 2) {
    const top = scoredTargets[0];

    const publicExonerated = game.publicExonerated ?? [];
    const stealthyNeighborsCount = getAliveNeighborsOfSuspect(game.board, top.suspectId)
      .filter(n => !publicExonerated.includes(n.cell.suspectId)).length;

    const inspectorPos = positionOf(game.board, secretId);
    let isInMortalDanger = false;
    if (inspectorPos && killerCandidates.size > 0 && killerCandidates.size <= 4) {
      for (const candId of killerCandidates) {
        const cpos = positionOf(game.board, candId);
        if (cpos && chebyshev(inspectorPos.r, inspectorPos.c, cpos.r, cpos.c) <= 1) {
          isInMortalDanger = true;
          break;
        }
      }
    }

    const isStealthyEnough = stealthyNeighborsCount >= 4 || isVeryNarrowed || isInMortalDanger;

    const isStrongCandidate = top.isCandidate && isVeryNarrowed;
    const strongPattern = top.crimeAdj > 0 && top.score >= cfg.patternWeight * 0.9 + cfg.adjacencyWeight * 1.5;

    const strongSignal = (isStrongCandidate || strongPattern || (isInMortalDanger && top.isCandidate)) && isStealthyEnough;

    const isStrictDeduction = game.difficulty === 'hard';

    let currentArrestP = cfg.highScoreArrestP;
    if (isStrictDeduction && !isVeryNarrowed) {
      currentArrestP = 0;
    } else if (isVeryNarrowed) {
      currentArrestP = 1.0;
    } else if (isInMortalDanger) {
      currentArrestP = 0.85;
    } else if (killerCandidates.size > 4) {
      currentArrestP = cfg.highScoreArrestP * 0.25;
    } else if (isNarrowedDown) {
      currentArrestP = cfg.highScoreArrestP * 0.45;
    }

    if (strongSignal && Math.random() < currentArrestP) {
      const t = pickBestArrest();
      if (t) return applyStandardAccuse(game, t.suspectId, game.killer.identitySuspectId, secretId).game;
    }
  }



  // Katil kazanmaya yaklaştıysa (5+ cinayet) ve adayları daralttıysak (<=6), ama hiçbirine komşu değilsek:
  // Masum işaretlemekle (Exonerate) vakit KAYBEDEMEYİZ! Acilen tahtayı kaydırıp onları yanımıza çekmeliyiz!
  let isPanicHunting = false;
  if (deceasedCount >= 5 && killerCandidates.size > 0 && killerCandidates.size <= 6) {
    let adjacentToAnyCandidate = false;
    const myPos = positionOf(game.board, secretId);
    if (myPos) {
      for (const candId of killerCandidates) {
        const cpos = positionOf(game.board, candId);
        if (cpos && chebyshev(myPos.r, myPos.c, cpos.r, cpos.c) <= 1) {
          adjacentToAnyCandidate = true;
          break;
        }
      }
    }
    if (!adjacentToAnyCandidate) {
      isPanicHunting = true;
    }
  }

  if (isPanicHunting && shiftMove) {
    return applyStandardShift(game, shiftMove.axis, shiftMove.index, shiftMove.direction).game;
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

      // Zor modda: Eğer elimizdeki hiçbir kart katil adaylarına komşu değilse (bestInfoScore === 0)
      // ve tahtayı kaydırabiliyorsak, Exonerate'i boşa harcamak yerine önce kaydırmayı tercih edelim!
      const isHard = game.difficulty === 'hard';
      const wasteExonerate = isHard && bestInfoScore === 0 && killerCandidates.size < 20;

      if (!wasteExonerate) {
        const { ok, game: next } = applyStandardExonerate(game, bestCardId, game.killer.identitySuspectId);
        if (ok) return next;
      }
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

  const isStrictDeduction = game.difficulty === 'hard';

  if (!isStrictDeduction && scoredTargets.length > 0 && arrestStreak === 0 && killerCandidates.size <= 4) {
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

  if (!isStrictDeduction && scoredTargets.length && arrestStreak === 0 && Math.random() < 0.1) {
    return applyStandardAccuse(game, pickRandom(scoredTargets).suspectId, game.killer.identitySuspectId, secretId).game;
  }

  // Eğer yukarıdaki hiçbir mantıklı hamleyi yapamadıysak ve elimizde ölü kartlar varsa,
  // en son çare olarak bu ölü kartları çöpe atıp elimizi yenileyelim. (Asla öncelikli yapma!)
  const deadInHand = game.inspector.hand.filter(id => killedIds.has(id));
  if (deadInHand.length > 0 && game.evidenceDeck.length > 0) {
    const { ok, game: next } = applyStandardExonerate(game, pickRandom(deadInHand), game.killer.identitySuspectId);
    if (ok) return next;
  }

  // Bütün elimizdeki kartlar ölüyse ve deste bitmişse mecburen pas geçeriz.
  return applyStandardPass(game).game;
}
