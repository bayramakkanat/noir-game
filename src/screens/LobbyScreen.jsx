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
      <div className="absolute inset-0 bg-black/50 z-[2]" />
      <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-[#07070F] to-transparent z-[2] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#07070F]/60 to-transparent z-[2] pointer-events-none" />

      {/* Sol üst: Geri */}
      {showBack && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-5 left-5 z-10 font-mono text-xs text-white/50 hover:text-white/90 transition-colors"
        >
          ← Geri
        </button>
      )}

      {/* Sağ üst: Tam ekran — SetupScreen ile aynı stil */}
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
    <div className="text-center mb-10 anim-fade-in">
      <div className="font-mono text-[10px] tracking-[0.35em] text-white/35 uppercase mb-3">
        {subtitle}
      </div>
      <h1
        className="font-display font-bold text-white leading-none anim-flicker"
        style={{
          fontSize: 'clamp(56px, 12vw, 96px)',
          textShadow: '0 0 100px rgba(192,57,43,0.28), 0 4px 32px rgba(0,0,0,0.9)',
          letterSpacing: '0.08em',
        }}
      >
        NOIR
      </h1>
      <div className="w-16 h-px bg-[#C0392B]/80 mx-auto mt-4 mb-3" />
      <p className="font-mono text-[10px] tracking-[0.18em] text-white/30 uppercase">
        Kim katil · Kim dedektif
      </p>
    </div>
  );
}

