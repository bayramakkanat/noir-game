import { useState } from 'react';
import menuBg from './assets/menu-bg.png';
import SetupScreen from './screens/SetupScreen';
import GameScreen  from './screens/GameScreen';
import EndScreen   from './screens/EndScreen';
import LobbyScreen from './screens/LobbyScreen';
import { useGameState } from './hooks/useGameState';
import { useMultiplayer } from './hooks/useMultiplayer';

function MainMenu({ onSelect }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${menuBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/55 z-0" />
      <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-[#07070F] to-transparent z-0 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#07070F]/60 to-transparent z-0 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-8">

        {/* Başlık */}
        <div className="text-center mb-14 anim-fade-in">
          <div className="font-mono text-[10px] tracking-[0.4em] text-white/35 uppercase mb-4">
            1940 · Dedüksiyon Oyunu
          </div>
          <h1
            className="font-display font-bold text-white leading-none anim-flicker"
            style={{
              fontSize: 'clamp(72px, 14vw, 120px)',
              textShadow: '0 0 120px rgba(200,168,75,0.25), 0 4px 40px rgba(0,0,0,0.9)',
              letterSpacing: '0.1em',
            }}
          >
            NOIR
          </h1>
          <div className="w-20 h-px bg-noir-accent mx-auto mt-4 mb-4" />
          <p className="font-mono text-[11px] tracking-[0.2em] text-white/25 uppercase">
            Kim katil · Kim dedektif
          </p>
        </div>

        {/* Mod kartları — yatay dikdörtgen */}
        <div className="w-full grid grid-cols-2 gap-5 anim-fade-in" style={{ animationDelay: '0.2s' }}>

          {/* Tek oyunculu */}
          <button
            onClick={() => onSelect('solo')}
            className="group relative flex flex-row items-center gap-5 px-8 py-6 rounded-2xl text-left transition-all duration-300 overflow-hidden"
            style={{
              background: 'rgba(18,8,8,0.72)',
              border: '0.5px solid rgba(192,57,43,0.3)',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.border = '0.5px solid rgba(192,57,43,0.8)';
              e.currentTarget.style.background = 'rgba(30,8,8,0.85)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.border = '0.5px solid rgba(192,57,43,0.3)';
              e.currentTarget.style.background = 'rgba(18,8,8,0.72)';
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: 'rgba(192,57,43,0.15)', border: '0.5px solid rgba(192,57,43,0.35)' }}
            >
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl text-white mb-1 group-hover:text-[#E05040] transition-colors">
                Tek Oyunculu
              </div>
              <div className="font-mono text-[10px] text-white/35 leading-relaxed tracking-wide">
                Yapay zekaya karşı oyna
              </div>
            </div>
            <div className="text-white/20 group-hover:text-[#E05040] transition-colors text-lg">→</div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
              style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(192,57,43,0.07) 0%, transparent 70%)' }} />
          </button>

          {/* Çok oyunculu */}
          <button
            onClick={() => onSelect('multi')}
            className="group relative flex flex-row items-center gap-5 px-8 py-6 rounded-2xl text-left transition-all duration-300 overflow-hidden"
            style={{
              background: 'rgba(8,12,20,0.72)',
              border: '0.5px solid rgba(41,128,185,0.3)',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.border = '0.5px solid rgba(41,128,185,0.8)';
              e.currentTarget.style.background = 'rgba(8,14,28,0.85)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.border = '0.5px solid rgba(41,128,185,0.3)';
              e.currentTarget.style.background = 'rgba(8,12,20,0.72)';
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: 'rgba(41,128,185,0.15)', border: '0.5px solid rgba(41,128,185,0.35)' }}
            >
              👥
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl text-white mb-1 group-hover:text-[#4090C8] transition-colors">
                Çok Oyunculu
              </div>
              <div className="font-mono text-[10px] text-white/35 leading-relaxed tracking-wide">
                Arkadaşınla oyna
              </div>
            </div>
            <div className="text-white/20 group-hover:text-[#4090C8] transition-colors text-lg">→</div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
              style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(41,128,185,0.07) 0%, transparent 70%)' }} />
          </button>
        </div>

        <p className="mt-10 font-mono text-[9px] text-white/15 tracking-widest uppercase anim-fade-in"
          style={{ animationDelay: '0.4s' }}>
          Vercel · Supabase · React
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState('menu');
  const solo  = useGameState();
  const multi = useMultiplayer();

  if (mode === 'menu') {
    return <div className="grain"><MainMenu onSelect={setMode} /></div>;
  }

  if (mode === 'solo') {
    const soloScreen = !solo.game ? 'setup' : solo.game.gameOver ? 'end' : 'game';
    return (
      <div className="grain">
        {soloScreen === 'setup' && (
          <SetupScreen onStart={solo.startGame} onBack={() => { solo.resetGame(); setMode('menu'); }} />
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
          <EndScreen game={solo.game} onReset={() => { solo.resetGame(); setMode('menu'); }} />
        )}
      </div>
    );
  }

  if (mode === 'multi') {
    if (multi.status === 'waiting' || !multi.game) {
      return (
        <div className="grain">
          <LobbyScreen
            status={multi.status}
            error={multi.error}
            roomId={multi.roomId}
            onCreateRoom={multi.createRoom}
            onJoinRoom={multi.joinRoom}
            onBack={() => { multi.leaveRoom(); setMode('menu'); }}
          />
        </div>
      );
    }
    if (multi.game?.gameOver) {
      return (
        <div className="grain">
          <EndScreen game={multi.game} onReset={() => { multi.leaveRoom(); setMode('menu'); }} />
        </div>
      );
    }
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
