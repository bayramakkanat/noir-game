import { useState } from 'react';
import { useFullscreen } from '../hooks/useFullscreen.js';
import menuBg from '../assets/menu-bg.png';
import AmbientBackground from '../components/AmbientBackground.jsx';
import HowToPlayModal from '../components/HowToPlayModal.jsx';

export default function SetupScreen({ onStart, onBack }) {
  const [rulesOpen, setRulesOpen] = useState(false);
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
      <AmbientBackground variant="setup" density="medium" className="z-[1]" />
      <div className="absolute inset-0 bg-black/55 z-[2]" />

      {/* Alt kısım gradient — butonlar için */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0A0A10] to-transparent z-[2] pointer-events-none" />

      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
        {onBack ? (
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
            className="w-9 h-9 rounded-full border border-white/15 bg-black/30 text-white/50 hover:text-noir-accent hover:border-noir-accent/40 font-mono text-sm backdrop-blur-sm transition-colors flex items-center justify-center"
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            title="Nasıl oynanır?"
            aria-label="Nasıl oynanır"
            className="w-9 h-9 rounded-full border border-white/15 bg-black/30 text-white/50 hover:text-noir-accent hover:border-noir-accent/40 font-mono text-sm backdrop-blur-sm transition-colors"
          >
            ?
          </button>
        </div>
      </div>

      {rulesOpen && <HowToPlayModal onClose={() => setRulesOpen(false)} />}

      {/* Başlık */}
      <div className="relative z-10 mb-12 text-center anim-fade-in">
        <div className="font-mono text-xs tracking-[0.3em] text-white/40 mb-3 uppercase">
          Tek Oyunculu
        </div>
        <h1 className="font-display text-8xl font-bold text-white anim-flicker mb-3 drop-shadow-2xl"
          style={{ textShadow: '0 0 80px rgba(200,168,75,0.3), 0 2px 20px rgba(0,0,0,0.8)' }}>
          NOIR
        </h1>
        <div className="w-16 h-px bg-noir-accent mx-auto mb-3" />
        <div className="font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase">
          Kim katil, kim dedektif?
        </div>
      </div>

      {/* Butonlar */}
      <div className="relative z-10 w-full max-w-sm space-y-3 anim-fade-in" style={{ animationDelay: '0.15s' }}>
        <p className="font-mono text-xs text-white/30 text-center tracking-widest uppercase mb-5">
          — Rolünü seç —
        </p>

        <button
          onClick={() => onStart('killer')}
          className="w-full flex items-start gap-4 p-5 rounded-xl border transition-all duration-200 group text-left backdrop-blur-sm"
          style={{
            background: 'rgba(26,10,10,0.75)',
            borderColor: 'rgba(192,57,43,0.4)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.85)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.4)'}
        >
          <div className="text-3xl mt-0.5">🗡️</div>
          <div>
            <div className="font-display text-lg text-white group-hover:text-[#E05040] transition-colors">
              Katil
            </div>
            <div className="font-body text-xs text-white/40 mt-1 leading-relaxed">
              Grid'deki şüphelileri elemine et. Kimliğini gizle. Dedektif seni yakalamadan kaç.
            </div>
          </div>
        </button>

        <button
          onClick={() => onStart('inspector')}
          className="w-full flex items-start gap-4 p-5 rounded-xl border transition-all duration-200 group text-left backdrop-blur-sm"
          style={{
            background: 'rgba(10,16,26,0.75)',
            borderColor: 'rgba(41,128,185,0.4)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(41,128,185,0.85)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(41,128,185,0.4)'}
        >
          <div className="text-3xl mt-0.5">🔍</div>
          <div>
            <div className="font-display text-lg text-white group-hover:text-[#4090C8] transition-colors">
              Dedektif
            </div>
            <div className="font-body text-xs text-white/40 mt-1 leading-relaxed">
              İpucu topla, şüphelileri elek. 25 kişi arasından katili bul ve itham et.
            </div>
          </div>
        </button>
      </div>

      <p className="relative z-10 mt-10 font-mono text-[10px] text-white/20 text-center anim-fade-in"
        style={{ animationDelay: '0.3s' }}>
        Yapay zeka karşı rolü oynar
      </p>
    </div>
  );
}