export default function LobbyScreen({ onCreateRoom, onJoinRoom, onBack, status, error, roomId }) {
  const [joinCode, setJoinCode] = useState('');
  const [createCode, setCreateCode] = useState('');

  // ── Katılma bekleme ekranı ───────────────────────────────────────
  if (status === 'joining') {
    return (
      <ScreenShell onBack={onBack} showBack={false}>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <NoirTitle subtitle="Çok Oyunculu" />
          <div className="flex items-center gap-2 justify-center mt-4">
            <div className="w-2 h-2 rounded-full bg-[#4090C8] anim-pulse" />
            <p className="font-mono text-xs text-white/40">Oyun başlatılıyor...</p>
          </div>
        </motion.div>
      </ScreenShell>
    );
  }

  // ── Oda bekleme ekranı ───────────────────────────────────────────
  if (status === 'waiting') {
    return (
      <ScreenShell onBack={onBack}>
        <motion.div
          className="text-center w-full max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <NoirTitle subtitle="Çok Oyunculu" />

          <div
            className="w-full rounded-2xl border border-white/[0.06] bg-black/30 backdrop-blur-xl p-3 sm:p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45)] anim-fade-in"
          >
            <p className="font-mono text-[9px] tracking-[0.22em] text-white/25 uppercase px-1 pb-3">
              Oda kodu
            </p>
            <p className="font-display text-5xl font-bold text-[#C0392B] tracking-[0.3em] text-center py-3">
              {roomId}
            </p>
            <p className="font-mono text-[10px] text-white/30 text-center mt-2">
              Bu kodu arkadaşına gönder
            </p>
          </div>

          <div className="flex items-center gap-2 justify-center mt-6">
            <div className="w-2 h-2 rounded-full bg-[#C0392B] anim-pulse" />
            <p className="font-mono text-xs text-white/40">Dedektif bekleniyor...</p>
          </div>
        </motion.div>
      </ScreenShell>
    );
  }

  // ── Ana lobi ekranı ──────────────────────────────────────────────
  return (
    <ScreenShell onBack={onBack}>
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <NoirTitle subtitle="Çok Oyunculu" />

        {/* Hata */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 px-4 py-3 rounded-xl font-mono text-xs text-[#E05040] border"
              style={{ background: 'rgba(26,10,10,0.6)', borderColor: 'rgba(192,57,43,0.3)' }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kart kutusu — Ana menüdeki gibi tek konteyner */}
        <div
          className="w-full rounded-2xl border border-white/[0.06] bg-black/30 backdrop-blur-xl p-3 sm:p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45)] anim-fade-in"
          style={{ animationDelay: '0.15s' }}
        >
          <p className="font-mono text-[9px] tracking-[0.22em] text-white/25 uppercase px-1 pb-3">
            Oyun modu seç
          </p>

          {/* Oda Oluştur */}
          <div className="flex flex-col gap-2.5">

            {/* Oda adı input + Oluştur — kırmızı aksan */}
            <div
              className="group relative w-full rounded-xl border border-red-900/35 bg-red-950/25 p-3 sm:p-3.5 transition-all duration-300"
            >
              <div className="flex items-center gap-3.5 mb-3">
                <div className="relative flex-shrink-0 w-[4.25rem] h-[4.25rem] sm:w-[4.75rem] sm:h-[4.75rem] rounded-lg overflow-hidden bg-red-950/40 ring-1 ring-red-500/25 flex items-center justify-center">
                  <span className="text-3xl">🗡️</span>
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="font-display text-base sm:text-[17px] text-white/95 tracking-wide">
                    Oda Oluştur
                  </div>
                  <div className="font-mono text-[10px] text-white/40 tracking-wide mt-0.5">
                    Katil olarak oyna
                  </div>
                </div>
              </div>
              <input
                type="text"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value)}
                placeholder="Oda adı gir..."
                maxLength={20}
                className="w-full px-3 py-2 rounded-lg font-mono text-xs placeholder:text-white/20 focus:outline-none transition-colors mb-2"
                style={{
                  background: 'rgba(10,5,5,0.6)',
                  border: '1px solid rgba(192,57,43,0.25)',
                  color: '#E8E6DC',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(192,57,43,0.7)'}
                onBlur={e => e.target.style.borderColor = 'rgba(192,57,43,0.25)'}
                onKeyDown={e => e.key === 'Enter' && createCode.trim() && onCreateRoom(createCode.trim())}
              />
              <button
                onClick={() => createCode.trim() && onCreateRoom(createCode.trim())}
                disabled={status === 'creating' || !createCode.trim()}
                className="w-full py-2 rounded-lg font-mono text-[10px] tracking-[0.18em] uppercase transition-all disabled:opacity-30 border border-red-500/25 text-red-300/70 hover:border-red-400/50 hover:text-red-300 hover:bg-red-950/20"
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

            {/* Odaya Katıl — mavi aksan */}
            <div className="group relative w-full rounded-xl border border-blue-900/35 bg-blue-950/25 p-3 sm:p-3.5 transition-all duration-300">
              <div className="flex items-center gap-3.5 mb-3">
                <div className="relative flex-shrink-0 w-[4.25rem] h-[4.25rem] sm:w-[4.75rem] sm:h-[4.75rem] rounded-lg overflow-hidden bg-blue-950/40 ring-1 ring-blue-500/25 flex items-center justify-center">
                  <span className="text-3xl">🔍</span>
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="font-display text-base sm:text-[17px] text-white/95 tracking-wide">
                    Odaya Katıl
                  </div>
                  <div className="font-mono text-[10px] text-white/40 tracking-wide mt-0.5">
                    Dedektif olarak oyna
                  </div>
                </div>
              </div>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Oda adını gir..."
                maxLength={20}
                className="w-full px-3 py-2 rounded-lg font-mono text-xs placeholder:text-white/20 focus:outline-none transition-colors mb-2"
                style={{
                  background: 'rgba(5,10,18,0.6)',
                  border: '1px solid rgba(41,128,185,0.25)',
                  color: '#E8E6DC',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(41,128,185,0.7)'}
                onBlur={e => e.target.style.borderColor = 'rgba(41,128,185,0.25)'}
                onKeyDown={e => e.key === 'Enter' && joinCode.trim() && onJoinRoom(joinCode.trim())}
              />
              <button
                onClick={() => joinCode.trim() && onJoinRoom(joinCode.trim())}
                disabled={!joinCode.trim()}
                className="w-full py-2 rounded-lg font-mono text-[10px] tracking-[0.18em] uppercase transition-all disabled:opacity-30 border border-blue-500/25 text-blue-300/70 hover:border-blue-400/50 hover:text-blue-300 hover:bg-blue-950/20"
              >
                Katıl
              </button>
            </div>
          </div>
        </div>

        <p
          className="mt-6 font-mono text-[9px] text-white/15 tracking-widest uppercase anim-fade-in text-center"
          style={{ animationDelay: '0.35s' }}
        >
          İki oyuncu farklı cihazlardan oynayabilir
        </p>
      </motion.div>
    </ScreenShell>
  );
}
