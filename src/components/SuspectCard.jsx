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
              <div className="absolute top-2 right-1 bg-noir-green text-black font-display font-bold text-[10px] px-1.5 py-0.5 rounded shadow-sm rotate-12 pointer-events-none z-20 border border-black/20 tracking-wider">
                MASUM
              </div>
            </>
          )}

          {/* Mine badge */}
          {state === 'mine' && (
            <div className={`
              absolute -top-2 -right-2 rounded-full p-1 shadow-lg border-[1.5px] border-[#0A0C0E] z-30
              flex items-center justify-center pointer-events-none text-white
              ${playerRole === 'killer' ? 'bg-[#C0392B]' : 'bg-noir-blue'}
            `}>
              {playerRole === 'killer' ? (
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
          className="absolute inset-0 rounded-md flex items-center justify-center border border-noir-border/40 bg-[#0C0C10] shadow-inner"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', width: '100%', height: '100%' }}
        >
          <div className="absolute inset-0 opacity-20 grayscale">
            {imageUrl ? (
              <img src={imageUrl} className="w-full h-full object-cover object-top" draggable={false} />
            ) : null}
          </div>
          <span className="text-noir-red font-display opacity-90 drop-shadow-md z-10" style={{ fontSize: size * 0.6 }}>
            ✕
          </span>

          {/* İsim Overlay (Arka Yüz) */}
          {showName && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#09090F] via-[#09090F]/80 to-transparent pt-6 pb-1 px-1 text-center pointer-events-none rounded-b-md">
              <div
                className="font-body font-medium leading-tight text-[#6B6B85] line-through drop-shadow-md"
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
      </motion.div>
    </div>
  );
}
