import { useState, useCallback, useRef, useEffect } from 'react';
import { useWakeLock } from './useWakeLock.js';
import { Peer } from 'peerjs';
import { createClassicGame } from '../game/setup.js';
import { getActingSecrets } from '../game/setup.js';
import { isCoordTargetable } from '../game/validators.js';
import {
  applyKill,
  applyArrest,
  applyExonerate,
  applyDisguise,
  applyShift,
  applyInspectorPickIdentity,
} from '../game/actions.js';
import {
  playClickSound,
  playShiftSound,
  playKillSound,
  playArrestSuccessSound,
  playArrestFailSound,
  playDisguiseSound,
} from '../utils/audio.js';
import { PHASE, TURN } from '../game/constants.js';

// Katile özel log'ları dedektif için maskele
function maskLogsForInspector(logs) {
  return logs.map(log => {
    if (log.includes('Kimliğin:') && log.includes('Komşunu öldür'))
      return 'Oyun başladı. Katil ilk hamlesini yapıyor...'; // Katil kimlik bilgisi — gizle
    if (log.includes('Kılık değiştirdin') || log.includes('Yeni kimliğin:')) {
      const eskiMatch = log.match(/Eski kimlik \(<b>([^<]+)<\/b>\)/);
      const eskiAd = eskiMatch ? eskiMatch[1] : '?';
      return `⇄ Katil kılık değiştirdi. Eski kimlik: <b>${eskiAd}</b>.`;
    }
    return log;
  }).filter(Boolean);
}

// Dedektife özel log'ları katil için maskele
function maskLogsForKiller(logs) {
  return logs.map(log => {
    if (log.includes('Gizli kimliğin:') && log.includes('Oyun başlıyor'))
      return 'Dedektif kimliğini seçti. Oyun başlıyor.'; // Dedektif kimlik bilgisi — gizle
    return log;
  }).filter(Boolean);
}

