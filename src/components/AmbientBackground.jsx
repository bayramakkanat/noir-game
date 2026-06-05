import { motion } from 'framer-motion';
import { SUSPECTS } from '../data/suspects.js';

const characterImages = import.meta.glob('../assets/characters/*.png', { eager: true });

function getCharacterImage(id) {
  const key = Object.keys(characterImages).find((k) => {
    const filename = k.split('/').pop();
    const fileId = parseInt(filename.split('_')[0], 10);
    return fileId === id;
  });
  return key ? characterImages[key].default : null;
}

const CARD_POSITIONS = [
  { left: '3%', top: '10%', rotate: -12 },
  { left: '10%', top: '55%', rotate: 8 },
  { left: '5%', top: '78%', rotate: -6 },
  { left: '18%', top: '25%', rotate: 14 },
  { left: '22%', top: '70%', rotate: -10 },
  { left: '72%', top: '8%', rotate: 9 },
  { left: '80%', top: '40%', rotate: -14 },
  { left: '88%', top: '68%', rotate: 7 },
  { left: '75%', top: '80%', rotate: -8 },
  { left: '65%', top: '20%', rotate: 11 },
  { left: '50%', top: '5%', rotate: -5 },
  { left: '48%', top: '82%', rotate: 6 },
  { left: '35%', top: '15%', rotate: -13 },
  { left: '38%', top: '75%', rotate: 10 },
  { left: '92%', top: '15%', rotate: -9 },
];

const DENSITY_COUNT = { subtle: 7, medium: 11, full: 15 };

const GLOW_STYLES = {
  menu: {
    top: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,168,75,0.2) 0%, transparent 70%)',
    bottom: 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(192,57,43,0.12) 0%, transparent 70%)',
    accent: 'rgba(200,168,75,0.08)',
  },
  lobby: {
    top: 'radial-gradient(ellipse 90% 55% at 50% 0%, rgba(192,57,43,0.45) 0%, transparent 70%)',
    bottom: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(64,144,200,0.30) 0%, transparent 70%)',
    accent: 'rgba(192,57,43,0.18)',
  },
  setup: {
    top: 'radial-gradient(ellipse 85% 52% at 50% 0%, rgba(192,57,43,0.38) 0%, transparent 70%)',
    bottom: 'radial-gradient(ellipse 65% 42% at 50% 100%, rgba(200,168,75,0.28) 0%, transparent 70%)',
    accent: 'rgba(41,128,185,0.16)',
  },
  game: {
    top: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(200,168,75,0.1) 0%, transparent 72%)',
    bottom: 'radial-gradient(ellipse 50% 30% at 50% 100%, rgba(192,57,43,0.08) 0%, transparent 72%)',
    accent: 'rgba(200,168,75,0.04)',
  },
};

function FloatingCard({ suspect, style, index, maxOpacity, cardSize }) {
  const img = getCharacterImage(suspect.id);
  const stagger = index * 0.035;

  return (
    <motion.div
      className="absolute rounded-lg overflow-hidden border border-white/[0.07] shadow-xl select-none pointer-events-none"
      style={{
        width: cardSize.width,
        height: cardSize.height,
        ...style,
      }}
      initial={{ opacity: maxOpacity * 0.65, y: 6 }}
      animate={{
        opacity: [maxOpacity * 0.65, maxOpacity, maxOpacity * 0.92, maxOpacity * 0.35],
        y: [6, -6, -18, -32],
        rotate: style.rotate ?? 0,
      }}
      transition={{
        duration: 7 + (index % 4) * 0.6,
        delay: stagger,
        repeat: Infinity,
        repeatDelay: 0.4 + (index % 3) * 0.35,
        ease: 'easeInOut',
      }}
    >
      {img ? (
        <img
          src={img}
          alt=""
          aria-hidden
          className="w-full h-full object-cover object-top grayscale"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-[#13131E]" />
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent pb-1 pt-3 text-center">
        <div className="font-mono text-[7px] text-white/35 truncate px-1">{suspect.name}</div>
      </div>
    </motion.div>
  );
}

function FloatingCards({ density = 'medium', maxOpacity = 0.2 }) {
  const count = DENSITY_COUNT[density] ?? DENSITY_COUNT.medium;
  const cardSize =
    density === 'subtle'
      ? { width: 56, height: 76 }
      : density === 'full'
        ? { width: 72, height: 98 }
        : { width: 64, height: 88 };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {CARD_POSITIONS.slice(0, count).map((pos, i) => (
        <FloatingCard
          key={i}
          index={i}
          suspect={SUSPECTS[i % SUSPECTS.length]}
          style={pos}
          maxOpacity={maxOpacity}
          cardSize={cardSize}
        />
      ))}
    </div>
  );
}

function AmbientGlow({ variant }) {
  const glow = GLOW_STYLES[variant] ?? GLOW_STYLES.menu;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 opacity-100"
        style={{ background: glow.top }}
      />
      <div
        className="absolute inset-0 opacity-100"
        style={{ background: glow.bottom }}
      />
      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(100vw,520px)] h-[min(60vh,320px)] rounded-full blur-3xl"
        style={{ background: glow.accent }}
        initial={{ opacity: 0.5, scale: 0.95 }}
        animate={{ opacity: [0.6, 0.95, 0.6], scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/**
 * @param {'menu' | 'lobby' | 'setup' | 'game'} variant
 * @param {'subtle' | 'medium' | 'full'} density
 */
export default function AmbientBackground({
  variant = 'menu',
  density = 'medium',
  className = '',
}) {
  const maxOpacity = variant === 'game' ? 0.12 : variant === 'menu' ? 0.22 : 0.30;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden>
      <AmbientGlow variant={variant} />
      <FloatingCards density={density} maxOpacity={maxOpacity} />
    </div>
  );
}
