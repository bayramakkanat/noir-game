import { motion } from 'framer-motion';
import { drawFace } from '../utils/drawFace';

const characterImages = import.meta.glob('../assets/characters/*.png', { eager: true });

function getCharacterImage(id) {
  const key = Object.keys(characterImages).find(k => {
    const filename = k.split('/').pop();
    const fileId = parseInt(filename.split('_')[0]);
    return fileId === id;
  });
  return key ? characterImages[key].default : null;
}

export default function SuspectCard({
  suspect,
  state = 'normal',
  size = 72,
  onClick,
  showName = true,
  playerRole = null, // 'killer' | 'inspector' | null
  nameFontSize = null, // null = otomatik (size bazlı)
  canvasAdjacent = false,
  canvasTypes = [], // ['killer'], ['detective'], veya ['killer','detective']
  isDisguise = false,
  isIdentityBadge = false,
  identityRole = null,
  endgameRole = null,
  endgameDisguise = false,
}) {
  const imageUrl = getCharacterImage(suspect.id);
  const svgMarkup = drawFace(suspect, size);

  const borderClass = {
    normal:     'border-noir-border hover:border-noir-faint',
    mine:       playerRole === 'killer' ? 'border-[#C0392B] border-2' : 'border-noir-blue border-2',
    eliminated: 'border-noir-border/40 opacity-50 pointer-events-none',
    exonerated: 'border-noir-green border-2',
    targeted:   'border-noir-accent border-2',
  }[state] || 'border-noir-border';

  const isDead = state === 'eliminated';

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-lg transition-colors duration-150
        ${onClick ? 'cursor-pointer' : ''}
      `}
      style={{ perspective: 1000, width: size, height: size }}
    >
      {/* 3D Inner Container */}
      <motion.div
        initial={false}
        animate={{ rotateY: isDead ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', width: size, height: size }}
      >
        {/* Ön Yüz (Canlı) */}
        <div 
          className={`absolute inset-0 rounded-md flex-shrink-0 border bg-noir-card ${borderClass}`} 
          style={{ backfaceVisibility: 'hidden', width: '100%', height: '100%' }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-md">
            {imageUrl ? (
              <img src={imageUrl} alt={suspect.name}
                className="w-full h-full object-cover object-top" draggable={false} />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
            )}
          </div>

          {/* Exonerated */}
          {state === 'exonerated' && (
            <>
              <div className="absolute inset-0 bg-noir-green/15 flex items-center justify-center pointer-events-none z-10" />
              <div
                className="absolute bg-noir-green text-black font-display font-bold rounded shadow-sm pointer-events-none z-20 border border-black/20 tracking-wider"
                style={{
                  fontSize: Math.max(7, Math.round(size * 0.1)),
                  padding: '1px 4px',
                  bottom: Math.max(14, Math.round(size * 0.22)),
                  left: 4,
                  rotate: '-8deg',
                  transform: 'rotate(-8deg)',
                }}
              >
                MASUM
              </div>
            </>
          )}

          {/* İsim Overlay (Ön Yüz) */}
          {showName && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#09090F] via-[#09090F]/80 to-transparent pt-6 pb-1 px-1 text-center pointer-events-none rounded-b-md">
              <div
                className="font-body font-medium text-noir-text leading-tight drop-shadow-md"
                style={{
                  fontSize: nameFontSize ?? Math.max(9, Math.round(size * 0.14)),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {suspect.name}
              </div>
            </div>
          )}
        </div>

        {/* Arka Yüz (Ölü) */}
        <div 
          className="absolute inset-0 rounded-md flex items-center justify-center border border-red-900/50 shadow-inner"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #3a1c1c 0%, #221013 60%, #281010 100%)',
          }}
        >
          {/* Karakter görseli — eskisinden daha açık ve kırmızımsı */}
          <div className="absolute inset-0 grayscale" style={{ opacity: 0.75 }}>
            {imageUrl ? (
              <img src={imageUrl} className="w-full h-full object-cover object-top" draggable={false} />
            ) : null}
          </div>
          {/* Kırmızı tint overlay */}
          <div className="absolute inset-0 rounded-md" style={{ background: 'rgba(120,20,20,0.25)' }} />
          <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto z-10 pointer-events-none" style={{ width: '85%', height: '85%', filter: 'drop-shadow(0 0 8px rgba(180,20,20,0.6))' }}>
            <defs>
              <filter id={`spray-paint-${suspect.id}`} x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="3" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                <feGaussianBlur in="displaced" stdDeviation="0.4" result="blurred" />
                <feComponentTransfer in="blurred">
                  <feFuncA type="linear" slope="2" intercept="-0.2" />
                </feComponentTransfer>
              </filter>
            </defs>
            <g filter={`url(#spray-paint-${suspect.id})`} fill="#A01515" opacity="0.95">
              {/* Çapraz 1 (Sol üst - Sağ alt) */}
              <path d="M 12 10 Q 30 30 50 50 T 88 92 Q 82 98 72 88 T 35 48 Q 10 20 12 10 Z" />
              {/* Çapraz 2 (Sağ üst - Sol alt) */}
              <path d="M 88 10 Q 70 30 50 50 T 12 92 Q 18 98 28 88 T 65 48 Q 90 20 88 10 Z" />

              {/* Akıntılar / Damlalar */}
              <path d="M 32 75 Q 32 95 33 98 Q 34 95 34 76 Z" />
              <circle cx="33" cy="99" r="1.5" />

              <path d="M 70 80 Q 70 92 71 95 Q 72 92 72 81 Z" />
              <circle cx="71" cy="96" r="1.2" />

              <path d="M 46 65 Q 46 78 46.5 80 Q 47 78 47 66 Z" />
              <circle cx="46.5" cy="81" r="0.8" />

              {/* Sıçramalar */}
              <circle cx="18" cy="22" r="1.5" />
              <circle cx="85" cy="25" r="1.8" />
              <circle cx="65" cy="18" r="1.2" />
              <circle cx="25" cy="85" r="1.5" />
              <circle cx="78" cy="82" r="1" />
            </g>
          </svg>

          {/* İsim Overlay (Arka Yüz) */}
          {showName && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f0608] via-[#0f0608]/80 to-transparent pt-6 pb-1 px-1 text-center pointer-events-none rounded-b-md">
              <div
                className="font-body font-medium leading-tight drop-shadow-md"
                style={{
                  fontSize: nameFontSize ?? Math.max(9, Math.round(size * 0.14)),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'rgba(160,80,80,0.9)',
                }}
              >
                {suspect.name}
              </div>
            </div>
          )}
        </div>

      </motion.div>

      {/* Badge'ler — 3D dönüşün DIŞINDA, pozisyon sabit kalır, hover büyümesi ezmez (z-[60]) */}

      {/* Mine badge — büyüteç (dedektif) / kılıç (katil) */}
      {(state === 'mine' || isIdentityBadge) && (
        <div className={`
          absolute -top-2 -right-2 rounded-full p-1 shadow-lg border-[1.5px] border-[#0A0C0E] z-[60]
          flex items-center justify-center pointer-events-none text-white
          ${(identityRole || playerRole) === 'killer' ? 'bg-[#C0392B]' : 'bg-noir-blue'}
        `}>
          {(identityRole || playerRole) === 'killer' ? (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.92 5H5l9 9 1-.94m4.96 6.06-.84.84a.996.996 0 0 1-1.41 0l-3.12-3.12-2.68 2.66-1.41-1.41 1.42-1.42L3 7.75V3h4.75l8.92 8.92 1.42-1.42 1.41 1.41-2.67 2.67 3.12 3.12c.4.4.4 1.03.01 1.42z"/>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          )}
        </div>
      )}

      {/* Disguise badge — mor kılıç, Standart mod */}
      {isDisguise && (
        <div className="
          absolute -top-2 -right-2 rounded-full p-1 shadow-lg border-[1.5px] border-[#0A0C0E] z-[60]
          flex items-center justify-center pointer-events-none
          bg-[#7B3FBE]
        " style={{ boxShadow: '0 0 8px rgba(123,63,190,0.7)' }}>
          <svg className="w-3.5 h-3.5" fill="rgba(255,255,255,0.85)" viewBox="0 0 24 24">
            <path d="M6.92 5H5l9 9 1-.94m4.96 6.06-.84.84a.996.996 0 0 1-1.41 0l-3.12-3.12-2.68 2.66-1.41-1.41 1.42-1.42L3 7.75V3h4.75l8.92 8.92 1.42-1.42 1.41 1.41-2.67 2.67 3.12 3.12c.4.4.4 1.03.01 1.42z"/>
          </svg>
        </div>
      )}

      {/* Kılıç badge — sağ üst (katil komşuydu, dedektif görür) */}
      {canvasAdjacent && canvasTypes.includes('killer') && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 6, right: 6,
            width: Math.max(16, Math.round(size * 0.26)),
            height: Math.max(16, Math.round(size * 0.26)),
            zIndex: 50,
          }}
        >
          <motion.div
            className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
            animate={{
              boxShadow: [
                '0 0 6px rgba(192,57,43,0.5)',
                '0 0 18px rgba(192,57,43,1.0), 0 0 8px rgba(192,57,43,0.8)',
                '0 0 6px rgba(192,57,43,0.5)',
              ],
              scale: [1, 1.18, 1],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: 'rgba(192,57,43,0.22)',
              border: '1.5px solid rgba(192,57,43,0.9)',
              padding: 2,
            }}
          >
            <svg viewBox="0 0 24 24" className="w-full h-full p-0.5" fill="rgba(255,100,80,0.95)">
              <path d="M6.92 5H5l9 9 1-.94m4.96 6.06-.84.84a.996.996 0 0 1-1.41 0l-3.12-3.12-2.68 2.66-1.41-1.41 1.42-1.42L3 7.75V3h4.75l8.92 8.92 1.42-1.42 1.41 1.41-2.67 2.67 3.12 3.12c.4.4.4 1.03.01 1.42z"/>
            </svg>
          </motion.div>
        </div>
      )}

      {/* Dedektif badge — sol üst (dedektif komşuydu, katil görür) */}
      {canvasAdjacent && canvasTypes.includes('detective') && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 6, left: 6,
            width: Math.max(16, Math.round(size * 0.26)),
            height: Math.max(16, Math.round(size * 0.26)),
            zIndex: 50,
          }}
        >
          <motion.div
            className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
            animate={{
              boxShadow: [
                '0 0 6px rgba(64,144,200,0.5)',
                '0 0 18px rgba(64,144,200,1.0), 0 0 8px rgba(64,144,200,0.8)',
                '0 0 6px rgba(64,144,200,0.5)',
              ],
              scale: [1, 1.18, 1],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: 'rgba(64,144,200,0.22)',
              border: '1.5px solid rgba(64,144,200,0.9)',
              padding: 2,
            }}
          >
            <img
              src="/dedektif.png"
              alt="dedektif"
              className="w-full h-full object-contain"
              style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }}
            />
          </motion.div>
        </div>
      )}

      {/* Oyun Sonu Çerçeveleri (z-50) - Simgelerin (z-[60]) altında kalacak şekilde */}
      {endgameRole === 'killer' && (
        <div className="absolute inset-0 rounded-lg border-[3px] border-red-500 pointer-events-none z-50 animate-pulse"
             style={{ boxShadow: '0 0 10px rgba(239,68,68,0.5), inset 0 0 8px rgba(239,68,68,0.3)' }} />
      )}
      {endgameDisguise && (
        <div className="absolute inset-0 rounded-lg border-[3px] border-purple-500 pointer-events-none z-50 animate-pulse"
             style={{ boxShadow: '0 0 10px rgba(168,85,247,0.5), inset 0 0 8px rgba(168,85,247,0.3)' }} />
      )}
      {endgameRole === 'inspector' && (
        <div className="absolute inset-0 rounded-lg border-[3px] border-blue-500 pointer-events-none z-50 animate-pulse"
             style={{ boxShadow: '0 0 10px rgba(59,130,246,0.5), inset 0 0 8px rgba(59,130,246,0.3)' }} />
      )}
    </div>
  );
}
