import { useEffect, useState } from 'react';
import { KILLER_WIN_DEATH_COUNT, STANDARD_KILLER_WIN_DEATH_COUNT } from '../game/constants.js';

function RuleSection({ title, children }) {
  return (
    <section className="mb-5 last:mb-0">
      <h3 className="font-display text-base text-noir-accent mb-2 tracking-wide">{title}</h3>
      <div className="text-sm text-[#B8B8C8] leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function ClassicRules() {
  return (
    <>
      <p className="text-sm text-[#9A9AB0] leading-relaxed mb-5">
        İki oyunculu gizli rol oyunu. Biri <strong className="text-red-400/90 font-medium">katil</strong>, diğeri{' '}
        <strong className="text-blue-400/90 font-medium">dedektif</strong>. Kimliğin gizli kalır; tahta üzerindeki
        karakterlerle hamle yaparsın.
      </p>

      <RuleSection title="Amaç">
        <p>
          <span className="text-red-400/90">Katil</span>, {KILLER_WIN_DEATH_COUNT} karakteri öldürerek veya
          dedektifin gizli kimliğini öldürerek kazanır.
        </p>
        <p>
          <span className="text-blue-400/90">Dedektif</span>, katilin o anki gizli kimliğini tutuklayarak kazanır.
        </p>
      </RuleSection>

      <RuleSection title="Kurulum">
        <p>5×5 tahta; 25 şüpheli alfabetik dizilir.</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-noir-accent/60">
          <li>
            <span className="text-red-400/90">Katil</span> desteden 1 kart alır; bu kart direkt gizli kimliği olur.
            Hemen komşularından birini öldürerek başlar.
          </li>
          <li>
            <span className="text-blue-400/90">Dedektif</span> 4 kart alır; birini gizli kimlik olarak seçer,
            geri kalan 3 kart elinde kanıt kartı olarak kalır. Bu 3 karttaki karakterlerin katil
            olamayacağını kesin olarak bilirsin.
          </li>
        </ul>
      </RuleSection>

      <RuleSection title="Katil hamleleri">
        <p>Her turda <strong className="text-noir-text/90">bir</strong> hamle:</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-red-400/50">
          <li>
            <strong className="text-noir-text/85">Öldür</strong> — Gizli kimliğinin komşusu olan canlı bir
            şüpheliyi öldür. Kendi kimliğini öldüremezsin.
          </li>
          <li>
            <strong className="text-noir-text/85">Kılık değiştir</strong> — Desteden rastgele 1 kart çek.
            Çekilen karakter yaşıyorsa başarılı olursun: eski kimliğin ölür, yeni karakter kimliğin olur.
            Çekilen karakter zaten ölmüşse başarısız olursun; eski kimliğinle devam edersin. Deste bitince
            bu hamle yapılamaz.
          </li>
          <li>
            <strong className="text-noir-text/85">Kaydır</strong> — Bir satır veya sütunu bir kare kaydır.
            Bir önceki hamlenin tam tersi yönde kaydıramazsın.
          </li>
        </ul>
      </RuleSection>

      <RuleSection title="Dedektif hamleleri">
        <p>Her turda <strong className="text-noir-text/90">bir</strong> hamle:</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-blue-400/50">
          <li>
            <strong className="text-noir-text/85">Tutukla</strong> — Gizli kimliğinin komşularından birini (ya
            da kendini) tutukla. Katilin güncel kimliğiyse kazanırsın; değilse oyun devam eder.
          </li>
          <li>
            <strong className="text-noir-text/85">Temize çıkar</strong> — Elindeki bir kanıt kartını masum ilan
            et; desteden yeni kart çek, elini 3'te tut. Elindeki kart zaten ölmüşse yine de atıp
            yeni kart çekebilirsin. Deste bitince bu hamle yapılamaz.
          </li>
          <li>
            <strong className="text-noir-text/85">Kaydır</strong> — Katille aynı kaydırma kuralı.
          </li>
        </ul>
      </RuleSection>

      <RuleSection title="Tahta daralması">
        <p>
          Bir satır veya sütundaki tüm karakterler öldüğünde o satır/sütun tahtadan kalkar; alan daralır.
          Komşuluk, kalan aktif hücrelere göre hesaplanır.
        </p>
        <p>
          Katil kılık değiştirince eski kimliği de ölü sayılır ve tahta daralmasına katkıda bulunur.
        </p>
      </RuleSection>

      <RuleSection title="İpuçları">
        <ul className="list-disc pl-5 space-y-1.5 marker:text-noir-accent/50">
          <li>
            Katil öldürdükçe cinayet örüntüsü oluşur; dedektif bunu takip edebilir.
            Kılık değiştirmek hem pozisyonu hem örüntüyü karıştırır.
          </li>
          <li>
            Dedektif elindeki 3 kanıt kartının katil olamayacağını bilir — bu kartları
            temize çıkararak alanı daraltabilir ve yeni ipuçları elde edebilir.
          </li>
          <li>
            Kaydırma hem seni hem rakibi etkiler; hamleyi dikkatli planla.
          </li>
        </ul>
      </RuleSection>
    </>
  );
}

function StandardRules() {
  return (
    <>
      <p className="text-sm text-[#9A9AB0] leading-relaxed mb-5">
        Resmi <em>Killer vs. Inspector</em> kuralları. Katil sabit bir{' '}
        <strong className="text-purple-400/90 font-medium">yedek kılık</strong> tutar;
        dedektif <strong className="text-blue-400/90 font-medium">Canvas</strong> ve{' '}
        <strong className="text-orange-400/90 font-medium">Çöz</strong> hamleleriyle katili köşeye sıkıştırır.
      </p>

      <RuleSection title="Amaç">
        <p>
          <span className="text-red-400/90">Katil</span>, {STANDARD_KILLER_WIN_DEATH_COUNT} karakteri öldürerek
          veya dedektifin gizli kimliğini öldürerek kazanır.
        </p>
        <p>
          <span className="text-blue-400/90">Dedektif</span>, katilin güncel kimliğini{' '}
          <strong className="text-noir-text/85">Tutukla</strong> ile veya hem kimliğini hem yedek kılığını
          doğru tahmin ederek <strong className="text-noir-text/85">Çöz</strong> ile kazanır.
        </p>
      </RuleSection>

      <RuleSection title="Kurulum">
        <p>5×5 tahta; 25 şüpheli alfabetik dizilir.</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-noir-accent/60">
          <li>
            <span className="text-red-400/90">Katil</span> desteden 2 kart çeker: biri{' '}
            <strong className="text-noir-text/85">gizli kimlik</strong>, diğeri{' '}
            <strong className="text-purple-400/80">yedek kılık</strong>. İkisini de yalnız kendisi görebilir.
            Ardından hemen bir komşusunu öldürür.
          </li>
          <li>
            <span className="text-blue-400/90">Dedektif</span>, katilin ilk öldürmesinden{' '}
            <em>sonra</em> desteden 4 kart çeker; birini gizli kimlik olarak seçer, kalan 3 kart elinde
            kanıt kartı olarak kalır.
          </li>
        </ul>
      </RuleSection>

      <RuleSection title="Katil hamleleri">
        <p>Her turda <strong className="text-noir-text/90">bir</strong> hamle:</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-red-400/50">
          <li>
            <strong className="text-noir-text/85">Öldür</strong> — Gizli kimliğinin komşusu olan canlı bir
            şüpheliyi öldür. Temize çıkarılmış (üzerinde kanıt kartı olan) birini öldürürsen{' '}
            <strong className="text-amber-400/80">Canvas</strong> tetiklenir: dedektif, gizli kimliğinin o
            öldürülen karaktere komşu olup olmadığını söylemek zorundadır.
          </li>
          <li>
            <strong className="text-purple-400/80">Kılık değiştir</strong> — Elindeki gizli kimlik ve yedek
            kılık kartlarından birini yeni gizli kimlik olarak seç. Yedek kılık sabit kalır; desteden yeni
            kart çekilmez.
          </li>
          <li>
            <strong className="text-noir-text/85">Kaydır</strong> — Bir satır veya sütunu bir kare kaydır.
            Bir önceki hamlenin tam tersi yönde kaydıramazsın.
          </li>
        </ul>
      </RuleSection>

      <RuleSection title="Dedektif hamleleri">
        <p>Her turda <strong className="text-noir-text/90">bir</strong> hamle:</p>
        <ul className="list-disc pl-5 space-y-1.5 marker:text-blue-400/50">
          <li>
            <strong className="text-noir-text/85">Tutukla</strong> — Gizli kimliğinin komşularından birini (ya
            da kendini) tutukla. Katilin o anki gizli kimliğiyse kazanırsın; değilse oyun devam eder.
          </li>
          <li>
            <strong className="text-green-400/80">Temize çıkar</strong> — Elindeki bir kanıt kartını tahtada
            o karakterin üzerine koy. <strong className="text-amber-400/80">Canvas</strong> tetiklenir: katil,
            gizli kimliğinin veya yedek kılığının o karaktere komşu olup olmadığını söyler.
          </li>
          <li>
            <strong className="text-orange-400/80">Çöz</strong> — Katilin hem gizli kimliğini hem yedek kılığını
            aynı anda doğru tahmin edersen kazanırsın. Yanlışsa katil kazanır; dikkatlice kullan!
          </li>
          <li>
            <strong className="text-noir-text/85">Kaydır</strong> — Katille aynı kaydırma kuralı.
          </li>
        </ul>
      </RuleSection>

      <RuleSection title="Canvas sistemi">
        <p>
          Canvas, iki tarafın da bilgi topladığı temel mekanizmadır. Tetiklendiğinde yalnızca
          &quot;komşu mu, değil mi&quot; bilgisi verilir; kim olduğu söylenmez.
        </p>

        {/* Senaryo 1 — Katil temize çıkarılmış birini öldürünce */}
        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <p className="font-mono text-[10px] tracking-widest uppercase text-amber-400/70 mb-2">
            Senaryo 1 — Katil öldürünce
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
            <div className="flex flex-col items-center gap-1 shrink-0 w-14">
              <div className="w-10 h-12 rounded-lg border-2 border-red-400/60 bg-[#1A0A0A] flex items-center justify-center relative shadow-lg mx-auto">
                <img src="/dedektif.png" alt="Dedektif" className="w-7 h-7 object-contain" style={{ filter: 'invert(1)' }} />
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-[#1A0A0A]" />
              </div>
              <span className="font-mono text-[8px] text-red-400/70 tracking-wide">Öldürüldü</span>
            </div>
            <span className="text-[#4A4A5E] text-lg shrink-0 rotate-90 sm:rotate-0">→</span>
            <div className="flex-1 rounded-lg bg-blue-500/10 border border-blue-400/25 px-2.5 py-1.5">
              <p className="font-mono text-[9px] text-blue-300/80 leading-snug">
                Karakterin üzerinde <img src="/dedektif.png" alt="Dedektif" className="inline w-4 h-4 object-contain align-middle mx-0.5" style={{ filter: 'invert(1)' }} /> belirir → dedektifin gizli kimliği o karaktere <strong className="text-blue-300">komşu</strong> demektir.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#7A7A90] leading-snug">
            Katil <em>temize çıkarılmış</em> bir karakteri öldürdüğünde Canvas tetiklenir. Dedektif, kendi gizli kimliğinin o karaktere komşu olup olmadığını açıklamak zorundadır.
          </p>
        </div>

        {/* Senaryo 2 — Dedektif temize çıkarma yaparken */}
        <div className="mt-2 rounded-xl border border-green-400/20 bg-green-400/5 p-3">
          <p className="font-mono text-[10px] tracking-widest uppercase text-green-400/70 mb-2">
            Senaryo 2 — Dedektif temize çıkarınca
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
            <div className="flex flex-col items-center gap-1 shrink-0 w-14">
              <div className="w-10 h-12 rounded-lg border-2 border-green-400/60 bg-[#0A1A0A] flex items-center justify-center relative shadow-lg mx-auto">
                <span className="text-xl">🗡️</span>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border border-[#0A1A0A]" />
              </div>
              <span className="font-mono text-[8px] text-green-400/70 tracking-wide">Temize çıkarıldı</span>
            </div>
            <span className="text-[#4A4A5E] text-lg shrink-0 rotate-90 sm:rotate-0">→</span>
            <div className="flex-1 rounded-lg bg-red-500/10 border border-red-400/25 px-2.5 py-1.5">
              <p className="font-mono text-[9px] text-red-300/80 leading-snug">
                Karakterin üzerinde <span className="text-white/70">🗡️</span> belirir → katil o karaktere <strong className="text-red-300">komşu</strong> demektir.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#7A7A90] leading-snug">
            Dedektif Temize Çıkar hamlesi yaptığında katil, kimliğinin veya yedek kılığının o karaktere komşu olup olmadığını açıklar.
          </p>
        </div>
      </RuleSection>

      <RuleSection title="Tahta daralması">
        <p>
          Bir satır veya sütundaki tüm karakterler öldüğünde o satır/sütun tahtadan kalkar; alan daralır.
          Komşuluk, kalan aktif hücrelere göre hesaplanır ve kenarlarda asla "sarma" olmaz.
        </p>
      </RuleSection>

      <RuleSection title="İpuçları">
        <ul className="list-disc pl-5 space-y-1.5 marker:text-noir-accent/50">
          <li>
            Katil kılık değiştirince pozisyonu tamamen değişir; dedektifin tüm canvas
            bilgileri yeniden yorumlanmalıdır.
          </li>
          <li>
            Temize çıkarma hem bilgi toplar hem tahta üzerinde "iz" bırakır — katil bu
            izleri okuyarak dedektifin kimliğini daraltabilir.
          </li>
          <li>
            Çöz hamlesi güçlüdür ama yanlışta oyunu kaybettirir; yalnızca yüksek
            güvende kullan.
          </li>
        </ul>
      </RuleSection>
    </>
  );
}

export default function HowToPlayModal({ onClose, initialTab = 'classic' }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Kapat"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg max-h-[min(88vh,720px)] flex flex-col rounded-2xl border border-noir-border/60 bg-[#0C0C14]/95 shadow-[0_24px_80px_rgba(0,0,0,0.7)] anim-fade-in">

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 border-b border-noir-border/40">
          <div>
            <p className="font-mono text-[9px] tracking-[0.25em] text-[#6B6B85] uppercase mb-1">
              Noir · Kurallar
            </p>
            <h2 id="how-to-play-title" className="font-display text-2xl text-noir-text">
              Nasıl oynanır?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 rounded-full border border-noir-border/50 text-[#888898] hover:text-noir-text hover:border-noir-border transition-colors text-lg leading-none"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {/* Sekme seçici */}
        <div className="flex-shrink-0 flex px-5 sm:px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setTab('classic')}
            className={`flex-1 py-2 rounded-lg font-mono text-[10px] tracking-[0.18em] uppercase transition-all duration-200 border ${
              tab === 'classic'
                ? 'bg-noir-accent/15 text-noir-accent border-noir-accent/40'
                : 'bg-white/[0.03] text-white/30 hover:text-white/50 border-white/[0.08]'
            }`}
          >
            Klasik
          </button>
          <button
            type="button"
            onClick={() => setTab('standard')}
            className={`flex-1 py-2 rounded-lg font-mono text-[10px] tracking-[0.18em] uppercase transition-all duration-200 border ${
              tab === 'standard'
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                : 'bg-white/[0.03] text-white/30 hover:text-white/50 border-white/[0.08]'
            }`}
          >
            Standart
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5">
          {tab === 'classic' ? <ClassicRules /> : <StandardRules />}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-noir-border/40">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-noir-accent/40 bg-noir-accent/10 font-mono text-xs tracking-widest uppercase text-noir-accent hover:bg-noir-accent/20 transition-colors"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
