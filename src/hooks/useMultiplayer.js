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

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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

function calcActiveSide(role, phase, turn) {
  if (role === 'killer') {
    return [PHASE.KILLER_PICK_IDENTITY, PHASE.KILLER_FIRST_KILL, PHASE.KILLER_PICK_DISGUISE].includes(phase) ||
      (phase === PHASE.PLAY && turn === TURN.KILLER)
      ? 'human' : 'opponent';
  }
  return (phase === PHASE.INSPECTOR_PICK_IDENTITY) ||
    (phase === PHASE.PLAY && turn === TURN.INSPECTOR)
    ? 'human' : 'opponent';
}

export function useMultiplayer() {
  const [roomId, setRoomId]   = useState(null);
  const [myRole, setMyRole]   = useState(null);
  const [userId, setUserId]   = useState(null);
  const [game, setGame]       = useState(null);
  const [status, setStatus]   = useState('idle');
  const [error, setError]     = useState(null);
  const localSecretsRef       = useRef(null);
  const myRoleRef             = useRef(null);
  const roomIdRef             = useRef(null);

  // myRole ve roomId'yi ref'e de yaz — closure'larda güncel değer için
  useEffect(() => { myRoleRef.current = myRole; }, [myRole]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

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

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, async (payload) => {
        const row = payload.new;
        const role = myRoleRef.current;

        // Dedektif katıldı — katil tarafında oyunu başlat
        if (row.phase === 'waiting' && row.inspector_user_id && role === 'killer') {
          await startGameAfterBothJoined(row);
          return;
        }

        // Dedektif: inspector_secrets henüz yazılmamış olabilir, bekle
        if (role === 'inspector' && !localSecretsRef.current?.inspector?.hand?.length) {
          // Sırrı çekmeyi dene
          const { data: secret } = await supabase
            .from('inspector_secrets')
            .select('*')
            .eq('room_id', roomIdRef.current)
            .single();

          if (secret) {
            localSecretsRef.current = {
              ...localSecretsRef.current,
              inspector: {
                secretIdentitySuspectId: secret.identity_suspect_id ?? null,
                hand: secret.hand ?? [],
              },
            };
          }
        }

        if (!localSecretsRef.current) return;

        const activeSide = calcActiveSide(role, row.phase, row.turn);
        const updated = deserializePublicState(row, localSecretsRef.current);
        updated.activeSide = activeSide;
        updated.humanRole  = role;
        setGame(updated);
        if (row.game_over) setStatus('ended');
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [roomId]);

  async function startGameAfterBothJoined() {
    const rid = roomIdRef.current;
    const initialGame = createClassicGame('killer');
    const publicState = serializePublicState(initialGame);

    await supabase.from('rooms').update({ ...publicState }).eq('id', rid);

    await supabase.from('killer_secrets').upsert({
      room_id: rid,
      identity_suspect_id: initialGame.killer.identitySuspectId,
      disguise_card_id: initialGame.killer.disguiseCardSuspectId,
      hand: initialGame.killer.hand,
    });

    await supabase.from('inspector_secrets').upsert({
      room_id: rid,
      identity_suspect_id: initialGame.inspector.secretIdentitySuspectId,
      hand: initialGame.inspector.hand,
    });

    localSecretsRef.current = {
      killer:    initialGame.killer,
      inspector: { secretIdentitySuspectId: null, hand: [] },
      humanRole: 'killer',
      activeSide: 'human',
    };

    setGame({ ...initialGame, humanRole: 'killer', activeSide: 'human' });
    setStatus('playing');
  }

  // Oda oluştur
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

  // Odaya katıl
  const joinRoom = useCallback(async (id) => {
    if (!userId) return;
    setError(null);
    const upper = id.toUpperCase().trim();

    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', upper)
      .single();

    if (fetchError || !room) {
      setError('Oda bulunamadı. Kodu kontrol et.');
      return;
    }

    // Aynı kullanıcı zaten katil olarak bu odadaysa engelle
    if (room.killer_user_id === userId) {
      setError('Bu odayı sen oluşturdun, farklı bir cihazdan katıl.');
      return;
    }

    // inspector_user_id dolu ama bu kullanıcı değilse — oda dolu
    if (room.inspector_user_id && room.inspector_user_id !== userId) {
      setError('Bu oda dolu.');
      return;
    }

    // Henüz katılmamışsa katıl
    if (!room.inspector_user_id) {
      const { error: joinError } = await supabase
        .from('rooms')
        .update({ inspector_user_id: userId })
        .eq('id', upper);

      if (joinError) {
        setError('Odaya katılınamadı: ' + joinError.message);
        return;
      }
    }

    // inspector_secrets hazır olana kadar bekle (katil oyunu başlatmış olabilir)
    let inspectorSecret = null;
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase
        .from('inspector_secrets')
        .select('*')
        .eq('room_id', upper)
        .single();
      if (data) { inspectorSecret = data; break; }
      await new Promise(r => setTimeout(r, 600));
    }

    localSecretsRef.current = {
      killer: { identitySuspectId: null, disguiseCardSuspectId: null, hand: [] },
      inspector: {
        secretIdentitySuspectId: inspectorSecret?.identity_suspect_id ?? null,
        hand: inspectorSecret?.hand ?? [],
      },
      humanRole: 'inspector',
      activeSide: 'opponent',
    };

    setRoomId(upper);
    setMyRole('inspector');
    setStatus('playing');

    // Güncel oda state'ini yükle
    const { data: freshRoom } = await supabase
      .from('rooms').select('*').eq('id', upper).single();

    if (freshRoom?.board?.length) {
      const loaded = deserializePublicState(freshRoom, localSecretsRef.current);
      loaded.humanRole  = 'inspector';
      loaded.activeSide = calcActiveSide('inspector', freshRoom.phase, freshRoom.turn);
      setGame(loaded);
    }
  }, [userId]);

  // Supabase'e yaz
  async function pushState(nextGame) {
    const rid  = roomIdRef.current;
    const role = myRoleRef.current;
    if (!rid) return;

    await supabase.from('rooms').update(serializePublicState(nextGame)).eq('id', rid);

    if (role === 'killer') {
      await supabase.from('killer_secrets').upsert({
        room_id: rid,
        identity_suspect_id: nextGame.killer.identitySuspectId,
        disguise_card_id: nextGame.killer.disguiseCardSuspectId,
        hand: nextGame.killer.hand,
      });
    } else {
      await supabase.from('inspector_secrets').upsert({
        room_id: rid,
        identity_suspect_id: nextGame.inspector.secretIdentitySuspectId,
        hand: nextGame.inspector.hand,
      });
    }
  }

  function applyAndPush(applyFn, soundFn) {
    setGame((prev) => {
      if (!prev) return prev;
      const { ok, game: next } = applyFn(prev);
      if (!ok) return prev;
      if (soundFn) soundFn();
      const role = myRoleRef.current;
      const withSide = {
        ...next,
        activeSide: calcActiveSide(role, next.phase, next.turn),
        humanRole: role,
      };
      pushState(withSide);
      return withSide;
    });
  }

  const setPending        = useCallback((a) => setGame(g => g ? { ...g, pendingAction: a, pendingShift: null } : g), []);
  const cancelPending     = useCallback(() => setGame(g => g ? { ...g, pendingAction: null, pendingShift: null, pendingExonerateDiscard: null } : g), []);
  const beginShift        = useCallback(() => setGame(g => g ? { ...g, pendingAction: 'shift', pendingShift: { step: 'axis' } } : g), []);
  const selectShiftLine   = useCallback((axis, index) => setGame(g => g?.pendingAction === 'shift' ? { ...g, pendingShift: { step: 'direction', axis, index } } : g), []);

  const selectShiftDirection = useCallback((direction) => {
    setGame((prev) => {
      if (!prev?.pendingShift || prev.pendingShift.step !== 'direction') return prev;
      const { axis, index } = prev.pendingShift;
      const { ok, game: next } = applyShift(prev, axis, index, direction);
      if (!ok) return prev;
      playShiftSound();
      const role = myRoleRef.current;
      const withSide = { ...next, activeSide: calcActiveSide(role, next.phase, next.turn), humanRole: role };
      pushState(withSide);
      return withSide;
    });
  }, []);

  const pickKillerIdentity = useCallback((id) => {
    applyAndPush(
      (prev) => prev.phase === PHASE.KILLER_PICK_DISGUISE
        ? applyKillerPickDisguise(prev, id)
        : applyKillerPickIdentity(prev, id),
      playClickSound
    );
  }, []);

  const executeBoardAction = useCallback((r, c) => {
    setGame((prev) => {
      if (!prev || prev.gameOver) return prev;
      const secrets = getActingSecrets(prev);
      const suspectId = prev.board[r]?.[c]?.suspectId;
      if (suspectId == null) return prev;
      let result, soundFn;
      if (prev.pendingAction === 'kill') {
        result  = applyKill(prev, suspectId, secrets.killerIdentityId, secrets.inspectorSecretId);
        soundFn = result.ok ? playKillSound : null;
      } else if (prev.pendingAction === 'arrest') {
        result  = applyArrest(prev, suspectId, secrets.killerIdentityId, secrets.inspectorSecretId);
        soundFn = result.ok ? (result.game.gameOver && result.game.winner === 'inspector' ? playArrestSuccessSound : playArrestFailSound) : null;
      } else return prev;
      if (!result?.ok) return prev;
      if (soundFn) soundFn();
      const role = myRoleRef.current;
      const withSide = { ...result.game, activeSide: calcActiveSide(role, result.game.phase, result.game.turn), humanRole: role };
      pushState(withSide);
      return withSide;
    });
  }, []);

  const pickInspectorIdentity = useCallback((id) => applyAndPush((prev) => applyInspectorPickIdentity(prev, id), playClickSound), []);
  const beginExonerate        = useCallback(() => setGame(g => g ? { ...g, pendingAction: 'exonerate', pendingExonerateDiscard: true } : g), []);
  const completeExonerate     = useCallback((id) => applyAndPush((prev) => applyExonerate(prev, id), playClickSound), []);
  const executeDisguise       = useCallback(() => applyAndPush((prev) => applyDisguise(prev, prev.killer, prev.inspector.secretIdentitySuspectId), playDisguiseSound), []);

  const leaveRoom = useCallback(() => {
    setRoomId(null); setMyRole(null); setGame(null);
    setStatus('idle'); setError(null);
    localSecretsRef.current = null;
  }, []);

  return {
    roomId, myRole, userId, status, error,
    createRoom, joinRoom, leaveRoom,
    game, isCoordTargetable, getActingSecrets,
    setPending, cancelPending, beginShift, selectShiftLine,
    selectShiftDirection, pickKillerIdentity, executeBoardAction,
    pickInspectorIdentity, beginExonerate, completeExonerate,
    executeDisguise, runAiTurn: () => {},
  };
}
