/**
 * Standart mod setup — Resmi "Killer vs. Inspector" kuralları
 *
 * Klasik moddan farkları:
 *  - Killer 2 kart çeker: 1 Identity + 1 Disguise (hand'de tutulur)
 *  - Disguise action: desteden değil, elindeki 2 kart arasında geçiş
 *  - Kill win sayısı: 10 (klasikte 16)
 *  - Solve action: Inspector hem Identity hem Disguise'ı tahmin eder
 *  - Canvas mekanizması: Kill(exonerated) ve Exonerate'de tetiklenir
 */

import { GAME_MODE, PHASE, TURN } from './constants.js';
import { buildAlphabeticalLayout, createBoardFromLayout } from './board.js';
import { createEvidenceDeck, shuffle, drawCards } from './deck.js';
import { SUSPECTS } from '../data/suspects.js';

function suspectName(id) {
  return SUSPECTS.find(s => s.id === id)?.name ?? `#${id}`;
}

export function createStandardGame(humanRole) {
  const board = createBoardFromLayout(buildAlphabeticalLayout());
  let deck = shuffle(createEvidenceDeck());

  // Killer 2 kart çeker: 1 Identity + 1 Disguise
  const killerDraw = drawCards(deck, 2);
  deck = killerDraw.remaining;
  const [killerIdentityId, killerDisguiseId] = killerDraw.drawn;

  // Inspector kartları katil ilk öldürmesini yaptıktan SONRA çekilecek
  // (setupStandard'da çekmiyoruz — actionsStandard advanceTurn'de çekiliyor)

  const killer = {
    identitySuspectId: killerIdentityId,
    disguiseSuspectId: killerDisguiseId, // Standart moda özgü — sabit kılık
    hand: [],                             // Klasik uyum için korunuyor
  };

  const inspector = {
    secretIdentitySuspectId: null,
    hand: [], // Katil ilk öldürmeden sonra doldurulacak
  };

  const killerName = suspectName(killerIdentityId);
  const disguiseName = suspectName(killerDisguiseId);

  return {
    gameMode: GAME_MODE.STANDARD,
    board,
    phase: PHASE.KILLER_FIRST_KILL,
    turn: TURN.KILLER,
    humanRole,
    activeSide: humanRole === 'killer' ? 'human' : 'ai',

    killer,
    inspector,

    evidenceDeck: deck,
    discardPile: [],
    publicExonerated: [],
    positiveKillerCanvases: [],   // killer_answers → dedektif görür
    positiveInspectorCanvases: [], // inspector_answers → katil görür

    lastShift: null,
    pendingAction: null,
    pendingShift: null,
    pendingExonerateDiscard: null,

    // Canvas state — tetiklendiğinde doldurulur
    // { suspectId, isAdjacent: bool }
    // isAdjacent: bilgi vermesi gereken tarafın kimliği bu karta komşu mu?
    pendingCanvas: null,

    logs: [
      humanRole === 'killer'
        ? `Oyun başladı. Kimliğin: <b>${killerName}</b>. Yedek kılığın: <b>${disguiseName}</b>. İlk hamlen: komşunu öldür.`
        : 'Oyun başladı. Katil ilk hamlesini yapıyor...',
    ],
    gameOver: false,
    winner: null,

    killCount: 0,
    killedSuspectIds: [],
    killSites: [],
    aiFailedArrests: {},      // { suspectId: failCount }
    aiExcludedSuspects: [],    // 2 kez başarısız → kalıcı dışla
    arrestFailCount: 0,
    lastArrestedId: null,
    killerCandidates: null,
    disguiseCandidates: null,
    knownInnocentIds: [],     // Dedektifin elinden geçmiş kartlar — kesin katil değil
  };
}
