import { useState, useCallback, useEffect, useRef } from 'react';
import { createClassicGame } from '../game/setup.js';
import { createStandardGame } from '../game/setupStandard.js';
import { GAME_MODE, PHASE } from '../game/constants.js';
import {
  applyKill,
  applyArrest,
  applyExonerate,
  applyDisguise,
  applyShift,
  applyInspectorPickIdentity,
} from '../game/actions.js';
import {
  applyStandardKill,
  applyStandardAccuse,
  applyStandardExonerate,
  applyStandardDisguise,
  applyStandardShift,
  applyStandardInspectorPickIdentity,
  applyStandardSolve,
  clearCanvas,
} from '../game/actionsStandard.js';
import { getActingSecrets } from '../game/setup.js';
import { runAiTurn as runAiLogic } from '../game/ai.js';
import { runStandardAiTurn } from '../game/aiStandard.js';
import { isCoordTargetable } from '../game/validators.js';
import {
  playClickSound,
  playShiftSound,
  playKillSound,
  playArrestSuccessSound,
  playArrestFailSound,
  playDisguiseSound,
} from '../utils/audio.js';

export function useGameState() {
  const [game, setGame] = useState(null);

  const startGame = useCallback((role, gameMode = GAME_MODE.CLASSIC) => {
    if (gameMode === GAME_MODE.STANDARD) {
      setGame(createStandardGame(role));
    } else {
      setGame(createClassicGame(role));
    }
  }, []);

  const resetGame = useCallback(() => setGame(null), []);

  const setPending = useCallback((action) => {
    setGame((g) => (g ? { ...g, pendingAction: action, pendingShift: null } : g));
  }, []);

  const cancelPending = useCallback(() => {
    setGame((g) =>
      g ? { ...g, pendingAction: null, pendingShift: null, pendingExonerateDiscard: null, solveGuess: {} } : g
    );
  }, []);

  const beginShift = useCallback(() => {
    setGame((g) =>
      g ? { ...g, pendingAction: 'shift', pendingShift: { step: 'axis' } } : g
    );
  }, []);

  const selectShiftLine = useCallback((axis, index) => {
    setGame((g) =>
      g?.pendingAction === 'shift'
        ? { ...g, pendingShift: { step: 'direction', axis, index } }
        : g
    );
  }, []);

  const selectShiftDirection = useCallback((direction) => {
    setGame((prev) => {
      if (!prev?.pendingShift || prev.pendingShift.step !== 'direction') return prev;
      const { axis, index } = prev.pendingShift;
      const isStandard = prev.gameMode === GAME_MODE.STANDARD;
      const fn = isStandard ? applyStandardShift : applyShift;
      const { ok, game: next } = fn(prev, axis, index, direction);
      if (ok) playShiftSound();
      return next;
    });
  }, []);

  const executeBoardAction = useCallback((r, c, actionOverride) => {
    setGame((prev) => {
      if (!prev || prev.gameOver || prev.activeSide !== 'human') return prev;
      const secrets = getActingSecrets(prev);
      const suspectId = prev.board[r]?.[c]?.suspectId;
      if (suspectId == null) return prev;
      const isStandard = prev.gameMode === GAME_MODE.STANDARD;
      
      const actionToExecute = actionOverride || prev.pendingAction;

      if (actionToExecute === 'kill') {
        const fn = isStandard ? applyStandardKill : applyKill;
        const { ok, game: next } = fn(prev, suspectId, secrets.killerIdentityId, secrets.inspectorSecretId);
        if (ok) playKillSound();
        return next;
      }
      // Solve: kimlik seçimi (1. aşama)
      if (actionToExecute === 'solve_identity') {
        return { ...prev, pendingAction: 'solve_disguise', solveGuess: { identityId: suspectId } };
      }

      // Solve: kılık seçimi (2. aşama)
      if (actionToExecute === 'solve_disguise') {
        if (suspectId === prev.solveGuess?.identityId) return prev; // aynı kart seçilemez
        const { ok, game: next } = applyStandardSolve(prev, prev.solveGuess.identityId, suspectId);
        return ok ? next : prev;
      }
      if (actionToExecute === 'arrest') {
        const fn = isStandard ? applyStandardAccuse : applyArrest;
        const { ok, game: next } = fn(prev, suspectId, secrets.killerIdentityId, secrets.inspectorSecretId);
        if (ok) {
          if (next.gameOver && next.winner === 'inspector') playArrestSuccessSound();
          else playArrestFailSound();
        }
        return next;
      }
      return prev;
    });
  }, []);

  const pickInspectorIdentity = useCallback((cardSuspectId) => {
    setGame((prev) => {
      if (!prev || prev.activeSide !== 'human') return prev;
      const isStandard = prev.gameMode === GAME_MODE.STANDARD;
      const fn = isStandard ? applyStandardInspectorPickIdentity : applyInspectorPickIdentity;
      const { ok, game: next } = fn(prev, cardSuspectId);
      if (ok) playClickSound();
      return next;
    });
  }, []);

  // Standart moda özgü: Solve hamlesi
  const beginSolve = useCallback(() => {
    setGame((prev) => {
      if (!prev || prev.activeSide !== 'human') return prev;
      return { ...prev, pendingAction: 'solve_identity', solveGuess: {} };
    });
  }, []);

  const executeSolve = useCallback((guessIdentityId, guessDisguiseId) => {
    setGame((prev) => {
      if (!prev || prev.activeSide !== 'human') return prev;
      const { ok, game: next } = applyStandardSolve(prev, guessIdentityId, guessDisguiseId);
      if (ok) playClickSound();
      return next;
    });
  }, []);

  // Canvas mesajını temizle
  const dismissCanvas = useCallback(() => {
    setGame((prev) => prev ? clearCanvas(prev) : prev);
  }, []);

  const beginExonerate = useCallback(() => {
    setGame((g) =>
      g ? { ...g, pendingAction: 'exonerate', pendingExonerateDiscard: true } : g
    );
  }, []);

  const completeExonerate = useCallback((discardId) => {
    setGame((prev) => {
      if (!prev || prev.activeSide !== 'human') return prev;
      const isStandard = prev.gameMode === GAME_MODE.STANDARD;
      if (isStandard) {
        const secrets = getActingSecrets(prev);
        const { ok, game: next } = applyStandardExonerate(prev, discardId, secrets.killerIdentityId);
        if (ok) playClickSound();
        return next;
      }
      const { ok, game: next } = applyExonerate(prev, discardId);
      if (ok) playClickSound();
      return next;
    });
  }, []);

  const executeDisguise = useCallback(() => {
    setGame((prev) => {
      if (!prev || prev.activeSide !== 'human') return prev;
      const isStandard = prev.gameMode === GAME_MODE.STANDARD;
      if (isStandard) {
        const { ok, game: next } = applyStandardDisguise(prev);
        if (ok) playDisguiseSound();
        return next;
      }
      const { ok, game: next } = applyDisguise(prev, prev.killer, prev.inspector.secretIdentitySuspectId);
      if (ok) playDisguiseSound();
      return next;
    });
  }, []);

  const runAiTurn = useCallback(() => {
    setGame((prev) => {
      if (!prev || prev.gameOver || prev.activeSide !== 'ai') return prev;
      const isStandard = prev.gameMode === GAME_MODE.STANDARD;
      return isStandard ? runStandardAiTurn(prev) : runAiLogic(prev);
    });
  }, []);

  const aiActiveSide = game?.activeSide;
  const aiTurn = game?.turn;
  const aiPhase = game?.phase;
  const aiGameOver = game?.gameOver;

  // ── Otomatik AI turu ──────────────────────────────────────────────────────
  // game.activeSide 'ai' olduğunda kısa bir gecikme sonrası AI'yı otomatik oynat.
  // aiTimerRef: React Strict Mode'un double-invoke davranışından kaynaklanan
  // çift timer sorununu önler. Effect cleanup'ta timer iptal edilir, böylece
  // aynı AI turu için yalnızca tek bir setTimeout aktif kalır.
  const aiTimerRef = useRef(null);

  useEffect(() => {
    if (!aiActiveSide || aiGameOver || aiActiveSide !== 'ai') return;

    // Varsa önceki timer'ı iptal et (Strict Mode çift mount koruması)
    if (aiTimerRef.current !== null) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }

    // Kılık değiştirme veya önemli bir olay sonrasında AI daha uzun bekler
    // — oyuncu yeni kimliğini toast'ta okuyabilsin
    const lastLog = game?.logs?.[0] ?? '';
    const isDisguise = lastLog.includes('Kılık değiştir') || lastLog.includes('kılık değiştir');
    const aiDelay = isDisguise ? 2800 : 800;

    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      setGame((prev) => {
        if (!prev || prev.gameOver || prev.activeSide !== 'ai') return prev;
        const isStandard = prev.gameMode === GAME_MODE.STANDARD;
        const next = isStandard ? runStandardAiTurn(prev) : runAiLogic(prev);
        if (next === prev) {
          console.warn('[AI] Takıldı, faz:', prev.phase, 'el:', prev.inspector.hand);
        }
        return next;
      });
    }, aiDelay);

    return () => {
      if (aiTimerRef.current !== null) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [aiActiveSide, aiTurn, aiPhase, aiGameOver]);

  return {
    game,
    startGame,
    resetGame,
    setPending,
    cancelPending,
    beginShift,
    selectShiftLine,
    selectShiftDirection,
    executeBoardAction,
    pickInspectorIdentity,
    beginExonerate,
    completeExonerate,
    executeDisguise,
    executeSolve,
    beginSolve,
    dismissCanvas,
    runAiTurn,
    getActingSecrets,
    isCoordTargetable,
  };
}
