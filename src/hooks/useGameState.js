import { useState, useCallback, useEffect } from 'react';
import { createClassicGame } from '../game/setup.js';
import { PHASE } from '../game/constants.js';
import {
  applyKillerPickIdentity,
  applyKill,
  applyArrest,
  applyExonerate,
  applyDisguise,
  applyShift,
  applyInspectorPickIdentity,
} from '../game/actions.js';
import { getActingSecrets } from '../game/setup.js';
import { runAiTurn as runAiLogic } from '../game/ai.js';
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

  const startGame = useCallback((role) => {
    setGame(createClassicGame(role));
  }, []);

  const resetGame = useCallback(() => setGame(null), []);

  const setPending = useCallback((action) => {
    setGame((g) => (g ? { ...g, pendingAction: action, pendingShift: null } : g));
  }, []);

  const cancelPending = useCallback(() => {
    setGame((g) =>
      g ? { ...g, pendingAction: null, pendingShift: null, pendingExonerateDiscard: null } : g
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
      const { ok, game: next } = applyShift(prev, axis, index, direction);
      if (ok) playShiftSound();
      return next;
    });
  }, []);

  const pickKillerIdentity = useCallback((cardSuspectId) => {
    setGame((prev) => {
      if (!prev || prev.activeSide !== 'human') return prev;
      if (prev.phase === PHASE.KILLER_PICK_DISGUISE) {
  const { ok, game: next } = applyKillerPickIdentity(prev, cardSuspectId);
  if (ok) playClickSound();
  return next;
}
      const { ok, game: next } = applyKillerPickIdentity(prev, cardSuspectId);
      if (ok) playClickSound();
      return next;
    });
  }, []);

  const executeBoardAction = useCallback((r, c) => {
    setGame((prev) => {
      if (!prev || prev.gameOver || prev.activeSide !== 'human') return prev;
      const secrets = getActingSecrets(prev);
      const suspectId = prev.board[r]?.[c]?.suspectId;
      if (suspectId == null) return prev;

      if (prev.pendingAction === 'kill') {
        const { ok, game: next } = applyKill(prev, suspectId, secrets.killerIdentityId, secrets.inspectorSecretId);
        if (ok) playKillSound();
        return next;
      }
      if (prev.pendingAction === 'arrest') {
        const { ok, game: next } = applyArrest(prev, suspectId, secrets.killerIdentityId, secrets.inspectorSecretId);
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
      const { ok, game: next } = applyInspectorPickIdentity(prev, cardSuspectId);
      if (ok) playClickSound();
      return next;
    });
  }, []);

  const beginExonerate = useCallback(() => {
    setGame((g) =>
      g ? { ...g, pendingAction: 'exonerate', pendingExonerateDiscard: true } : g
    );
  }, []);

  const completeExonerate = useCallback((discardId) => {
    setGame((prev) => {
      if (!prev || prev.activeSide !== 'human') return prev;
      const { ok, game: next } = applyExonerate(prev, discardId);
      if (ok) playClickSound();
      return next;
    });
  }, []);

  const executeDisguise = useCallback(() => {
    setGame((prev) => {
      if (!prev || prev.activeSide !== 'human') return prev;
      const { ok, game: next } = applyDisguise(prev, prev.killer, prev.inspector.secretIdentitySuspectId);
      if (ok) playDisguiseSound();
      return next;
    });
  }, []);

  const runAiTurn = useCallback(() => {
    setGame((prev) => {
      if (!prev || prev.gameOver || prev.activeSide !== 'ai') return prev;
      return runAiLogic(prev);
    });
  }, []);

  const aiActiveSide = game?.activeSide;
  const aiTurn = game?.turn;
  const aiPhase = game?.phase;
  const aiGameOver = game?.gameOver;

  // ── Otomatik AI turu ──────────────────────────────────────────────────────
  // game.activeSide 'ai' olduğunda kısa bir gecikme sonrası AI'yı otomatik oynat
  useEffect(() => {
    if (!aiActiveSide) return;
    if (aiGameOver) return;
    if (aiActiveSide !== 'ai') return;
    // Kimlik seçim fazlarında AI mantığı zaten runAiLogic içinde var, çalıştır
    const timer = setTimeout(() => {
      setGame((prev) => {
        if (!prev || prev.gameOver || prev.activeSide !== 'ai') return prev;
        return runAiLogic(prev);
      });
    }, 800); // 800ms bekleme — oyuncu hamleyi görsün
    return () => clearTimeout(timer);
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
    pickKillerIdentity,
    executeBoardAction,
    pickInspectorIdentity,
    beginExonerate,
    completeExonerate,
    executeDisguise,
    runAiTurn,
    getActingSecrets,
    isCoordTargetable,
  };
}
