import { useEffect } from 'react';
import { KILLER_WIN_DEATH_COUNT } from '../game/constants.js';

function RuleSection({ title, children }) {
  return (
    <section className="mb-5 last:mb-0">
      <h3 className="font-display text-base text-noir-accent mb-2 tracking-wide">{title}</h3>
      <div className="text-sm text-[#B8B8C8] leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function HowToPlayModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
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
        <div className="flex-shrink-0 flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 border-b border-noir-border/40">
          <div>
            <p className="font-mono text-[9px] tracking-[0.25em] text-[#6B6B85] uppercase mb-1">
              Noir · Klasik mod
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

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5">
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
            <p>5×5 tahta; 25 şüpheli alfabetik dizilir. Kanıt destesinden kartlar çekilir.</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-noir-accent/60">
              <li>Katil 2 kart alır: biri gizli kimlik, diğeri kılık değiştirme kartı.</li>
              <li>Dedektif 4 kart alır; biri gizli kimlik, geri kalanı elinde kalır.</li>
              <li>Katil önce kimliğini seçer ve komşularından birini öldürerek başlar.</li>
              <li>Ardından dedektif gizli kimliğini seçer; normal turlar başlar.</li>
            </ul>
          </RuleSection>

          <RuleSection title="Katil hamleleri (sıra sende)">
            <p>Her turda <strong className="text-noir-text/90">bir</strong> hamle:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-red-400/50">
              <li>
                <strong className="text-noir-text/85">Öldür</strong> — Gizli kimliğinin komşusu olan canlı bir
                şüpheliyi öldür (kendini öldüremezsin).
              </li>
              <li>
                <strong className="text-noir-text/85">Kılık değiştir</strong> — Desteden kart çek; elindeki iki karttan
                birini yeni kimlik seç. Eski kimliğin desteye döner.
              </li>
              <li>
                <strong className="text-noir-text/85">Kaydır</strong> — Bir satır veya sütunu bir kare kaydır. Bir önceki
                hamlenin tam tersi yönde kaydıramazsın.
              </li>
            </ul>
          </RuleSection>

          <RuleSection title="Dedektif hamleleri">
            <p>Her turda <strong className="text-noir-text/90">bir</strong> hamle:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-blue-400/50">
              <li>
                <strong className="text-noir-text/85">Tutukla</strong> — Gizli kimliğinin komşularından birini (veya
                istersen kendi kimliğini) tutukla. Yanlış kişiyse oyun devam eder; doğru kişi katilin güncel kimliğiyse
                kazanırsın.
              </li>
              <li>
                <strong className="text-noir-text/85">Temize çıkar</strong> — Elindeki bir kartı açıkça masum ilan et,
                desteden yeni kart çek.
              </li>
              <li>
                <strong className="text-noir-text/85">Kaydır</strong> — Katille aynı kaydırma kuralı.
              </li>
            </ul>
          </RuleSection>

          <RuleSection title="Tahta ve cinayetler">
            <p>
              Bir satır veya sütundaki tüm karakterler öldüğünde o satır/sütun tahtadan kalkar; alan daralır.
              Komşuluk, kalan aktif hücrelere göre hesaplanır (boşluklar atlanır).
            </p>
            <p>
              Katil yalnızca <em>o anki</em> kimliğinin komşularını öldürebilir; dedektif de tutuklamayı kendi gizli
              kimliğinin çevresinden yapar. Cinayet mahali ile tutuklama alanı her zaman aynı değildir — tahtayı
              kaydırarak konumları değiştirmek stratejinin parçasıdır.
            </p>
          </RuleSection>

          <RuleSection title="İpuçları">
            <ul className="list-disc pl-5 space-y-1.5 marker:text-noir-accent/50">
              <li>Katil öldürdükçe dedektif örüntüyü takip edebilir; kılık değiştirmek izini karıştırır.</li>
              <li>Masum ilan edilen kartlar herkese açıktır; elindeki gizli kartları iyi yönet.</li>
              <li>Kaydırma hem seni hem rakibi etkiler; hamleyi planla.</li>
            </ul>
          </RuleSection>
        </div>

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
