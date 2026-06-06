import { useState } from 'react';
import { useFullscreen } from './hooks/useFullscreen.js';
import menuBg from './assets/menu-bg.png';
import tekImg from './assets/tek.png';
import cokImg from './assets/cok.png';
import HowToPlayModal from './components/HowToPlayModal.jsx';
import AmbientBackground from './components/AmbientBackground.jsx';
import SetupScreen from './screens/SetupScreen';
import GameScreen  from './screens/GameScreen';
import EndScreen   from './screens/EndScreen';
import { useGameState } from './hooks/useGameState';
import { usePeerMultiplayer } from './hooks/usePeerMultiplayer';
import LobbyScreen from './screens/LobbyScreen';

function ModeOption({ onClick, image, imageAlt, title, subtitle, accent, imageScale = 1 }) {
  const styles = {
    red: {
      card: 'border-red-900/35 bg-red-950/25 hover:border-red-500/45 hover:bg-red-950/40 hover:shadow-[0_8px_32px_rgba(192,57,43,0.12)]',
      thumb: 'ring-red-500/25 group-hover:ring-red-400/40',
      title: 'group-hover:text-red-200',
      arrow: 'border-red-500/25 text-red-300/50 group-hover:border-red-400/50 group-hover:text-red-300',
    },
    blue: {
      card: 'border-blue-900/35 bg-blue-950/25 hover:border-blue-500/45 hover:bg-blue-950/40 hover:shadow-[0_8px_32px_rgba(41,128,185,0.12)]',
      thumb: 'ring-blue-500/25 group-hover:ring-blue-400/40',
      title: 'group-hover:text-blue-200',
      arrow: 'border-blue-500/25 text-blue-300/50 group-hover:border-blue-400/50 group-hover:text-blue-300',
    },
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative w-full flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl text-left
        border backdrop-blur-md transition-all duration-300
        hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
        ${styles.card}
      `}
    >
      <div
        className={`
          relative flex-shrink-0 w-[4.25rem] h-[4.25rem] sm:w-[4.75rem] sm:h-[4.75rem] rounded-lg overflow-hidden ring-1
          transition-all duration-300 group-hover:scale-[1.04]
          ${styles.thumb}
        `}
      >
        <img
          src={image}
          alt={imageAlt}
          className="w-full h-full object-cover"
          style={
            imageScale !== 1
              ? { transform: `scale(${imageScale})`, transformOrigin: 'center center' }
              : undefined
          }
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/35 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="flex-1 min-w-0 py-0.5">
        <div className={`font-display text-base sm:text-[17px] text-white/95 tracking-wide transition-colors ${styles.title}`}>
          {title}
        </div>
        <div className="font-mono text-[10px] text-white/40 tracking-wide mt-0.5 truncate">
          {subtitle}
        </div>
      </div>

      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center
          transition-all duration-300 group-hover:translate-x-0.5
          ${styles.arrow}
        `}
      >
        <span className="text-sm leading-none ml-px">›</span>
      </div>
    </button>
  );
}

function MainMenu({ onSelect }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-5 py-10"
      style={{
        backgroundImage: `url(${menuBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <AmbientBackground variant="menu" density="full" className="z-[1]" />
      <div className="absolute inset-0 bg-black/50 z-[2]" />
      <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-[#07070F] to-transparent z-[2] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#07070F]/60 to-transparent z-[2] pointer-events-none" />

      {/* Sağ üst: Sadece tam ekran butonu — köşeli [] stili */}
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
        className="absolute top-5 right-5 z-10 flex items-center justify-center w-8 h-8 rounded-lg border border-noir-border/50 bg-white/[0.04] font-mono text-base text-[#9090A8] hover:text-white hover:border-white/25 hover:bg-white/[0.08] transition-all"
      >
        {isFullscreen ? '⧡' : '⬜'}
      </button>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <div className="text-center mb-10 sm:mb-12 anim-fade-in">
          <div className="font-mono text-[10px] tracking-[0.35em] text-white/35 uppercase mb-3">
            1940 · Dedüksiyon Oyunu
          </div>
          <h1
            className="font-display font-bold text-white leading-none anim-flicker"
            style={{
              fontSize: 'clamp(56px, 12vw, 96px)',
              textShadow: '0 0 100px rgba(200,168,75,0.22), 0 4px 32px rgba(0,0,0,0.9)',
              letterSpacing: '0.08em',
            }}
          >
            NOIR
          </h1>
          <div className="w-16 h-px bg-noir-accent/80 mx-auto mt-4 mb-3" />
          <p className="font-mono text-[10px] tracking-[0.18em] text-white/30 uppercase">
            Kim katil · Kim dedektif
          </p>
        </div>

        <div
          className="w-full rounded-2xl border border-white/[0.06] bg-black/30 backdrop-blur-xl p-3 sm:p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45)] anim-fade-in"
          style={{ animationDelay: '0.15s' }}
        >
          <p className="font-mono text-[9px] tracking-[0.22em] text-white/25 uppercase px-1 pb-3">
            Oyun modu seç
          </p>
          <div className="flex flex-col gap-2.5">
            <ModeOption
              accent="red"
              image={tekImg}
              imageAlt="Tek Oyunculu"
              title="Tek Oyunculu"
              subtitle="Yapay zekaya karşı"
              imageScale={1.14}
              onClick={() => onSelect('solo')}
            />
            <ModeOption
              accent="blue"
              image={cokImg}
              imageAlt="Çok Oyunculu"
              title="Çok Oyunculu"
              subtitle="Arkadaşınla çevrimiçi"
              onClick={() => onSelect('multi')}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="mt-5 w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] font-mono text-[10px] tracking-[0.2em] text-white/45 uppercase hover:text-white/70 hover:border-white/15 hover:bg-white/[0.06] transition-all anim-fade-in"
          style={{ animationDelay: '0.28s' }}
        >
          Nasıl oynanır?
        </button>

        {rulesOpen && <HowToPlayModal onClose={() => setRulesOpen(false)} />}

        <p
          className="mt-6 font-mono text-[9px] text-white/15 tracking-widest uppercase anim-fade-in"
          style={{ animationDelay: '0.35s' }}
        >
          Vercel · React
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState('menu');
  const solo = useGameState();
  const multi = usePeerMultiplayer();

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

  // MULTIPLAYER
  if (mode === 'multi') {
    if (multi.game?.gameOver) {
      return (
        <div className="grain">
          <EndScreen game={multi.game} onReset={() => { multi.leaveRoom(); setMode('menu'); }} />
        </div>
      );
    }

    if (multi.status !== 'playing') {
      return (
        <div className="grain">
          <LobbyScreen
            status={multi.status}
            error={multi.error}
            roomId={multi.roomId}
            onCreateRoom={(name) => multi.createRoom(name ?? 'oda')}
            onJoinRoom={(name) => multi.joinRoom(name)}
            onBack={() => { multi.leaveRoom(); setMode('menu'); }}
          />
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
          onQuit={() => { multi.leaveRoom(); setMode('menu'); }}
          isMultiplayer={true}
          myRole={multi.myRole}
          roomId={multi.roomId}
        />
      </div>
    );
  }
}