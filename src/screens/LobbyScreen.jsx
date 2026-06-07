import { useState } from 'react';
import { useFullscreen } from '../hooks/useFullscreen.js';
import { motion, AnimatePresence } from 'framer-motion';
import menuBg from '../assets/menu-bg.png';
import AmbientBackground from '../components/AmbientBackground.jsx';

function ScreenShell({ children, onBack, showBack = true }) {
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden"
      style={{
        backgroundImage: `url(${menuBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <AmbientBackground variant="lobby" density="full" className="z-[1]" />
      <div className="absolute inset-0 bg-black/40 z-[2]" />
      <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-[#07070F] to-transparent z-[2] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#07070F]/60 to-transparent z-[2] pointer-events-none" />

      {showBack && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-5 left-5 z-10 font-mono text-xs text-white/50 hover:text-white/90 transition-colors"
        >
          ← Geri
        </button>
      )}

      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
        className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full border border-white/15 bg-black/30 text-white/50 hover:text-noir-accent hover:border-noir-accent/40 font-mono text-sm backdrop-blur-sm transition-colors flex items-center justify-center"
      >
        ⛶
      </button>

      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}

function NoirTitle({ subtitle }) {
  return (
    <div className="text-center mb-6 anim-fade-in">
      <div className="font-mono text-[10px] tracking-[0.35em] text-white/35 uppercase mb-2">
        {subtitle}
      </div>
      <h1
        className="font-display font-bold text-white leading-none anim-flicker"
        style={{
          fontSize: 'clamp(42px, 9vw, 72px)',
          textShadow: '0 0 100px rgba(192,57,43,0.28), 0 4px 32px rgba(0,0,0,0.9)',
          letterSpacing: '0.08em',
        }}
      >
        NOIR
      </h1>
      <div className="w-12 h-px bg-[#C0392B]/80 mx-auto mt-3 mb-2" />
      <p className="font-mono text-[9px] tracking-[0.18em] text-white/30 uppercase">
        Kim katil · Kim dedektif
      </p>
    </div>
  );
}

export default function LobbyScreen({ onCreateRoom, onJoinRoom, onBack, status, error, roomId }) {
  const [joinCode, setJoinCode] = useState('');
  const [createCode, setCreateCode] = useState('');

  // ── Katılma bekleme ───────────────────────────────────────────────
  if (status === 'joining') {
    return (
      <ScreenShell onBack={onBack} showBack={false}>
        <motion.div className="text-center" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <NoirTitle subtitle="Çok Oyunculu" />
          <div className="flex items-center gap-2 justify-center mt-4">
            <div className="w-2 h-2 rounded-full bg-[#4090C8] anim-pulse" />
            <p className="font-mono text-xs text-white/40">Oyun başlatılıyor...</p>
          </div>
        </motion.div>
      </ScreenShell>
    );
  }

  // ── Oda bekleme ───────────────────────────────────────────────────
  if (status === 'waiting') {
    return (
      <ScreenShell onBack={onBack}>
        <motion.div className="text-center w-full max-w-md" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <NoirTitle subtitle="Çok Oyunculu" />
          <div className="w-full rounded-2xl border border-white/[0.06] bg-black/30 backdrop-blur-xl p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
            <p className="font-mono text-[9px] tracking-[0.22em] text-white/25 uppercase pb-3">Oda kodu</p>
            <p className="font-display text-5xl font-bold text-[#C0392B] tracking-[0.3em] text-center py-2">{roomId}</p>
            <p className="font-mono text-[10px] text-white/30 text-center mt-2">Bu kodu arkadaşına gönder</p>
          </div>
          <div className="flex items-center gap-2 justify-center mt-5">
            <div className="w-2 h-2 rounded-full bg-[#C0392B] anim-pulse" />
            <p className="font-mono text-xs text-white/40">Dedektif bekleniyor...</p>
          </div>
        </motion.div>
      </ScreenShell>
    );
  }

  // ── Ana lobi ─────────────────────────────────────────────────────
  return (
    <ScreenShell onBack={onBack}>
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <NoirTitle subtitle="Çok Oyunculu" />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-3 px-4 py-3 rounded-xl font-mono text-xs text-[#E05040] border"
              style={{ background: 'rgba(26,10,10,0.6)', borderColor: 'rgba(192,57,43,0.3)' }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ana konteyner — karşılama ekranıyla aynı kart */}
        <div className="w-full rounded-2xl border border-white/[0.06] bg-black/30 backdrop-blur-xl p-3 sm:p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45)] anim-fade-in" style={{ animationDelay: '0.15s' }}>
          <p className="font-mono text-[9px] tracking-[0.22em] text-white/25 uppercase px-1 pb-3">Oyun modu seç</p>

          <div className="flex flex-col gap-2">

            {/* Oda Oluştur */}
            <div className="w-full rounded-xl border border-red-900/35 bg-red-950/25 p-3 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🗡️</span>
                <div>
                  <div className="font-display text-base text-white/95 tracking-wide">Oda Oluştur</div>
                  <div className="font-mono text-[10px] text-white/35 mt-0.5">Katil olarak oyna</div>
                </div>
              </div>
              <input
                type="text"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value)}
                placeholder="Oda adı gir..."
                maxLength={20}
                className="w-full px-3 py-1.5 rounded-lg font-mono text-xs placeholder:text-white/20 focus:outline-none transition-colors mb-2"
                style={{ background: 'rgba(10,5,5,0.6)', border: '1px solid rgba(192,57,43,0.25)', color: '#E8E6DC' }}
                onFocus={e => e.target.style.borderColor = 'rgba(192,57,43,0.7)'}
                onBlur={e => e.target.style.borderColor = 'rgba(192,57,43,0.25)'}
                onKeyDown={e => e.key === 'Enter' && createCode.trim() && onCreateRoom(createCode.trim())}
              />
              <button
                onClick={() => createCode.trim() && onCreateRoom(createCode.trim())}
                disabled={status === 'creating' || !createCode.trim()}
                className="w-full py-1.5 rounded-lg font-mono text-[10px] tracking-[0.18em] uppercase transition-all disabled:opacity-30 border border-red-500/25 text-red-300/70 hover:border-red-400/50 hover:text-red-300 hover:bg-red-950/20"
              >
                Oluştur
              </button>
            </div>

            {/* Ayraç */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="font-mono text-[9px] text-white/20 tracking-widest">VEYA</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Odaya Katıl */}
            <div className="w-full rounded-xl border border-blue-900/35 bg-blue-950/25 p-3 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🔍</span>
                <div>
                  <div className="font-display text-base text-white/95 tracking-wide">Odaya Katıl</div>
                  <div className="font-mono text-[10px] text-white/35 mt-0.5">Dedektif olarak oyna</div>
                </div>
              </div>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Oda adını gir..."
                maxLength={20}
                className="w-full px-3 py-1.5 rounded-lg font-mono text-xs placeholder:text-white/20 focus:outline-none transition-colors mb-2"
                style={{ background: 'rgba(5,10,18,0.6)', border: '1px solid rgba(41,128,185,0.25)', color: '#E8E6DC' }}
                onFocus={e => e.target.style.borderColor = 'rgba(41,128,185,0.7)'}
                onBlur={e => e.target.style.borderColor = 'rgba(41,128,185,0.25)'}
                onKeyDown={e => e.key === 'Enter' && joinCode.trim() && onJoinRoom(joinCode.trim())}
              />
              <button
                onClick={() => joinCode.trim() && onJoinRoom(joinCode.trim())}
                disabled={!joinCode.trim()}
                className="w-full py-1.5 rounded-lg font-mono text-[10px] tracking-[0.18em] uppercase transition-all disabled:opacity-30 border border-blue-500/25 text-blue-300/70 hover:border-blue-400/50 hover:text-blue-300 hover:bg-blue-950/20"
              >
                Katıl
              </button>
            </div>

          </div>
        </div>

        <p className="mt-5 font-mono text-[9px] text-white/15 tracking-widest uppercase text-center anim-fade-in" style={{ animationDelay: '0.35s' }}>
          İki oyuncu farklı cihazlardan oynayabilir
        </p>
      </motion.div>
    </ScreenShell>
  );
}
