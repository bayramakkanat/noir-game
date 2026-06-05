import { useState } from 'react';
import menuBg from './assets/menu-bg.png';
import tekImg from './assets/tek.png';
import cokImg from './assets/cok.png';
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

        {/* Mod kartları — dikey, görsel ağırlıklı */}
        <div className="w-full grid grid-cols-2 gap-5 anim-fade-in" style={{ animationDelay: '0.2s' }}>

          {/* Tek oyunculu */}
          <button
            onClick={() => onSelect('solo')}
            className="group relative flex flex-col rounded-2xl text-left transition-all duration-500 overflow-hidden"
            style={{
              background: 'rgba(14,6,6,0.80)',
              border: '1px solid rgba(192,57,43,0.25)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.border = '1px solid rgba(192,57,43,0.7)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(192,57,43,0.18), 0 8px 40px rgba(0,0,0,0.7)';
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.border = '1px solid rgba(192,57,43,0.25)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.6)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Görsel alan */}
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
              <img
                src={tekImg}
                alt="Tek Oyunculu"
                className="w-full h-full object-cover"
                style={{ display: 'block', transform: 'scale(1.13)', transformOrigin: 'center center', transition: 'transform 700ms ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1.13)'; }}
              />
              {/* Alt gradient geçişi */}
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to bottom, transparent 50%, rgba(14,6,6,0.95) 100%)'
              }} />
              {/* Köşe aksan çizgisi */}
              <div className="absolute top-0 left-0 w-8 h-px" style={{ background: 'rgba(192,57,43,0.6)' }} />
              <div className="absolute top-0 left-0 w-px h-8" style={{ background: 'rgba(192,57,43,0.6)' }} />
            </div>

            {/* Metin alanı */}
            <div className="flex flex-row items-center gap-3 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div
                  className="font-display text-lg text-white mb-0.5 transition-colors duration-300 group-hover:text-[#E05040]"
                  style={{ letterSpacing: '0.05em' }}
                >
                  Tek Oyunculu
                </div>
                <div className="font-mono text-[10px] text-white/35 tracking-wider uppercase">
                  Yapay zekaya karşı oyna
                </div>
              </div>
              <div
                className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-300"
                style={{ border: '1px solid rgba(192,57,43,0.3)' }}
              >
                <span className="text-white/30 group-hover:text-[#E05040] transition-colors text-sm leading-none" style={{ marginLeft: '1px' }}>›</span>
              </div>
            </div>

            {/* Hover glow overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
              style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(192,57,43,0.06) 0%, transparent 70%)' }} />
          </button>

          {/* Çok oyunculu */}
          <button
            onClick={() => onSelect('multi')}
            className="group relative flex flex-col rounded-2xl text-left transition-all duration-500 overflow-hidden"
            style={{
              background: 'rgba(6,8,16,0.80)',
              border: '1px solid rgba(41,128,185,0.25)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.border = '1px solid rgba(41,128,185,0.7)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(41,128,185,0.18), 0 8px 40px rgba(0,0,0,0.7)';
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.border = '1px solid rgba(41,128,185,0.25)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.6)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Görsel alan */}
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
              <img
                src={cokImg}
                alt="Çok Oyunculu"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ display: 'block' }}
              />
              {/* Alt gradient geçişi */}
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to bottom, transparent 50%, rgba(6,8,16,0.95) 100%)'
              }} />
              {/* Köşe aksan çizgisi */}
              <div className="absolute top-0 right-0 w-8 h-px" style={{ background: 'rgba(41,128,185,0.6)' }} />
              <div className="absolute top-0 right-0 w-px h-8" style={{ background: 'rgba(41,128,185,0.6)' }} />
            </div>

            {/* Metin alanı */}
            <div className="flex flex-row items-center gap-3 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div
                  className="font-display text-lg text-white mb-0.5 transition-colors duration-300 group-hover:text-[#4090C8]"
                  style={{ letterSpacing: '0.05em' }}
                >
                  Çok Oyunculu
                </div>
                <div className="font-mono text-[10px] text-white/35 tracking-wider uppercase">
                  Arkadaşınla oyna
                </div>
              </div>
              <div
                className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-300"
                style={{ border: '1px solid rgba(41,128,185,0.3)' }}
              >
                <span className="text-white/30 group-hover:text-[#4090C8] transition-colors text-sm leading-none" style={{ marginLeft: '1px' }}>›</span>
              </div>
            </div>

            {/* Hover glow overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
              style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(41,128,185,0.06) 0%, transparent 70%)' }} />
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
            onQuit={() => { solo.resetGame(); setMode('menu'); }}
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
