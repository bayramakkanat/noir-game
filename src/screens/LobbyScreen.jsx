import { useState } from 'react';
import { useFullscreen } from '../hooks/useFullscreen.js';
import { motion, AnimatePresence } from 'framer-motion';
import menuBg from '../assets/menu-bg.png';
import AmbientBackground from '../components/AmbientBackground.jsx';

// Tüm ekranlar için ortak wrapper
function ScreenShell({ children, onBack, showBack = true }) {
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{
        backgroundImage: `url(${menuBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <AmbientBackground variant="lobby" density="full" className="z-[1]" />
      <div className="absolute inset-0 bg-black/55 z-[2]" />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0A0A10] to-transparent z-[2] pointer-events-none" />

      {/* Üst bar */}
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="font-mono text-xs text-white/50 hover:text-white/90 transition-colors"
          >
            ← Geri
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
          className="w-9 h-9 rounded-full border border-white/15 bg-black/30 text-white/50 hover:text-[#C0392B] hover:border-[#C0392B]/40 font-mono text-sm backdrop-blur-sm transition-colors flex items-center justify-center"
        >
          {isFullscreen ? '⊡' : '⊞'}
        </button>
      </div>

      {/* İçerik */}
      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}

// Başlık bloğu
function NoirTitle({ subtitle }) {
  return (
    <div className="text-center mb-10 anim-fade-in">
      <div className="font-mono text-xs tracking-[0.3em] text-white/40 mb-3 uppercase">
        {subtitle}
      </div>
      <h1
        className="font-display text-8xl font-bold text-white anim-flicker mb-3 drop-shadow-2xl"
        style={{ textShadow: '0 0 80px rgba(192,57,43,0.35), 0 2px 20px rgba(0,0,0,0.8)' }}
      >
        NOIR
      </h1>
      <div className="w-16 h-px bg-[#C0392B] mx-auto" />
    </div>
  );
}

export default function LobbyScreen({ onCreateRoom, onJoinRoom, onBack, status, error, roomId }) {
  const [joinCode, setJoinCode] = useState('');
  const [createCode, setCreateCode] = useState('');

  // ── Katılma bekleme ekranı ──────────────────────────────────────
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

  // ── Oda bekleme ekranı ─────────────────────────────────────────
  if (status === 'waiting') {
    return (
      <ScreenShell onBack={onBack}>
        <motion.div
          className="text-center w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <NoirTitle subtitle="Çok Oyunculu" />

          <motion.div
            className="mb-6 p-6 rounded-2xl backdrop-blur-sm text-left"
            style={{
              background: 'rgba(26,10,10,0.75)',
              border: '1px solid rgba(192,57,43,0.4)',
            }}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-3 text-center">
              Oda Kodu
            </p>
            <p className="font-display text-5xl font-bold text-[#C0392B] tracking-[0.3em] text-center">
              {roomId}
            </p>
          </motion.div>

          <p className="font-mono text-xs text-white/40 mb-2">
            Bu kodu arkadaşına gönder
          </p>
          <div className="flex items-center gap-2 justify-center mt-4">
            <div className="w-2 h-2 rounded-full bg-[#C0392B] anim-pulse" />
            <p className="font-mono text-xs text-white/40">Dedektif bekleniyor...</p>
          </div>
        </motion.div>
      </ScreenShell>
    );
  }

  // ── Ana lobi ekranı ────────────────────────────────────────────
  return (
    <ScreenShell onBack={onBack}>
      <motion.div
        className="w-full max-w-sm"
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
              className="mb-4 px-4 py-3 rounded-lg font-mono text-xs text-[#E05040]"
              style={{ background: 'rgba(26,10,10,0.75)', border: '1px solid rgba(192,57,43,0.3)' }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Oda oluştur */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div
            className="w-full p-5 rounded-xl border backdrop-blur-sm"
            style={{ background: 'rgba(26,10,10,0.75)', borderColor: 'rgba(192,57,43,0.4)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🗡️</span>
              <div>
                <div className="font-display text-lg text-white">Oda Oluştur</div>
                <div className="font-body text-xs text-white/40 mt-0.5">Katil olarak oyna.</div>
              </div>
            </div>
            <input
              type="text"
              value={createCode}
              onChange={(e) => setCreateCode(e.target.value)}
              placeholder="Oda adı gir..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-lg font-mono text-sm placeholder:text-white/20 focus:outline-none mb-3 transition-colors"
              style={{ background: 'rgba(10,10,20,0.8)', border: '1px solid rgba(192,57,43,0.3)', color: '#E8E6DC' }}
              onFocus={e => e.target.style.borderColor = 'rgba(192,57,43,0.8)'}
              onBlur={e => e.target.style.borderColor = 'rgba(192,57,43,0.3)'}
              onKeyDown={e => e.key === 'Enter' && createCode.trim() && onCreateRoom(createCode.trim())}
            />
            <button
              onClick={() => createCode.trim() && onCreateRoom(createCode.trim())}
              disabled={status === 'creating' || !createCode.trim()}
              className="w-full py-3 rounded-lg font-mono text-sm tracking-wide transition-all disabled:opacity-40"
              style={{ background: 'rgba(26,10,10,0.8)', border: '1px solid rgba(192,57,43,0.4)', color: '#E05040' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.borderColor = 'rgba(192,57,43,0.8)'; }}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.4)'}
            >
              Oluştur
            </button>
          </div>
        </motion.div>

        {/* Ayraç */}
        <motion.div
          className="flex items-center gap-3 my-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex-1 h-px bg-white/10" />
          <span className="font-mono text-[10px] text-white/20 tracking-widest">VEYA</span>
          <div className="flex-1 h-px bg-white/10" />
        </motion.div>

        {/* Odaya katıl */}
        <motion.div
          className="p-5 rounded-xl border backdrop-blur-sm"
          style={{
            background: 'rgba(10,16,26,0.75)',
            borderColor: 'rgba(41,128,185,0.4)',
          }}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔍</span>
            <div>
              <div className="font-display text-lg text-white">Odaya Katıl</div>
              <div className="font-body text-xs text-white/40">Dedektif olarak oyna.</div>
            </div>
          </div>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Oda kodunu gir..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-lg font-mono text-lg tracking-[0.2em] placeholder:text-white/20 placeholder:tracking-normal focus:outline-none mb-3 transition-colors"
            style={{
              background: 'rgba(10,10,20,0.8)',
              border: '1px solid rgba(41,128,185,0.3)',
              color: '#E8E6DC',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(41,128,185,0.8)'}
            onBlur={e => e.target.style.borderColor = 'rgba(41,128,185,0.3)'}
          />
          <button
            onClick={() => onJoinRoom(joinCode)}
            className="w-full py-3 rounded-lg font-mono text-sm tracking-wide transition-all"
            style={{
              background: 'rgba(10,18,30,0.8)',
              border: '1px solid rgba(41,128,185,0.35)',
              color: '#4090C8',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(41,128,185,0.75)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(41,128,185,0.35)'}
          >
            Katıl
          </button>
        </motion.div>

        <motion.p
          className="mt-8 text-center font-mono text-[10px] text-white/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          İki oyuncu farklı cihazlardan oynayabilir
        </motion.p>
      </motion.div>
    </ScreenShell>
  );
}
