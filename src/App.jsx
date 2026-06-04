import { useState } from 'react';
import SetupScreen from './screens/SetupScreen';
import GameScreen  from './screens/GameScreen';
import EndScreen   from './screens/EndScreen';
import LobbyScreen from './screens/LobbyScreen';
import { useGameState } from './hooks/useGameState';
import { useMultiplayer } from './hooks/useMultiplayer';

export default function App() {
  const [mode, setMode] = useState('menu'); // 'menu' | 'solo' | 'multi'

  // Solo oyun
  const solo = useGameState();

  // Multiplayer
  const multi = useMultiplayer();

  // ── MENU ──────────────────────────────────────────────────────────────────
  if (mode === 'menu') {
    return (
      <div className="grain min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm anim-fade-in">
          <div className="text-center mb-10">
            <h1 className="font-display text-7xl font-bold text-noir-text anim-flicker leading-none mb-2">
              NOIR
            </h1>
            <div className="w-16 h-px bg-noir-accent mx-auto mb-3" />
            <p className="font-mono text-[10px] text-noir-muted tracking-widest uppercase">
              Dedüksiyon Oyunu
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode('solo')}
              className="w-full flex items-start gap-4 p-5 bg-noir-card border border-noir-border rounded-xl hover:border-noir-accent hover:bg-noir-surface transition-all duration-200 group text-left"
            >
              <div className="text-3xl mt-0.5">🤖</div>
              <div>
                <div className="font-display text-lg text-noir-text group-hover:text-noir-accent transition-colors">
                  Tek Oyunculu
                </div>
                <div className="font-body text-xs text-noir-muted mt-1 leading-relaxed">
                  Yapay zekaya karşı oyna.
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('multi')}
              className="w-full flex items-start gap-4 p-5 bg-noir-card border border-noir-border rounded-xl hover:border-noir-accent hover:bg-noir-surface transition-all duration-200 group text-left"
            >
              <div className="text-3xl mt-0.5">👥</div>
              <div>
                <div className="font-display text-lg text-noir-text group-hover:text-noir-accent transition-colors">
                  Çok Oyunculu
                </div>
                <div className="font-body text-xs text-noir-muted mt-1 leading-relaxed">
                  Farklı cihazlardan arkadaşınla oyna.
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SOLO ──────────────────────────────────────────────────────────────────
  if (mode === 'solo') {
    const soloScreen = !solo.game ? 'setup' : solo.game.gameOver ? 'end' : 'game';
    return (
      <div className="grain">
        {soloScreen === 'setup' && (
          <SetupScreen
            onStart={solo.startGame}
            onBack={() => setMode('menu')}
          />
        )}
        {soloScreen === 'game' && (
          <GameScreen
            game={solo.game}
            actions={{
              setPending: solo.setPending,
              cancelPending: solo.cancelPending,
              beginShift: solo.beginShift,
              selectShiftLine: solo.selectShiftLine,
              selectShiftDirection: solo.selectShiftDirection,
              pickKillerIdentity: solo.pickKillerIdentity,
              executeBoardAction: solo.executeBoardAction,
              pickInspectorIdentity: solo.pickInspectorIdentity,
              beginExonerate: solo.beginExonerate,
              completeExonerate: solo.completeExonerate,
              executeDisguise: solo.executeDisguise,
              runAiTurn: solo.runAiTurn,
              getActingSecrets: solo.getActingSecrets,
              isCoordTargetable: solo.isCoordTargetable,
            }}
          />
        )}
        {soloScreen === 'end' && (
          <EndScreen
            game={solo.game}
            onReset={() => { solo.resetGame(); setMode('menu'); }}
          />
        )}
      </div>
    );
  }

  // ── MULTIPLAYER ───────────────────────────────────────────────────────────
  if (mode === 'multi') {
    // Lobby
    if (!multi.game || multi.status === 'waiting') {
      return (
        <div className="grain">
          <LobbyScreen
            status={multi.status}
            error={multi.error}
            roomId={multi.roomId}
            onCreateRoom={multi.createRoom}
            onJoinRoom={multi.joinRoom}
            onBack={() => setMode('menu')}
          />
        </div>
      );
    }

    // Oyun bitti
    if (multi.game.gameOver) {
      return (
        <div className="grain">
          <EndScreen
            game={multi.game}
            onReset={() => { multi.leaveRoom(); setMode('menu'); }}
          />
        </div>
      );
    }

    // Oyun ekranı
    return (
      <div className="grain">
        <GameScreen
          game={multi.game}
          actions={{
            setPending: multi.setPending,
            cancelPending: multi.cancelPending,
            beginShift: multi.beginShift,
            selectShiftLine: multi.selectShiftLine,
            selectShiftDirection: multi.selectShiftDirection,
            pickKillerIdentity: multi.pickKillerIdentity,
            executeBoardAction: multi.executeBoardAction,
            pickInspectorIdentity: multi.pickInspectorIdentity,
            beginExonerate: multi.beginExonerate,
            completeExonerate: multi.completeExonerate,
            executeDisguise: multi.executeDisguise,
            runAiTurn: multi.runAiTurn,
            getActingSecrets: multi.getActingSecrets,
            isCoordTargetable: multi.isCoordTargetable,
          }}
          isMultiplayer={true}
          myRole={multi.myRole}
          roomId={multi.roomId}
        />
      </div>
    );
  }
}
