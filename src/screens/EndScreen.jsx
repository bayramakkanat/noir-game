import { motion } from 'framer-motion';
import { SUSPECTS } from '../data/suspects';
import SuspectCard from '../components/SuspectCard.jsx';
import AmbientBackground from '../components/AmbientBackground.jsx';
import endBg from '../assets/end.png';
import { KILLER_WIN_DEATH_COUNT, STANDARD_KILLER_WIN_DEATH_COUNT } from '../game/constants.js';

const characterImages = import.meta.glob('../assets/characters/*.png', { eager: true });
function getCharacterImage(id) {
  const key = Object.keys(characterImages).find(k => {
    const filename = k.split('/').pop();
    const fileId = parseInt(filename.split('_')[0]);
    return fileId === id;
  });
  return key ? characterImages[key].default : null;
}

export function HeroCard({ suspect, label, labelColor = '#E8E6DC', dim = false, stamp = null }) {
  const img = getCharacterImage(suspect.id);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 24 }}
      animate={{ opacity: dim ? 0.45 : 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.15 }}
      className="relative flex flex-col items-center"
    >
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
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-2 px-2 text-center">
          <div className="font-body text-xs font-semibold text-white leading-tight">{suspect.name}</div>
        </div>

        {stamp === 'caught' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-4 border-[#C0392B] text-[#C0392B] font-display font-black tracking-widest px-3 py-1 rotate-[-18deg] opacity-90 text-lg"
              style={{ textShadow: '0 0 8px #C0392B88' }}>
              YAKALANDI
            </div>
          </div>
        )}
        {stamp === 'wrong_solve' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-4 border-[#8B5CF6] text-[#8B5CF6] font-display font-black tracking-widest px-2 py-1 rotate-[-18deg] opacity-90 text-base"
              style={{ textShadow: '0 0 8px #8B5CF688' }}>
              YANLIŞ TAHMİN
            </div>
          </div>
        )}
        {stamp === 'escaped' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-4 border-[#D4A017] text-[#D4A017] font-display font-black tracking-widest px-3 py-1 rotate-[-18deg] opacity-90 text-lg"
              style={{ textShadow: '0 0 8px #D4A01788' }}>
              KAÇTI
            </div>
          </div>
        )}
        {stamp === 'killed' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-4 border-[#C0392B] text-[#C0392B] font-display font-black tracking-widest px-3 py-1 rotate-[-18deg] opacity-90 text-lg"
              style={{ textShadow: '0 0 8px #C0392B88' }}>
              ÖLDÜ
            </div>
          </div>
        )}
      </div>
      <div
        className="mt-2 font-mono font-bold text-[10px] tracking-widest uppercase px-2 py-0.5 rounded"
        style={{
          color: labelColor,
          background: 'rgba(8,8,14,0.85)',
          textShadow: `0 0 6px ${labelColor}, 0 0 14px ${labelColor}BB`,
          filter: 'brightness(1.4)',
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}

// Kazanma/kaybetme sebebini açıklayan metin bloğu
export function buildWinSummary({ game, killerSuspect, inspectorSuspect, disguiseSuspect }) {
  const { winReason, winner, humanRole, killCount, killedSuspectIds, gameMode, solveGuess } = game;
  const isStandard = gameMode === 'standard';
  const killerWon = winner === 'killer';
  const inspectorWon = winner === 'inspector';
  const killLimit = isStandard ? STANDARD_KILLER_WIN_DEATH_COUNT : KILLER_WIN_DEATH_COUNT;

  // Oyuncu rolüne göre özelleştirilmiş satır
  // Ana neden satırı (herkese gösterilen)
  const lines = [];

  if (winReason === 'deaths') {
    lines.push({
      icon: '🗡️',
      text: `${killerSuspect?.name ?? 'Katil'}, ${killCount ?? killLimit} şüpheliyi öldürerek kaçmayı başardı.`,
      color: '#C0392B',
    });
    if (humanRole === 'inspector') {
      lines.push({ icon: '📋', text: 'Katili zamanında durduramadın.', color: '#888898' });
    } else {
      lines.push({ icon: '🎭', text: `Kimliğin: ${killerSuspect?.name}. Gizli kaldın, kaçtın.`, color: '#D4A017' });
    }
  }

  else if (winReason === 'inspector_killed') {
    lines.push({
      icon: '🗡️',
      text: `Katil, dedektifin gizli kimliği ${inspectorSuspect?.name ?? '?'}'ı öldürdü.`,
      color: '#C0392B',
    });
    if (humanRole === 'inspector') {
      lines.push({ icon: '💀', text: 'Gizli kimliğin tahtada öldürüldü.', color: '#888898' });
    } else {
      lines.push({ icon: '🎯', text: 'Dedektifin gizli kimliğini bulup etkisiz kıldın.', color: '#D4A017' });
    }
  }

  else if (winReason === 'arrest') {
    lines.push({
      icon: '🔗',
      text: `Dedektif, ${killerSuspect?.name ?? 'katil'}'i suçüstü tutuklayarak davayı kapattı.`,
      color: '#4090C8',
    });
    if (humanRole === 'killer') {
      lines.push({ icon: '🚨', text: 'Kimliğin dedektife deşifre oldu.', color: '#888898' });
    } else {
      lines.push({ icon: '✅', text: 'Doğru kişiyi yakaladın.', color: '#4090C8' });
    }
  }

  else if (winReason === 'solve') {
    lines.push({
      icon: '🎯',
      text: `Dedektif, katil ${killerSuspect?.name}'ı ve kılığı ${disguiseSuspect?.name}'ı doğru tahmin etti.`,
      color: '#4090C8',
    });
    if (humanRole === 'killer') {
      lines.push({ icon: '🔍', text: 'Kimliğin ve kılığın çözüldü.', color: '#888898' });
    } else {
      lines.push({ icon: '🧠', text: 'İki ipucunu da doğru birleştirdin.', color: '#4090C8' });
    }
  }

  else if (winReason === 'wrong_solve') {
    const guessedIdentity = solveGuess?.identityId != null
      ? SUSPECTS.find(s => s.id === solveGuess.identityId)?.name ?? '?'
      : '?';
    const guessedDisguise = solveGuess?.disguiseId != null
      ? SUSPECTS.find(s => s.id === solveGuess.disguiseId)?.name ?? '?'
      : '?';
    lines.push({
      icon: '❌',
      text: `Dedektif yanlış tahmin yaptı — Tahmini: ${guessedIdentity} / ${guessedDisguise}.`,
      color: '#C0392B',
    });
    lines.push({
      icon: '🎭',
      text: `Gerçek Katil: ${killerSuspect?.name}, Kılık: ${disguiseSuspect?.name}.`,
      color: '#D4A017',
    });
  }

  // Eğer winReason yoksa (eski kayıt uyumu için) basit fallback
  else {
    if (killerWon && humanRole === 'inspector')
      lines.push({ icon: '🗡️', text: `Katil ${killerSuspect?.name} gözden kayboldu.`, color: '#C0392B' });
    else if (killerWon && humanRole === 'killer')
      lines.push({ icon: '🎭', text: 'Kimliğin gizli kaldı. Hedefine ulaştın.', color: '#D4A017' });
    else if (inspectorWon && humanRole === 'inspector')
      lines.push({ icon: '🔗', text: `${killerSuspect?.name} yakalandı.`, color: '#4090C8' });
    else if (inspectorWon && humanRole === 'killer')
      lines.push({ icon: '🔍', text: 'Dedektif maskeni düşürdü.', color: '#888898' });
  }

  return lines;
}

export default function EndScreen({ game, onReset }) {
  const killerWon    = game.winner === 'killer';
  const inspectorWon = game.winner === 'inspector';
  const isKiller     = game.humanRole === 'killer';
  const isInspector  = game.humanRole === 'inspector';
  const playerWon    = (isKiller && killerWon) || (isInspector && inspectorWon);

  const killerSuspect    = SUSPECTS.find(s => s.id === game.killer.identitySuspectId);
  const inspectorSuspect = SUSPECTS.find(s => s.id === game.inspector.secretIdentitySuspectId);

  // Güvenlik: katil ve dedektif aynı suspect ise dedektif kartını gösterme
  const sameIdentity = killerSuspect?.id === inspectorSuspect?.id;
  const isStandard       = game.gameMode === 'standard';
  const disguiseSuspect  = isStandard ? SUSPECTS.find(s => s.id === game.killer.disguiseSuspectId) : null;

  const deceasedSuspects = (game.killedSuspectIds ?? [])
    .map(id => SUSPECTS.find(s => s.id === id))
    .filter(Boolean)
    .filter(s => s.id !== killerSuspect?.id && s.id !== inspectorSuspect?.id)
    .slice(-5);

  const accentColor = killerWon ? '#C0392B' : '#4090C8';
  const glowColor   = killerWon ? '#C0392B44' : '#4090C844';

  const headline = killerWon ? 'KATİL KAZANDI' : 'DEDEKTİF KAZANDI';

  // Katil kartı için stamp
  const killerStamp = inspectorWon ? 'caught' : 'escaped';

  // Dedektif kartı için stamp — sadece KATİL kazandı VE dedektifin kimliği öldürüldüyse
  const inspectorStamp = (killerWon && game.winReason === 'inspector_killed') ? 'killed' : null;

  const summaryLines = buildWinSummary({ game, killerSuspect, inspectorSuspect, disguiseSuspect });

  const killCount = game.killCount ?? (game.killedSuspectIds?.length ?? 0);
  const killLimit = isStandard ? STANDARD_KILLER_WIN_DEATH_COUNT : KILLER_WIN_DEATH_COUNT;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-10 relative overflow-y-auto overflow-x-hidden"
      style={{
        backgroundImage: `url(${endBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <AmbientBackground variant={killerWon ? 'lobby' : 'setup'} density="full" className="z-[1]" />
      <div className="absolute inset-0 bg-black/60 z-[2]" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-[4]"
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

        {/* Container for Columns */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-16 w-full max-w-4xl mt-4">
          
          {/* Left Column: Characters */}
          <div className="flex flex-col items-center">
            <div className="flex items-end justify-center gap-4 md:gap-6 mb-6">
              {killerSuspect && (
                <HeroCard
                  suspect={killerSuspect}
                  label="Katilin Kimliği"
                  labelColor='#C0392B'
                  dim={inspectorWon}
                  stamp={killerStamp}
                />
              )}

              <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, type: 'spring' }}
            className="font-display text-2xl font-bold mb-8"
            style={{ color: '#2A2A3E' }}
          >
            vs
          </motion.div>

              {inspectorSuspect && !sameIdentity && (
                <HeroCard
                  suspect={inspectorSuspect}
                  label="Dedektif"
                  labelColor={inspectorWon ? '#4090C8' : '#888898'}
                  dim={killerWon && game.winReason !== 'inspector_killed'}
                  stamp={inspectorStamp}
                />
              )}
            </div>

            {/* Standard mod — kılık kartı */}
            {isStandard && disguiseSuspect && (
              <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center mb-5"
          >
            <div
              className="font-mono text-[9px] tracking-[0.3em] uppercase mb-1 px-2 py-0.5 rounded"
              style={{ color: '#C0392B', background: 'rgba(8,8,14,0.85)', textShadow: '0 0 6px #C0392B, 0 0 14px #C0392BBB', filter: 'brightness(1.4)' }}
            >
              Katilin Yedek Kılığı
            </div>
            <SuspectCard
              suspect={disguiseSuspect}
              size={64}
              showName
              state={(game.killedSuspectIds ?? []).includes(disguiseSuspect.id) ? 'eliminated' : 'default'}
            />
          </motion.div>
        )}
        </div>

        {/* Right Column: Summary, Victims, Button */}
        <div className="flex flex-col items-center md:items-stretch flex-1 w-full max-w-md">
          {/* Kazanma/Kaybetme özet kutusu */}
          <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="w-full rounded-xl border mb-5 overflow-hidden"
          style={{ borderColor: accentColor + '33', background: 'rgba(13,13,20,0.85)' }}
        >
          {/* Başlık bandı */}
          <div
            className="px-4 py-2 font-mono text-[9px] tracking-[0.35em] uppercase"
            style={{ background: accentColor + '18', color: accentColor }}
          >
            Oyun Özeti
          </div>

          <div className="px-4 py-3 space-y-2">
            {summaryLines.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-sm mt-0.5 shrink-0">{line.icon}</span>
                <p className="font-body text-sm leading-snug" style={{ color: line.color }}>
                  {line.text}
                </p>
              </div>
            ))}

            {/* Kill sayacı */}
            <div className="pt-1 mt-1 border-t flex items-center gap-2" style={{ borderColor: '#2A2A3E' }}>
              <span className="text-sm">📊</span>
              <p className="font-mono text-[11px]" style={{ color: '#666676' }}>
                Toplam can kaybı: <span style={{ color: '#9A9890' }}>{killCount} / {killLimit}</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Kurbanlar */}
        {deceasedSuspects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-5 w-full"
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

            <div className="w-24 h-px mb-6 md:mb-8" style={{ background: accentColor + '44' }} />

            {/* Yeni oyun */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              onClick={onReset}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-mono text-sm tracking-widest uppercase transition-all duration-200 border"
              style={{ background: '#0D0D14', borderColor: accentColor + '55', color: accentColor }}
              onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
              onMouseLeave={e => e.currentTarget.style.borderColor = accentColor + '55'}
            >
              Yeni Oyun
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