export function usePeerMultiplayer() {
  const [roomId, setRoomId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [game, setGame] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const myRoleRef = useRef(null);

  const isConnected = status === 'playing';
  useWakeLock(isConnected);

  useEffect(() => {
    myRoleRef.current = myRole;
  }, [myRole]);

  const cleanup = useCallback(() => {
    if (connRef.current) { connRef.current.close(); connRef.current = null; }
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
  }, []);

  const isMyTurn = useCallback((gameState) => {
    if (!gameState || !myRoleRef.current) return false;
    if (gameState.gameOver) return false;
    if (gameState.phase === PHASE.KILLER_FIRST_KILL && myRoleRef.current === 'killer') return true;
    if (gameState.phase === PHASE.INSPECTOR_PICK_IDENTITY && myRoleRef.current === 'inspector') return true;
    if (gameState.phase === PHASE.PLAY) {
      if (gameState.turn === TURN.KILLER && myRoleRef.current === 'killer') return true;
      if (gameState.turn === TURN.INSPECTOR && myRoleRef.current === 'inspector') return true;
    }
    return false;
  }, []);

  // Oyun state'ini serialize et — gizli bilgileri rolle filtrele
  const serializeGameState = useCallback((game, targetRole) => ({
    phase: game.phase,
    turn: game.turn,
    board: game.board,
    publicExonerated: game.publicExonerated,
    lastShift: game.lastShift,
    evidenceDeck: game.evidenceDeck,
    discardPile: game.discardPile,
    gameOver: game.gameOver,
    winner: game.winner,
    killCount: game.killCount,
    killedSuspectIds: game.killedSuspectIds,
    killSites: game.killSites,
    killer: {
      // Katil kimliğini sadece dedektife gönder (arrest kontrolü için)
      // ama katile kendi kimliğini gönderme (zaten biliyor, prev'den korunuyor)
      identitySuspectId: game.killer.identitySuspectId,
      disguiseCardSuspectId: game.killer.disguiseCardSuspectId,
      hand: game.killer.hand,
    },
    inspector: {
      secretIdentitySuspectId: game.inspector.secretIdentitySuspectId,
      hand: game.inspector.hand,
      investigated: game.inspector.investigated || [],
    },
    // Log'ları role göre maskele
    logs: targetRole === 'inspector'
      ? maskLogsForInspector(game.logs)
      : maskLogsForKiller(game.logs),
  }), []);

  // Hamle gönder — her iki rol için ayrı serialize
  const sendAction = useCallback((type, payload, newGameState) => {
    if (connRef.current?.open) {
      connRef.current.send({
        type: 'action',
        data: {
          type,
          payload,
          forInspector: serializeGameState(newGameState, 'inspector'),
          forKiller: serializeGameState(newGameState, 'killer'),
        }
      });
    }
  }, [serializeGameState]);

  // Gelen veriyi işle
  const handleIncomingData = useCallback((data) => {
    if (data.type === 'gameState') {
      const role = myRoleRef.current;
      const payload = data.payload;

      // İlk log — katil için normal, dedektif için bekleme mesajı
      const initialLog = role === 'inspector'
        ? 'Oyun başladı. Katil ilk hamlesini yapıyor...'
        : payload.logs?.[0] ?? 'Oyun başladı.';

      setGame({
        ...payload,
        humanRole: role,
        logs: [initialLog],
      });
      setStatus('playing');
    }
    else if (data.type === 'action') {
      const { forInspector, forKiller } = data.data;

      setGame(prev => {
        if (!prev) return prev;
        const role = myRoleRef.current;
        const incoming = role === 'inspector' ? forInspector : forKiller;

        return {
          ...incoming,
          // Kendi gizli kimliğini koru — karşı taraf null göndermiş olabilir
          killer: {
            ...incoming.killer,
            identitySuspectId: role === 'killer'
              ? prev.killer.identitySuspectId
              : incoming.killer.identitySuspectId,
          },
          inspector: {
            ...incoming.inspector,
            secretIdentitySuspectId: role === 'inspector'
              ? prev.inspector.secretIdentitySuspectId
              : incoming.inspector.secretIdentitySuspectId,
          },
          humanRole: role,
        };
      });
    }
  }, []);

  // Oda oluştur (Katil)
  const createRoom = useCallback(async (roomName) => {
    if (!roomName?.trim()) { setError('Lütfen bir oda adı girin'); return; }
    setError(null);
    setStatus('creating');

    const peer = new Peer(roomName.trim());
    peerRef.current = peer;

    peer.on('open', () => {
      setRoomId(peer.id);
      setMyRole('killer');
      setStatus('waiting');
    });

    peer.on('connection', (conn) => {
      connRef.current = conn;
      conn.on('open', () => {
        const initialGame = createClassicGame('killer');
        setGame({ ...initialGame, humanRole: 'killer' });
        setStatus('playing');
        // Dedektife gönder
        conn.send({
          type: 'gameState',
          payload: serializeGameState(initialGame, 'inspector'),
        });
      });
      conn.on('data', handleIncomingData);
      conn.on('close', () => { setStatus('idle'); setError('Bağlantı koptu'); cleanup(); });
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') setError('Bu oda adı zaten kullanılıyor.');
      else setError('Bağlantı hatası: ' + err.message);
      setStatus('idle');
      cleanup();
    });
  }, [cleanup, handleIncomingData, serializeGameState]);

  // Odaya katıl (Dedektif)
  const joinRoom = useCallback(async (roomName) => {
    if (!roomName?.trim()) { setError('Lütfen bir oda adı girin'); return; }
    setError(null);
    setStatus('joining');

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(roomName.trim());
      connRef.current = conn;
      conn.on('open', () => { setRoomId(roomName); setMyRole('inspector'); });
      conn.on('data', handleIncomingData);
      conn.on('close', () => { setStatus('idle'); setError('Bağlantı koptu'); cleanup(); });
    });

    peer.on('error', (err) => {
      setError('Bağlantı hatası: ' + err.message);
      setStatus('idle');
      cleanup();
    });
  }, [cleanup, handleIncomingData]);

  // ─── Oyuncu hareketleri ───────────────────────────────────────────────────

  const executeBoardAction = useCallback((r, c) => {
    setGame((prev) => {
      if (!prev || !isMyTurn(prev) || prev.gameOver) return prev;
      const secrets = getActingSecrets(prev);
      const suspectId = prev.board[r]?.[c]?.suspectId;
      if (suspectId == null) return prev;

      let result, actionType;
      if (prev.pendingAction === 'kill') {
        result = applyKill(prev, suspectId, secrets.killerIdentityId, secrets.inspectorSecretId);
        actionType = 'kill';
        if (result.ok) playKillSound();
      } else if (prev.pendingAction === 'arrest') {
        result = applyArrest(prev, suspectId, secrets.killerIdentityId, secrets.inspectorSecretId);
        actionType = 'arrest';
        if (result.ok) {
          if (result.game.gameOver && result.game.winner === 'inspector') playArrestSuccessSound();
          else playArrestFailSound();
        }
      } else return prev;

      if (!result?.ok) return prev;
      sendAction(actionType, { suspectId, r, c }, result.game);
      return result.game;
    });
  }, [sendAction, isMyTurn]);

  const pickInspectorIdentity = useCallback((id) => {
    setGame((prev) => {
      if (!prev || !isMyTurn(prev)) return prev;
      const { ok, game: next } = applyInspectorPickIdentity(prev, id);
      if (ok) { playClickSound(); sendAction('pickInspectorIdentity', id, next); return next; }
      return prev;
    });
  }, [sendAction, isMyTurn]);

  const executeDisguise = useCallback(() => {
    setGame((prev) => {
      if (!prev || !isMyTurn(prev)) return prev;
      const { ok, game: next } = applyDisguise(prev, prev.killer, prev.inspector.secretIdentitySuspectId);
      if (ok) { playDisguiseSound(); sendAction('disguise', null, next); return next; }
      return prev;
    });
  }, [sendAction, isMyTurn]);

  const completeExonerate = useCallback((id) => {
    setGame((prev) => {
      if (!prev || !isMyTurn(prev)) return prev;
      const { ok, game: next } = applyExonerate(prev, id);
      if (ok) {
        playClickSound();
        sendAction('exonerate', { id }, next);
        return { ...next, pendingAction: null, pendingExonerateDiscard: null };
      }
      return prev;
    });
  }, [sendAction, isMyTurn]);

  const selectShiftDirection = useCallback((direction) => {
    setGame((prev) => {
      if (!prev || !isMyTurn(prev)) return prev;
      if (!prev.pendingShift || prev.pendingShift.step !== 'direction') return prev;
      const { axis, index } = prev.pendingShift;
      const { ok, game: next } = applyShift(prev, axis, index, direction);
      if (!ok) return prev;
      playShiftSound();
      sendAction('shift', { axis, index, direction }, next);
      return { ...next, pendingAction: null, pendingShift: null };
    });
  }, [sendAction, isMyTurn]);

  const beginShift = useCallback(() => {
    setGame(g => g ? { ...g, pendingAction: 'shift', pendingShift: { step: 'axis' } } : g);
  }, []);

  const selectShiftLine = useCallback((axis, index) => {
    setGame(g => g?.pendingAction === 'shift' ? { ...g, pendingShift: { step: 'direction', axis, index } } : g);
  }, []);

  const beginExonerate = useCallback(() => {
    setGame(g => g ? { ...g, pendingAction: 'exonerate', pendingExonerateDiscard: true } : g);
  }, []);

  const setPending = useCallback((action) => {
    setGame(g => g ? { ...g, pendingAction: action, pendingShift: null } : g);
  }, []);

  const cancelPending = useCallback(() => {
    setGame(g => g ? { ...g, pendingAction: null, pendingShift: null, pendingExonerateDiscard: null } : g);
  }, []);

  const leaveRoom = useCallback(() => {
    cleanup();
    setRoomId(null); setMyRole(null); setGame(null); setStatus('idle'); setError(null);
  }, [cleanup]);

  const getActingSecretsWrapper = useCallback((gameState) => getActingSecrets(gameState), []);
  const isCoordTargetableWrapper = useCallback((gameState, r, c, action, secrets) =>
    isCoordTargetable(gameState, r, c, action, secrets), []);

  return {
    roomId, myRole, game, status, error,
    createRoom, joinRoom, leaveRoom,
    setPending, cancelPending,
    beginShift, selectShiftLine, selectShiftDirection,
    executeBoardAction,
    pickInspectorIdentity,
    beginExonerate, completeExonerate,
    executeDisguise,
    getActingSecrets: getActingSecretsWrapper,
    isCoordTargetable: isCoordTargetableWrapper,
    runAiTurn: () => {},
  };
}
