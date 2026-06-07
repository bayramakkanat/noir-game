import { motion } from 'framer-motion';
import { SUSPECTS } from '../data/suspects';
import SuspectCard from '../components/SuspectCard.jsx';
import AmbientBackground from '../components/AmbientBackground.jsx';
import menuBg from '../assets/menu-bg.png';
// Karakter görsel yükleyici (SuspectCard ile aynı mantık)
const characterImages = import.meta.glob('../assets/characters/*.png', { eager: true });
function getCharacterImage(id) {
  const key = Object.keys(characterImages).find(k => {
    const filename = k.split('/').pop();
    const fileId = parseInt(filename.split('_')[0]);
    return fileId === id;
  });
  return key ? characterImages[key].default : null;
}

// Büyük karakter görseli — bitiş ekranı için
function HeroCard({ suspect, label, labelColor = '#E8E6DC', dim = false, stamp = null }) {
  const img = getCharacterImage(suspect.id);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 24 }}
      animate={{ opacity: dim ? 0.45 : 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.15 }}
      className="relative flex flex-col items-center"
    >
      {/* Kart */}
      <div
        className="relative rounded-xl overflow-hidden border-2 shadow-2xl"
        style={{
          width: 140,
          height: 190,
          borderColor: dim ? '#2A2A3E' : labelColor,
          filter: dim ? 'grayscale(60%)' : 'none',
        }}
      >
        {img ? (
          <img src={img} alt={suspect.name} className="w-full h-full object-cover object-top" draggable={false} />
        ) : (
          <div className="w-full h-full bg-noir-card flex items-center justify-center text-5xl">
            {dim ? '🔍' : '🗡️'}
          </div>
        )}

        {/* Alt isim bandı */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-2 px-2 text-center">
          <div className="font-body text-xs font-semibold text-white leading-tight">{suspect.name}</div>
        </div>

        {/* Stamp */}
        {stamp === 'caught' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="border-4 border-[#C0392B] text-[#C0392B] font-display font-black tracking-widest px-3 py-1 rotate-[-18deg] opacity-90 text-lg"
              style={{ textShadow: '0 0 8px #C0392B88' }}
            >
              YAKALANDI
            </div>
          </div>
        )}
        {stamp === 'escaped' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="border-4 border-[#D4A017] text-[#D4A017] font-display font-black tracking-widest px-3 py-1 rotate-[-18deg] opacity-90 text-lg"
              style={{ textShadow: '0 0 8px #D4A01788' }}
            >
              KAÇTI
            </div>
          </div>
        )}
      </div>

      {/* Alt etiket */}
      <div className="mt-2 font-mono text-[10px] tracking-widest uppercase" style={{ color: labelColor }}>
        {label}
      </div>
    </motion.div>
  );
}

