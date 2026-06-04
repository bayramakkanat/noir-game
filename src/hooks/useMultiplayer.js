import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { createClassicGame } from '../game/setup.js';
import { PHASE, TURN } from '../game/constants.js';
import {
  applyKillerPickIdentity,
  applyKillerPickDisguise,
  applyKill,
  applyArrest,
  applyExonerate,
  applyDisguise,
  applyShift,
  applyInspectorPickIdentity,
} from '../game/actions.js';
import { getActingSecrets } from '../game/setup.js';
import { isCoordTargetable } from '../game/validators.js';
import {
  playClickSound,
  playShiftSound,
  playKillSound,
  playArrestSuccessSound,
  playArrestFailSound,
  playDisguiseSound,
} from '../utils/audio.js';

// Benzersiz oda ID'si üret
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Game state'i Supabase'e yazılacak formata dönüştür
function serializePublicState(game) {
  return {
    phase: game.phase,
    turn: game.turn,
    board: game.board,
    public_exonerated: game.publicExonerated,
    last_shift: game.lastShift,
    logs: game.logs,
    evidence_deck: game.evidenceDeck,
    discard_pile: game.discardPile,
    game_over: game.gameOver,
    winner: game.winner,
  };
}

// Supabase'den gelen veriyi game state'e dönüştür
function deserializePublicState(row, localSecrets) {
  return {
    phase: row.phase,
    turn: row.turn,
    board: row.board,
    publicExonerated: row.public_exonerated || [],
    lastShift: row.last_shift,
    logs: row.logs || [],
    evidenceDeck: row.evidence_deck || [],
    discardPile: row.discard_pile || [],
    gameOver: row.game_over,
    winner: row.winner,
    killer: localSecrets.killer,
    inspector: localSecrets.inspector,
    humanRole: localSecrets.humanRole,
    activeSide: localSecrets.activeSide,
    pendingAction: null,
    pendingShift: null,
    pendingExonerateDiscard: null,
  };
}

