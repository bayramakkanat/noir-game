import { useState } from 'react';
import { useFullscreen } from '../hooks/useFullscreen.js';
import { motion, AnimatePresence } from 'framer-motion';
import AmbientBackground from '../components/AmbientBackground.jsx';

export default function LobbyScreen({ onCreateRoom, onJoinRoom, onBack, status, error, roomId }) {
  const [joinCode, setJoinCode] = useState('');
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  // Katılma bekleme ekranı
  if (status === 'joining') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden bg-[#0A0A10]">
        <AmbientBackground variant="lobby" density="full" className="z-0" />
        <motion.div
          className="text-center relative z-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-6xl font-bold text-[#E8E6DC] anim-flicker mb-2">NOIR</h1>
          <div className="w-16 h-px bg-[#4090C8] mx-auto mb-10" />
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-[#4090C8] anim-pulse" />
            <p className="font-mono text-xs text-[#888898]">
              Oyun başlatılıyor...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Oda bekleme ekranı
  if (status === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden bg-[#0A0A10]">
        <AmbientBackground variant="lobby" density="full" className="z-0" />

        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-5 left-5 font-mono text-xs text-white/50 hover:text-white/90 transition-colors z-10"
          >
            ← Geri
          </button>
        )}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
          className="absolute top-5 right-5 w-9 h-9 rounded-full border border-white/15 bg-black/30 text-white/50 hover:text-[#C0392B] hover:border-[#C0392B]/40 font-mono text-sm backdrop-blur-sm transition-colors flex items-center justify-center z-10"
        >
          {isFullscreen ? '⊡' : '⊞'}
        </button>

        <motion.div
          className="text-center relative z-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-6xl font-bold text-[#E8E6DC] anim-flicker mb-2">NOIR</h1>
          <div className="w-16 h-px bg-[#C0392B] mx-auto mb-10" />

          <motion.div
            className="mb-6 p-6 rounded-2xl bg-[#13131E]/90 border border-[#2A2A3E] backdrop-blur-sm"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="font-mono text-xs text-[#888898] uppercase tracking-widest mb-3">
              Oda Kodu
            </p>
            <p className="font-display text-5xl font-bold text-[#C0392B] tracking-[0.3em]">
              {roomId}
            </p>
          </motion.div>

          <p className="font-mono text-sm text-[#888898] mb-2">
            Bu kodu arkadaşına gönder
          </p>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-[#C0392B] anim-pulse" />
            <p className="font-mono text-xs text-[#888898]">
              Dedektif bekleniyor...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Ana lobi ekranı
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden bg-[#0A0A10]">
      <AmbientBackground variant="lobby" density="full" className="z-0" />

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-5 left-5 font-mono text-xs text-white/50 hover:text-white/90 transition-colors z-10"
        >
          ← Geri
        </button>
      )}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
        className="absolute top-5 right-5 w-9 h-9 rounded-full border border-white/15 bg-black/30 text-white/50 hover:text-[#C0392B] hover:border-[#C0392B]/40 font-mono text-sm backdrop-blur-sm transition-colors flex items-center justify-center z-10"
      >
        {isFullscreen ? '⊡' : '⊞'}
      </button>

      <motion.div
        className="w-full max-w-sm relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Başlık */}
        <div className="text-center mb-10">
          <motion.h1
            className="font-display text-7xl font-bold text-[#E8E6DC] anim-flicker leading-none mb-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 80 }}
          >
            NOIR
          </motion.h1>
          <div className="w-16 h-px bg-[#C0392B] mx-auto mb-3" />
          <motion.p
            className="font-mono text-[10px] text-[#888898] tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Dedüksiyon Oyunu · 2 Oyuncu
          </motion.p>
        </div>

        {/* Hata */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 px-4 py-3 rounded-lg bg-[#1A1012] border border-[#C0392B44] text-[#E05040] font-mono text-xs"
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
          <button
            onClick={onCreateRoom}
            disabled={status === 'creating'}
            className="w-full flex items-start gap-4 p-5 bg-[#13131E]/90 border border-[#2A2A3E] rounded-xl hover:border-[#C0392B] hover:bg-[#1A1012] transition-all duration-200 group text-left disabled:opacity-50 backdrop-blur-sm"
          >
            <div className="text-3xl mt-0.5">🗡️</div>
            <div>
              <div className="font-display text-lg text-[#E8E6DC] group-hover:text-[#E05040] transition-colors">
                Oda Oluştur
              </div>
              <div className="font-body text-xs text-[#888898] mt-1 leading-relaxed">
                Katil olarak oyna. Bir oda kodu oluştur ve arkadaşına gönder.
              </div>
            </div>
          </button>
        </motion.div>

        {/* Ayraç */}
        <motion.div
          className="flex items-center gap-3 my-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex-1 h-px bg-[#2A2A3E]" />
          <span className="font-mono text-[10px] text-[#4A4A5E] tracking-widest">VEYA</span>
          <div className="flex-1 h-px bg-[#2A2A3E]" />
        </motion.div>

        {/* Odaya katıl */}
        <motion.div
          className="p-5 bg-[#13131E]/90 border border-[#2A2A3E] rounded-xl backdrop-blur-sm"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔍</span>
            <div>
              <div className="font-display text-lg text-[#E8E6DC]">Odaya Katıl</div>
              <div className="font-body text-xs text-[#888898]">Dedektif olarak oyna.</div>
            </div>
          </div>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Oda kodunu gir..."
            maxLength={6}
            className="w-full px-4 py-3 rounded-lg bg-[#0D0D14] border border-[#2A2A3E] text-[#E8E6DC] font-mono text-lg tracking-[0.3em] placeholder:text-[#3A3A4E] placeholder:tracking-normal focus:outline-none focus:border-[#4090C8] mb-3 transition-colors"
          />
          <button
            onClick={() => onJoinRoom(joinCode)}
            className="w-full py-3 rounded-lg border border-[#2980B944] text-[#4090C8] bg-[#101418] hover:border-[#2980B988] hover:bg-[#0D1218] font-mono text-sm tracking-wide transition-all"
          >
            Katıl
          </button>
        </motion.div>

        <motion.p
          className="mt-8 text-center font-mono text-[10px] text-[#3A3A4E]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          İki oyuncu farklı cihazlardan oynayabilir
        </motion.p>
      </motion.div>
    </div>
  );
}
