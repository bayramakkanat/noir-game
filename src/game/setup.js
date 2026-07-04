import { GAME_MODE, PHASE, TURN, INSPECTOR_HAND_SIZE } from './constants.js';
import { buildAlphabeticalLayout, createBoardFromLayout } from './board.js';
import { createEvidenceDeck, shuffle, drawCards } from './deck.js';
import { SUSPECTS } from '../data/suspects.js';

export function createClassicGame(humanRole, difficulty = 'normal') {
  const board = createBoardFromLayout(buildAlphabeticalLayout());
  let deck = shuffle(createEvidenceDeck());

  // Katil 1 kart çeker — direkt kimliği olur, seçim fazı yok
  const killerDraw = drawCards(deck, 1);
  deck = killerDraw.remaining;
  const killerIdentityId = killerDraw.drawn[0];
  const killerName = SUSPECTS.find(s => s.id === killerIdentityId)?.name ?? killerIdentityId;

  // Dedektif 4 kart çeker, birini kimlik olarak seçecek
  const inspectorDraw = drawCards(deck, INSPECTOR_HAND_SIZE);
  deck = inspectorDraw.remaining;

  const killer = {
    identitySuspectId: killerIdentityId,
    hand: [],
    disguiseCardSuspectId: null,
  };

  const inspector = {
    secretIdentitySuspectId: null,
    hand: inspectorDraw.drawn,
  };

  return {
    gameMode: GAME_MODE.CLASSIC,
    difficulty,
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

    lastShift: null,
    pendingAction: null,
    pendingShift: null,
    pendingExonerateDiscard: null,

    logs: [
      humanRole === 'killer'
        ? `Oyun başladı. Kimliğin: <b>${killerName}</b>. Komşunu öldür.`
        : 'Oyun başladı. Katil ilk hamlesini yapıyor...',
    ],
    gameOver: false,
    winner: null,

    killCount: 0,
    killedSuspectIds: [],
    killSites: [],
  };
}

export function getHumanSecrets(game) {
  return {
    killerIdentityId: game.killer.identitySuspectId,
    inspectorSecretId: game.inspector.secretIdentitySuspectId,
    hand: game.inspector.hand,
  };
}

export function getActingSecrets(game) {
  return {
    killerIdentityId: game.killer.identitySuspectId,
    inspectorSecretId: game.inspector.secretIdentitySuspectId,
  };
}
