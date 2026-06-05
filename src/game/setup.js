import { GAME_MODE, PHASE, TURN, KILLER_SETUP_CARDS, INSPECTOR_HAND_SIZE } from './constants.js';
import { buildAlphabeticalLayout, createBoardFromLayout } from './board.js';
import { createEvidenceDeck, shuffle, drawCards } from './deck.js';
import { SUSPECTS } from '../data/suspects.js';

/**
 * @param {'killer' | 'inspector'} humanRole
 */
export function createClassicGame(humanRole) {
  const board = createBoardFromLayout(buildAlphabeticalLayout());
  let deck = shuffle(createEvidenceDeck());

  // Katil 2 kart çeker, birini kimlik olarak seçecek
  const killerDraw = drawCards(deck, KILLER_SETUP_CARDS);
  deck = killerDraw.remaining;

  // Dedektif 4 kart çeker, birini kimlik olarak seçecek
  const inspectorDraw = drawCards(deck, INSPECTOR_HAND_SIZE);
  deck = inspectorDraw.remaining;

  const killer = {
    identitySuspectId: null,       // seçim yapılana kadar null
    hand: killerDraw.drawn,        // 2 kart — seçim ekranında gösterilir
    disguiseCardSuspectId: null,   // kimlik seçimi sonrası belirlenir
  };

  const inspector = {
    secretIdentitySuspectId: null,
    hand: inspectorDraw.drawn,
  };

  // İlk faz: katil kimliğini seçiyor
  const firstPhase = PHASE.KILLER_PICK_IDENTITY;
  const firstActiveSide = humanRole === 'killer' ? 'human' : 'ai';

  return {
    gameMode: GAME_MODE.CLASSIC,
    board,
    phase: firstPhase,
    turn: TURN.KILLER,
    humanRole,
    activeSide: firstActiveSide,

    killer,
    inspector,

    evidenceDeck: deck,
    discardPile: [],
    publicExonerated: [],

    lastShift: null,
    rowColRemovalUsed: false,
    pendingAction: null,
    pendingShift: null,
    pendingExonerateDiscard: null,

    logs: [
      humanRole === 'killer'
        ? 'Oyun başladı. Elindeki 2 karttan gizli kimliğini seç.'
        : 'Oyun başladı. Katil kimliğini seçiyor...',
    ],
    gameOver: false,
    winner: null,
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
