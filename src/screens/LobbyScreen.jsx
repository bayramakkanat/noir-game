import { useState } from 'react';

export default function LobbyScreen({ onCreateRoom, onJoinRoom, status, error, roomId }) {
  const [joinCode, setJoinCode] = useState('');

  if (status === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center anim-fade-in">
          <h1 className="font-display text-6xl font-bold text-noir-text anim-flicker mb-2">NOIR</h1>
          <div className="w-16 h-px bg-noir-accent mx-auto mb-10" />

          <div className="mb-6 p-6 rounded-2xl bg-noir-card border border-noir-border">
            <p className="font-mono text-xs text-noir-muted uppercase tracking-widest mb-3">
              Oda kodu
            </p>
            <p className="font-display text-5xl font-bold text-noir-accent tracking-[0.3em]">
              {roomId}
            </p>
          </div>

          <p className="font-mono text-sm text-noir-muted mb-2">
            Bu kodu arkadaşına gönder
          </p>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-noir-accent anim-pulse" />
            <p className="font-mono text-xs text-noir-muted">
              Dedektif bekleniyor...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm anim-fade-in">

        {/* Başlık */}
        <div className="text-center mb-10">
          <h1 className="font-display text-6xl font-bold text-noir-text anim-flicker leading-none mb-2">
            NOIR
          </h1>
          <div className="w-16 h-px bg-noir-accent mx-auto mb-3" />
          <p className="font-mono text-[10px] text-noir-muted tracking-widest uppercase">
            Dedüksiyon Oyunu · 2 Oyuncu
          </p>
        </div>

        {/* Hata */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[#1A1012] border border-[#C0392B44] text-[#E05040] font-mono text-xs">
            {error}
          </div>
        )}

        {/* Oda oluştur */}
        <div className="mb-3">
          <button
            onClick={onCreateRoom}
            disabled={status === 'creating'}
            className="w-full flex items-start gap-4 p-5 bg-noir-card border border-noir-border rounded-xl hover:border-[#C0392B] hover:bg-[#1A1012] transition-all duration-200 group text-left disabled:opacity-50"
          >
            <div className="text-3xl mt-0.5">🗡️</div>
            <div>
              <div className="font-display text-lg text-noir-text group-hover:text-[#E05040] transition-colors">
                Oda Oluştur
              </div>
              <div className="font-body text-xs text-noir-muted mt-1 leading-relaxed">
                Katil olarak oyna. Bir oda kodu oluştur ve arkadaşına gönder.
              </div>
            </div>
          </button>
        </div>

        {/* Ayraç */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-noir-border" />
          <span className="font-mono text-[10px] text-noir-faint tracking-widest">VEYA</span>
          <div className="flex-1 h-px bg-noir-border" />
        </div>

        {/* Odaya katıl */}
        <div className="p-5 bg-noir-card border border-noir-border rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔍</span>
            <div>
              <div className="font-display text-lg text-noir-text">Odaya Katıl</div>
              <div className="font-body text-xs text-noir-muted">Dedektif olarak oyna.</div>
            </div>
          </div>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Oda kodunu gir..."
            maxLength={6}
            className="w-full px-4 py-3 rounded-lg bg-noir-bg border border-noir-border text-noir-text font-mono text-lg tracking-[0.3em] placeholder:text-noir-faint placeholder:tracking-normal focus:outline-none focus:border-noir-blue mb-3"
          />
          <button
            onClick={() => onJoinRoom(joinCode)}
            disabled={joinCode.length < 4}
            className="w-full py-3 rounded-lg border border-[#2980B944] text-[#4090C8] bg-[#101418] hover:border-[#2980B988] font-mono text-sm tracking-wide transition-all disabled:opacity-40"
          >
            Katıl
          </button>
        </div>

        <p className="mt-8 text-center font-mono text-[10px] text-noir-faint">
          İki oyuncu farklı cihazlardan oynayabilir
        </p>
      </div>
    </div>
  );
}
