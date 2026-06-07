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

export function usePeerMultiplayer() {
  const [roomId, setRoomId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [game, setGame] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  
  const peerRef = useRef(null);
  const connRef = useRef(null);
  const myRoleRef = useRef(null);

  // Multiplayer aktifken ekranın kapanmasını önle
  const isConnected = status === 'playing';
  useWakeLock(isConnected);

  useEffect(() => {
    myRoleRef.current = myRole;
  }, [myRole]);

  const cleanup = useCallback(() => {
    if (connRef.current) {
      connRef.current.close();
      connRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
  }, []);

  // Oyuncunun sırası mı?
  const isMyTurn = useCallback((gameState) => {
    if (!gameState || !myRoleRef.current) return false;
    if (gameState.gameOver) return false;
    
    // Kimlik seçme aşamaları
    if (gameState.phase === PHASE.KILLER_PICK_IDENTITY && myRoleRef.current === 'killer') return true;
    if (gameState.phase === PHASE.KILLER_PICK_DISGUISE && myRoleRef.current === 'killer') return true;
    if (gameState.phase === PHASE.INSPECTOR_PICK_IDENTITY && myRoleRef.current === 'inspector') return true;
    
    // İlk öldürme (sadece katil)
    if (gameState.phase === PHASE.KILLER_FIRST_KILL && myRoleRef.current === 'killer') return true;
    
    // Normal oyun
    if (gameState.phase === PHASE.PLAY) {
      if (gameState.turn === TURN.KILLER && myRoleRef.current === 'killer') return true;
      if (gameState.turn === TURN.INSPECTOR && myRoleRef.current === 'inspector') return true;
    }
    
    return false;
  }, []);

  // Game state serialization (gizli bilgiler olmadan)
  const serializeGameState = useCallback((game) => ({
  phase: game.phase,
  turn: game.turn,
  board: game.board,
  publicExonerated: game.publicExonerated,
  lastShift: game.lastShift,
  logs: game.logs.map(log => {
    // Yeni kimlik bilgisini gizle, eski kimliği dönüştür
    if (log.includes('Kılık değiştirdin') || log.includes('Yeni kimliğin')) {
      const eskiMatch = log.match(/Eski kimlik \(<b>([^<]+)<\/b>\)/);
      const eskiAd = eskiMatch ? eskiMatch[1] : '?';
      return `⇄ Katil kılık değiştirdi. Eski kimlik: <b>${eskiAd}</b>.`;
    }
    if (log.includes('Gizli kimliğin')) return null;
    return log;
  }).filter(Boolean),
  evidenceDeck: game.evidenceDeck,
  discardPile: game.discardPile,
  gameOver: game.gameOver,
  winner: game.winner,
  killCount: game.killCount,
  killedSuspectIds: game.killedSuspectIds,
  killSites: game.killSites,
  killer: {
    identitySuspectId: game.killer.identitySuspectId,        // 🔥 BU SATIRI EKLE
    disguiseCardSuspectId: game.killer.disguiseCardSuspectId,
    hand: game.killer.hand,
  },
  inspector: {
    secretIdentitySuspectId: game.inspector.secretIdentitySuspectId,
    hand: game.inspector.hand,
    investigated: game.inspector.investigated || [],
  },
}), []);

  // Hamleyi serialization
  const serializeAction = useCallback((type, payload, newGameState) => ({
    type,
    payload,
    newGameState: serializeGameState(newGameState),
  }), [serializeGameState]);

  // Hamle gönder
  const sendAction = useCallback((type, payload, newGameState) => {
    if (connRef.current && connRef.current.open) {
      const actionData = serializeAction(type, payload, newGameState);
      connRef.current.send({ type: 'action', data: actionData });
      console.log('Hamle gönderildi:', type);
    }
  }, [serializeAction]);

  // Gelen veriyi işle
 const handleIncomingData = useCallback((data) => {
  console.log('Gelen veri:', data.type);
  
  if (data.type === 'gameState') {
    const role = myRoleRef.current;
    const newGame = {
      ...data.payload,
      humanRole: role,
      logs: role === 'inspector'
        ? ['Oyun başladı. Katil kimliğini seçiyor, bekleniyor...']
        : data.payload.logs,
    };
    setGame(newGame);
    setStatus('playing');
  } 
  else if (data.type === 'action') {
    const { type, payload, newGameState } = data.data;
    console.log('Aksiyon geldi:', type, payload);
    
    setGame(prev => {
      if (!prev) return prev;
      const role = myRoleRef.current;

      // Dedektif için gelen loglarda katile özel mesajları maskele
      const sanitizedLogs = role === 'inspector'
        ? newGameState.logs.map(log => {
            if (log.includes('Gizli kimliğin'))
              return null;
            // Kılık değiştirme: yeni kimliği gizle, eski kimliği göster
            if (log.includes('Kılık değiştirdin') || log.includes('Yeni kimliğin')) {
              const eskiMatch = log.match(/Eski kimlik \(<b>([^<]+)<\/b>\)/);
              const eskiAd = eskiMatch ? eskiMatch[1] : '?';
              return `⇄ Katil kılık değiştirdi. Eski kimlik: <b>${eskiAd}</b>.`;
            }
            if (log.includes('Elindeki 2 karttan'))
              return 'Katil kimliğini seçti. İlk hamle bekleniyor...';
            return log;
          }).filter(Boolean)
        : newGameState.logs;

      const updatedGame = {
        ...newGameState,
        logs: sanitizedLogs,
        killer: {
          ...newGameState.killer,
          identitySuspectId:
            role === 'killer'
              ? prev.killer.identitySuspectId
              : newGameState.killer.identitySuspectId,
        },
        inspector: {
          ...newGameState.inspector,
          secretIdentitySuspectId:
            role === 'inspector'
              ? prev.inspector.secretIdentitySuspectId
              : newGameState.inspector.secretIdentitySuspectId,
        },
        humanRole: role,
      };

      return updatedGame;
    });
  }
}, []);

  // Oda oluştur (Katil)
  const createRoom = useCallback(async (roomName) => {
    if (!roomName || roomName.trim() === '') {
      setError('Lütfen bir oda adı girin');
      return;
    }

    setError(null);
    setStatus('creating');
    
    const peer = new Peer(roomName.trim());
    peerRef.current = peer;

    peer.on('open', () => {
      console.log('Peer açıldı, ID:', peer.id);
      setRoomId(peer.id);
      setMyRole('killer');
      setStatus('waiting');
    });

    peer.on('connection', (conn) => {
      console.log('Bağlantı geldi!');
      connRef.current = conn;
      
      conn.on('open', () => {
        console.log('Bağlantı açıldı, oyun başlatılıyor...');
        // Oyunu başlat
        const initialGame = createClassicGame('killer');
        setGame({ ...initialGame, humanRole: 'killer' });
        setStatus('playing');
        
        // Dedektife oyun state'ini gönder (gizli bilgiler olmadan)
        const serialized = serializeGameState(initialGame);
        conn.send({ type: 'gameState', payload: serialized });
        console.log('Oyun state\'i gönderildi');
      });
      
      conn.on('data', handleIncomingData);
      conn.on('close', () => {
        console.log('Bağlantı kapandı');
        setStatus('idle');
        setError('Bağlantı koptu');
        cleanup();
      });
    });
    
    peer.on('error', (err) => {
      console.error('Peer hatası:', err);
      if (err.type === 'unavailable-id') {
        setError('Bu oda adı zaten kullanılıyor. Başka bir ad deneyin.');
      } else {
        setError('Bağlantı hatası: ' + err.message);
      }
      setStatus('idle');
      cleanup();
    });
  }, [cleanup, handleIncomingData, serializeGameState]);

  // Odaya katıl (Dedektif)
  const joinRoom = useCallback(async (roomName) => {
    if (!roomName || roomName.trim() === '') {
      setError('Lütfen bir oda adı girin');
      return;
    }

    setError(null);
    setStatus('joining');
    
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      console.log('Peer açıldı, bağlanılıyor...');
      const conn = peer.connect(roomName.trim());
      connRef.current = conn;
      
      conn.on('open', () => {
        console.log('Bağlantı kuruldu!');
        setRoomId(roomName);
        setMyRole('inspector');
        // State gelene kadar bekliyoruz
      });
      
      conn.on('data', handleIncomingData);
      conn.on('close', () => {
        console.log('Bağlantı kapandı');
        setStatus('idle');
        setError('Bağlantı koptu');
        cleanup();
      });
    });
    
    peer.on('error', (err) => {
      console.error('Peer hatası:', err);
      setError('Bağlantı hatası: ' + err.message);
      setStatus('idle');
      cleanup();
    });
  }, [cleanup, handleIncomingData]);

  // ─── OYUNCU HAREKETLERİ ─────────────────────────────────────────

  const pickKillerIdentity = useCallback((id) => {
    setGame((prev) => {
      if (!prev || !isMyTurn(prev)) return prev;
      const { ok, game: next } = applyKillerPickIdentity(prev, id);
      if (ok) {
        playClickSound();
        sendAction('pickKillerIdentity', id, next);
        return next;
      }
      return prev;
    });
  }, [sendAction, isMyTurn]);

  const pickInspectorIdentity = useCallback((id) => {
    setGame((prev) => {
      if (!prev || !isMyTurn(prev)) return prev;
      const { ok, game: next } = applyInspectorPickIdentity(prev, id);
      if (ok) {
        playClickSound();
        sendAction('pickInspectorIdentity', id, next);
        return next;
      }
      return prev;
    });
  }, [sendAction, isMyTurn]);

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

  const beginShift = useCallback(() => {
    setGame(g => g ? { ...g, pendingAction: 'shift', pendingShift: { step: 'axis' } } : g);
  }, []);

  const selectShiftLine = useCallback((axis, index) => {
    setGame(g => g?.pendingAction === 'shift' ? { ...g, pendingShift: { step: 'direction', axis, index } } : g);
  }, []);

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

  const beginExonerate = useCallback(() => {
    setGame(g => g ? { ...g, pendingAction: 'exonerate', pendingExonerateDiscard: true } : g);
  }, []);

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

  const executeDisguise = useCallback(() => {
    setGame((prev) => {
      if (!prev || !isMyTurn(prev)) return prev;
      const { ok, game: next } = applyDisguise(prev, prev.killer, prev.inspector.secretIdentitySuspectId);
      if (ok) {
        playDisguiseSound();
        sendAction('disguise', null, next);
        return next;
      }
      return prev;
    });
  }, [sendAction, isMyTurn]);

  const setPending = useCallback((action) => {
    setGame(g => g ? { ...g, pendingAction: action, pendingShift: null } : g);
  }, []);

  const cancelPending = useCallback(() => {
    setGame(g => g ? { ...g, pendingAction: null, pendingShift: null, pendingExonerateDiscard: null } : g);
  }, []);

  const leaveRoom = useCallback(() => {
    cleanup();
    setRoomId(null);
    setMyRole(null);
    setGame(null);
    setStatus('idle');
    setError(null);
  }, [cleanup]);

  // Helper functions
  const getActingSecretsWrapper = useCallback((gameState) => {
    return getActingSecrets(gameState);
  }, []);

  const isCoordTargetableWrapper = useCallback((gameState, r, c, action, secrets) => {
    return isCoordTargetable(gameState, r, c, action, secrets);
  }, []);

  return {
    roomId,
    myRole,
    game,
    status,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
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
    getActingSecrets: getActingSecretsWrapper,
    isCoordTargetable: isCoordTargetableWrapper,
    runAiTurn: () => {},
  };
}