export default function SetupScreen({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">

      {/* Title */}
      <div className="mb-12 text-center anim-fade-in">
        <div className="font-mono text-xs tracking-[0.3em] text-noir-muted mb-3 uppercase">
          Dedüksiyon Oyunu
        </div>
        <h1 className="font-display text-7xl font-bold text-noir-text anim-flicker mb-2">
          NOIR
        </h1>
        <div className="w-16 h-px bg-noir-accent mx-auto" />
      </div>

      {/* Role selection */}
      <div className="w-full max-w-sm space-y-3 anim-fade-in" style={{ animationDelay: '0.15s' }}>
        <p className="font-mono text-xs text-noir-muted text-center tracking-widest uppercase mb-5">
          — Rolünü seç —
        </p>

        <button
          onClick={() => onStart('killer')}
          className="
            w-full flex items-start gap-4 p-5
            bg-noir-card border border-noir-border rounded-xl
            hover:border-noir-red hover:bg-[#1A1218]
            transition-all duration-200 group text-left
          "
        >
          <div className="text-3xl mt-0.5">🔪</div>
          <div>
            <div className="font-display text-lg text-noir-text group-hover:text-[#E05040] transition-colors">
              Katil
            </div>
            <div className="font-body text-xs text-noir-muted mt-1 leading-relaxed">
              Grid'deki şüphelileri elemine et. Kimliğini gizle. Dedektif seni yakalamadan kaç.
            </div>
          </div>
        </button>

        <button
          onClick={() => onStart('inspector')}
          className="
            w-full flex items-start gap-4 p-5
            bg-noir-card border border-noir-border rounded-xl
            hover:border-noir-blue hover:bg-[#111820]
            transition-all duration-200 group text-left
          "
        >
          <div className="text-3xl mt-0.5">🔍</div>
          <div>
            <div className="font-display text-lg text-noir-text group-hover:text-[#4090C8] transition-colors">
              Dedektif
            </div>
            <div className="font-body text-xs text-noir-muted mt-1 leading-relaxed">
              İpucu topla, şüphelileri elek. 25 kişi arasından katili bul ve itham et.
            </div>
          </div>
        </button>
      </div>

      {/* Footer note */}
      <p className="mt-10 font-mono text-[10px] text-noir-faint text-center anim-fade-in" style={{ animationDelay: '0.3s' }}>
        Yapay zeka karşı rolü oynar · Tek oyunculu prototip
      </p>
    </div>
  );
}