export default function EndScreen({ game, onReset }) {
  const killerWon      = game.winner === 'killer';
  const inspectorWon   = game.winner === 'inspector';
  const isKiller       = game.humanRole === 'killer';
  const isInspector    = game.humanRole === 'inspector';
  const playerWon      = (isKiller && killerWon) || (isInspector && inspectorWon);

  const killerSuspect  = SUSPECTS[game.killer.identitySuspectId];
  const inspectorSuspect = SUSPECTS[game.inspector.secretIdentitySuspectId];

  // Öldürülenler (son 4 tane, fazlası olursa) — tahtadan kaldırılmış satır/sütunlar dahil
  const deceasedSuspects = (game.killedSuspectIds ?? [])
    .map(id => SUSPECTS[id])
    .filter(Boolean)
    .filter(s => s.id !== killerSuspect?.id && s.id !== inspectorSuspect?.id)
    .slice(-4);

  // Tema renkleri
  const accentColor  = killerWon ? '#C0392B' : '#4090C8';
  const glowColor    = killerWon ? '#C0392B44' : '#4090C844';
  const bgGradient   = killerWon
    ? 'radial-gradient(ellipse at 50% 0%, #1A0808 0%, #0D0D14 60%)'
    : 'radial-gradient(ellipse at 50% 0%, #08101A 0%, #0D0D14 60%)';

  // Başlık metni
  const headline = playerWon
    ? (killerWon ? 'KATİL KAZANDI' : 'DEDEKTİF KAZANDI')
    : (killerWon ? 'KATİL KAZANDI' : 'DEDEKTİF KAZANDI');

  const subtext = (() => {
    if (isInspector && inspectorWon) return `${killerSuspect?.name} suçüstü yakalandı.`;
    if (isInspector && killerWon)    return `Katil ${killerSuspect?.name} gözden kayboldu.`;
    if (isKiller && killerWon)       return `Kimliğin gizli kaldı. Hedefine ulaştın.`;
    if (isKiller && inspectorWon)    return `Dedektif maskeni düşürdü.`;
    return '';
  })();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
      style={{
        backgroundImage: `url(${menuBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Ambient arka plan — katil kazandıysa kırmızı, dedektif kazandıysa mavi */}
      <AmbientBackground
        variant={killerWon ? 'lobby' : 'setup'}
        density="full"
        className="z-[1]"
      />
      <div className="absolute inset-0 bg-black/60 z-[2]" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-[2]"
        style={{ background: `radial-gradient(ellipse, ${glowColor} 0%, transparent 70%)` }}
      />

      <motion.div
        className="w-full max-w-md flex flex-col items-center relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Üst etiket */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3"
          style={{ color: accentColor }}
        >
          — Dava Kapandı —
        </motion.div>

        {/* Ana başlık */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
          className="font-display text-4xl font-bold text-center mb-1"
          style={{ color: accentColor, textShadow: `0 0 32px ${accentColor}66` }}
        >
          {headline}
        </motion.h1>

        {/* Kazandın / Kaybettin */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`font-mono text-sm tracking-widest uppercase mb-6 ${playerWon ? 'text-[#D4A017]' : 'text-[#888898]'}`}
        >
          {playerWon ? '✦ Sen Kazandın ✦' : '✦ Sen Kaybettin ✦'}
        </motion.div>

        {/* Ana karakterler */}
        <div className="flex items-end justify-center gap-6 mb-6">
          {/* Katil */}
          {killerSuspect && (
            <HeroCard
              suspect={killerSuspect}
              label="Katil"
              labelColor={killerWon ? '#C0392B' : '#888898'}
              dim={inspectorWon}
              stamp={inspectorWon ? 'caught' : 'escaped'}
            />
          )}

          {/* VS ayracı */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, type: 'spring' }}
            className="font-display text-2xl font-bold mb-8"
            style={{ color: '#2A2A3E' }}
          >
            vs
          </motion.div>

          {/* Dedektif */}
          {inspectorSuspect && (
            <HeroCard
              suspect={inspectorSuspect}
              label="Dedektif"
              labelColor={inspectorWon ? '#4090C8' : '#888898'}
              dim={killerWon}
              stamp={null}
            />
          )}
        </div>

        {/* Açıklama */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="font-body text-sm text-center leading-relaxed mb-4"
          style={{ color: '#9A9890' }}
        >
          {subtext}
        </motion.p>

        {/* Öldürülenler */}
        {deceasedSuspects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-6 w-full"
          >
            <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-center mb-2" style={{ color: '#4A4A5E' }}>
              Kurbanlar
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              {deceasedSuspects.map(s => (
                <SuspectCard key={s.id} suspect={s} size={52} showName={false} state="eliminated" />
              ))}
            </div>
          </motion.div>
        )}

        {/* Ayraç */}
        <div className="w-24 h-px mb-6" style={{ background: accentColor + '44' }} />

        {/* Yeni oyun butonu */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          onClick={onReset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-xs py-3 rounded-xl font-mono text-sm tracking-widest uppercase transition-all duration-200 border"
          style={{
            background: '#0D0D14',
            borderColor: accentColor + '55',
            color: accentColor,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
          onMouseLeave={e => e.currentTarget.style.borderColor = accentColor + '55'}
        >
          Yeni Oyun
        </motion.button>
      </motion.div>
    </div>
  );
}