export function useMultiplayer() {
  const [roomId, setRoomId] = useState(null);
  const [myRole, setMyRole] = useState(null); // 'killer' | 'inspector'
  const [userId, setUserId] = useState(null);
  const [game, setGame] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | creating | waiting | playing | ended
  const [error, setError] = useState(null);

  // Gizli bilgileri sadece local'de tut
  const localSecretsRef = useRef(null);

  // Anonim giriş
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (error) setError('Giriş hatası: ' + error.message);
          else setUserId(data.user.id);
        });
      }
    });
  }, []);

  // Realtime subscription — oda değişikliklerini dinle
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        const row = payload.new;

        // Karşı tarafın hamlesi geldi, local state'i güncelle
        if (localSecretsRef.current) {
          const updated = deserializePublicState(row, localSecretsRef.current);
          // activeSide hesapla
          const isMyTurn =
            (myRole === 'killer' && updated.turn === TURN.KILLER) ||
            (myRole === 'inspector' && updated.turn === TURN.INSPECTOR) ||
            (myRole === 'killer' && updated.phase === PHASE.KILLER_PICK_IDENTITY) ||
            (myRole === 'killer' && updated.phase === PHASE.KILLER_FIRST_KILL) ||
            (myRole === 'killer' && updated.phase === PHASE.KILLER_PICK_DISGUISE) ||
            (myRole === 'inspector' && updated.phase === PHASE.INSPECTOR_PICK_IDENTITY);

          updated.activeSide = isMyTurn ? 'human' : 'opponent';
          updated.humanRole = myRole;
          setGame(updated);

          if (row.game_over) setStatus('ended');
        }

        // Dedektif katıldı — oyunu başlat
        if (row.phase === 'waiting' && row.inspector_user_id && myRole === 'killer') {
          startGameAfterBothJoined(row);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [roomId, myRole]);

  // Her iki oyuncu da katıldıktan sonra oyunu başlat (katil tarafında)
  async function startGameAfterBothJoined(row) {
    const initialGame = createClassicGame('killer');

    // Public state'i Supabase'e yaz
    const publicState = serializePublicState(initialGame);
    await supabase.from('rooms').update({
      ...publicState,
      phase: initialGame.phase,
    }).eq('id', roomId);

    // Katil sırrını Supabase'e yaz
    await supabase.from('killer_secrets').upsert({
      room_id: roomId,
      identity_suspect_id: initialGame.killer.identitySuspectId,
      disguise_card_id: initialGame.killer.disguiseCardSuspectId,
      hand: initialGame.killer.hand,
    });

    // Dedektif sırrını Supabase'e yaz
    await supabase.from('inspector_secrets').upsert({
      room_id: roomId,
      identity_suspect_id: initialGame.inspector.secretIdentitySuspectId,
      hand: initialGame.inspector.hand,
    });

    localSecretsRef.current = {
      killer: initialGame.killer,
      inspector: { secretIdentitySuspectId: null, hand: [] },
      humanRole: 'killer',
      activeSide: 'human',
    };

    setGame({ ...initialGame, humanRole: 'killer', activeSide: 'human' });
    setStatus('playing');
  }

  // Oda oluştur (katil)
  const createRoom = useCallback(async () => {
    if (!userId) return;
    setStatus('creating');
    setError(null);

    const id = generateRoomId();

    const { error: roomError } = await supabase.from('rooms').insert({
      id,
      phase: 'waiting',
      board: [],
      public_exonerated: [],
      logs: [],
      evidence_deck: [],
      discard_pile: [],
      game_over: false,
      killer_user_id: userId,
    });

    if (roomError) {
      setError('Oda oluşturulamadı: ' + roomError.message);
      setStatus('idle');
      return;
    }

    setRoomId(id);
    setMyRole('killer');
    setStatus('waiting');
  }, [userId]);

  // Odaya katıl (dedektif)
  const joinRoom = useCallback(async (id) => {
    if (!userId) return;
    setError(null);

    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id.toUpperCase())
      .single();

    if (fetchError || !room) {
      setError('Oda bulunamadı. Kod doğru mu?');
      return;
    }

    if (room.inspector_user_id) {
      setError('Bu oda dolu.');
      return;
    }

    const { error: joinError } = await supabase
      .from('rooms')
      .update({ inspector_user_id: userId })
      .eq('id', id.toUpperCase());

    if (joinError) {
      setError('Odaya katılınamadı.');
      return;
    }

    // Dedektif sırrını Supabase'den çek
    const { data: inspectorSecret } = await supabase
      .from('inspector_secrets')
      .select('*')
      .eq('room_id', id.toUpperCase())
      .single();

    localSecretsRef.current = {
      killer: { identitySuspectId: null, disguiseCardSuspectId: null, hand: [] },
      inspector: {
        secretIdentitySuspectId: inspectorSecret?.identity_suspect_id ?? null,
        hand: inspectorSecret?.hand ?? [],
      },
      humanRole: 'inspector',
      activeSide: 'opponent', // Katil başlar
    };

    setRoomId(id.toUpperCase());
    setMyRole('inspector');
    setStatus('playing');

    // Mevcut oda state'ini yükle
    if (room.board && room.board.length > 0) {
      const loaded = deserializePublicState(room, localSecretsRef.current);
      loaded.humanRole = 'inspector';
      loaded.activeSide = 'opponent';
      setGame(loaded);
    }
  }, [userId]);

  // Supabase'e hamle yaz
  async function pushState(nextGame) {
    if (!roomId) return;
    const publicState = serializePublicState(nextGame);
    await supabase.from('rooms').update(publicState).eq('id', roomId);

    // Gizli bilgileri güncelle
    if (myRole === 'killer') {
      await supabase.from('killer_secrets').upsert({
        room_id: roomId,
        identity_suspect_id: nextGame.killer.identitySuspectId,
        disguise_card_id: nextGame.killer.disguiseCardSuspectId,
        hand: nextGame.killer.hand,
      });
    } else {
      await supabase.from('inspector_secrets').upsert({
        room_id: roomId,
        identity_suspect_id: nextGame.inspector.secretIdentitySuspectId,
        hand: nextGame.inspector.hand,
      });
    }
  }

  // Hamle yap — local state güncelle + Supabase'e yaz
  function applyAndPush(applyFn, soundFn) {
    setGame((prev) => {
      if (!prev) return prev;
      const { ok, game: next } = applyFn(prev);
      if (!ok) return prev;
      if (soundFn) soundFn();
      // Sıra karşıya geçti, activeSide güncelle
      const isMyTurnNext =
        (myRole === 'killer' && next.turn === TURN.KILLER) ||
        (myRole === 'inspector' && next.turn === TURN.INSPECTOR) ||
        (myRole === 'killer' && [PHASE.KILLER_PICK_IDENTITY, PHASE.KILLER_FIRST_KILL, PHASE.KILLER_PICK_DISGUISE].includes(next.phase)) ||
        (myRole === 'inspector' && next.phase === PHASE.INSPECTOR_PICK_IDENTITY);
      const withSide = { ...next, activeSide: isMyTurnNext ? 'human' : 'opponent', humanRole: myRole };
      pushState(withSide);
      return withSide;
    });
  }

  const setPending = useCallback((action) => {
    setGame((g) => g ? { ...g, pendingAction: action, pendingShift: null } : g);
  }, []);

  const cancelPending = useCallback(() => {
    setGame((g) => g ? { ...g, pendingAction: null, pendingShift: null, pendingExonerateDiscard: null } : g);
  }, []);

  const beginShift = useCallback(() => {
    setGame((g) => g ? { ...g, pendingAction: 'shift', pendingShift: { step: 'axis' } } : g);
  }, []);

  const selectShiftLine = useCallback((axis, index) => {
    setGame((g) => g?.pendingAction === 'shift'
      ? { ...g, pendingShift: { step: 'direction', axis, index } }
      : g);
  }, []);

  const selectShiftDirection = useCallback((direction) => {
    setGame((prev) => {
      if (!prev?.pendingShift || prev.pendingShift.step !== 'direction') return prev;
      const { axis, index } = prev.pendingShift;
      const { ok, game: next } = applyShift(prev, axis, index, direction);
      if (!ok) return prev;
      playShiftSound();
      const withSide = { ...next, activeSide: 'opponent', humanRole: myRole };
      pushState(withSide);
      return withSide;
    });
  }, [myRole, roomId]);

  const pickKillerIdentity = useCallback((cardSuspectId) => {
    applyAndPush(
      (prev) => prev.phase === PHASE.KILLER_PICK_DISGUISE
        ? applyKillerPickDisguise(prev, cardSuspectId)
        : applyKillerPickIdentity(prev, cardSuspectId),
      playClickSound
    );
  }, [myRole, roomId]);

  const executeBoardAction = useCallback((r, c) => {
    setGame((prev) => {
      if (!prev || prev.gameOver) return prev;
      const secrets = getActingSecrets(prev);
      const suspectId = prev.board[r]?.[c]?.suspectId;
      if (suspectId == null) return prev;

      let result;
      let soundFn;

      if (prev.pendingAction === 'kill') {
        result = applyKill(prev, suspectId, secrets.killerIdentityId, secrets.inspectorSecretId);
        soundFn = result.ok ? playKillSound : null;
      } else if (prev.pendingAction === 'arrest') {
        result = applyArrest(prev, suspectId, secrets.killerIdentityId, secrets.inspectorSecretId);
        if (result.ok) {
          soundFn = result.game.gameOver && result.game.winner === 'inspector'
            ? playArrestSuccessSound
            : playArrestFailSound;
        }
      } else return prev;

      if (!result?.ok) return prev;
      if (soundFn) soundFn();
      const withSide = { ...result.game, activeSide: 'opponent', humanRole: myRole };
      pushState(withSide);
      return withSide;
    });
  }, [myRole, roomId]);

  const pickInspectorIdentity = useCallback((cardSuspectId) => {
    applyAndPush(
      (prev) => applyInspectorPickIdentity(prev, cardSuspectId),
      playClickSound
    );
  }, [myRole, roomId]);

  const beginExonerate = useCallback(() => {
    setGame((g) => g ? { ...g, pendingAction: 'exonerate', pendingExonerateDiscard: true } : g);
  }, []);

  const completeExonerate = useCallback((discardId) => {
    applyAndPush(
      (prev) => applyExonerate(prev, discardId),
      playClickSound
    );
  }, [myRole, roomId]);

  const executeDisguise = useCallback(() => {
    applyAndPush(
      (prev) => applyDisguise(prev, prev.killer, prev.inspector.secretIdentitySuspectId),
      playDisguiseSound
    );
  }, [myRole, roomId]);

  const leaveRoom = useCallback(() => {
    setRoomId(null);
    setMyRole(null);
    setGame(null);
    setStatus('idle');
    localSecretsRef.current = null;
  }, []);

  return {
    // Oda yönetimi
    roomId,
    myRole,
    userId,
    status,
    error,
    createRoom,
    joinRoom,
    leaveRoom,

    // Oyun state
    game,
    isCoordTargetable,
    getActingSecrets,

    // Aksiyonlar
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

    // Multiplayer'da AI yok
    runAiTurn: () => {},
  };
}
