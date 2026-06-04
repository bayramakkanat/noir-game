import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { PHASE, TURN, CELL_STATUS } from '../game/constants.js';
import { SUSPECTS } from '../data/suspects.js';
import SuspectCard from '../components/SuspectCard.jsx';


// ─── Dinamik grid boyutu ──────────────────────────────────────────────────────
function useGridCellSize() {
  const [cellSize, setCellSize] = React.useState(72);

  React.useEffect(() => {
    function calc() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelW = vw >= 1024 ? 288 : 0;
      const availW = vw - panelW - 16; // kenar boşluklarını minimuma indirdik
      const availH = vh - 16;
      
      // Yaklaşık gap hesabı
      const estCell = Math.min(availW / 5, availH / 5);
      const gap = Math.max(3, Math.round(estCell * 0.055));
      
      const fromW = Math.floor((availW - (4 * gap)) / 5);
      const fromH = Math.floor((availH - (4 * gap)) / 5);
      const cell = Math.max(60, Math.min(fromW, fromH));
      setCellSize(cell);
    }

    calc();

    // Debounce: resize sırasında framer-motion layout animasyonunu tetiklememek için
    let timer;
    function onResize() {
      clearTimeout(timer);
      timer = setTimeout(calc, 150);
    }
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, []);

  return cellSize;
}

function suspect(id) {
  return SUSPECTS.find((s) => s.id === id) ?? { id, name: `#${id}` };
}

// ─── Tahta hücresi ────────────────────────────────────────────────────────────
function BoardCell({ cell, r, c, game, actions, cellSize }) {
  const { pendingAction, humanRole, activeSide } = game;
  const secrets = actions.getActingSecrets(game);
  const humanCanAct = activeSide === 'human';

  if (!cell) return <div style={{ width: 68, height: 68 }} />;

  const isDeceased = cell.status === CELL_STATUS.DECEASED;

  const isPickableIdentity = humanRole === 'killer' && 
    (game.phase === PHASE.KILLER_PICK_IDENTITY || game.phase === PHASE.KILLER_PICK_DISGUISE) && 
    game.killer.hand.includes(cell.suspectId);
  const isPickableInspector = humanRole === 'inspector' && game.phase === PHASE.INSPECTOR_PICK_IDENTITY && game.inspector.hand.includes(cell.suspectId);
  const isPickable = isPickableIdentity || isPickableInspector;

  const isTargetable =
    humanCanAct &&
    (pendingAction === 'kill' || pendingAction === 'arrest') &&
    actions.isCoordTargetable(game, r, c, pendingAction, secrets);

  const isMyIdentity =
    humanRole === 'killer'
      ? cell.suspectId === secrets.killerIdentityId
      : cell.suspectId === secrets.inspectorSecretId;

  const isExonerated = game.publicExonerated.includes(cell.suspectId);

  let cardState = 'normal';
  if (isDeceased) cardState = 'eliminated';
  else if (isExonerated) cardState = 'exonerated';
  else if (isMyIdentity) cardState = 'mine';
  // Hedeflenebilir/Seçilebilir kartlarda SuspectCard'ın kendi sarı sınırını kapattık,
  // çünkü BoardCell'in dışına animate-pulse ring ekliyoruz. (Çift çerçeveyi önlemek için)

  function handleClick() {
    if (!humanCanAct || isDeceased) return;
    if (isPickableIdentity) {
      actions.pickKillerIdentity(cell.suspectId);
      return;
    }
    if (isPickableInspector) {
      actions.pickInspectorIdentity(cell.suspectId);
      return;
    }
    if (pendingAction === 'kill' || pendingAction === 'arrest') actions.executeBoardAction(r, c);
  }

  // Wrap-around kartlar (tahta sınırından dönenler) daha yüksek z-index ile uçsun
  const isWrapAround = game.lastShift && (() => {
    const ls = game.lastShift;
    if (ls.axis === 'row' && r === ls.index) {
      if (ls.direction === 'right' && c === 0) return true;
      if (ls.direction === 'left'  && c === 4) return true;
    }
    if (ls.axis === 'col' && c === ls.index) {
      if (ls.direction === 'down' && r === 0) return true;
      if (ls.direction === 'up'   && r === 4) return true;
    }
    return false;
  })();

  return (
    <motion.div
      layout="position"
      layoutId={`card-${cell.suspectId}`}
      initial={false}
      animate={{ scale: (isTargetable || isPickable) ? 1.05 : 1 }}
      transition={{
        layout: {
          type: 'spring',
          stiffness: isWrapAround ? 32 : 38,
          damping:   isWrapAround ? 12 : 14,
          mass:      1,
        },
        scale: { type: 'spring', stiffness: 300, damping: 20 }
      }}
      style={{ zIndex: isWrapAround ? 50 : (isTargetable || isPickable ? 30 : 1), position: 'relative' }}
      whileHover={(!isDeceased && humanCanAct) ? { scale: 1.07, zIndex: 40 } : {}}
      className={`cursor-pointer`}
    >
      {(isTargetable || isPickable) && (
        <div className="absolute inset-0 rounded-lg ring-[3px] ring-yellow-400 animate-pulse pointer-events-none z-20" />
      )}
      <SuspectCard
        suspect={suspect(cell.suspectId)}
        state={cardState}
        size={cellSize}
        onClick={handleClick}
        showName
        playerRole={humanRole}
        nameFontSize={Math.max(10, Math.round(cellSize * 0.15))}
      />
    </motion.div>
  );
}

// ─── Ok butonu ────────────────────────────────────────────────────────────────
function ArrowBtn({ onClick, dir, highlighted }) {
  const arrows = { left: '◀', right: '▶', up: '▲', down: '▼' };
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: [1, 1.15, 1] }}
      exit={{ opacity: 0, scale: 0.7 }}
      whileHover={{ scale: 1.35, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.85 }}
      transition={{ 
        scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
        opacity: { duration: 0.2 }
      }}
      className={`
        flex items-center justify-center rounded-lg font-mono font-bold leading-none select-none
        border transition-colors duration-150 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.8)]
        ${highlighted
          ? 'text-yellow-300 bg-yellow-500/30 border-yellow-500/70'
          : 'text-white bg-black/50 hover:bg-black/70 border-white/20 hover:border-yellow-500/50 hover:text-yellow-400'
        }
      `}
      style={{ width: 36, height: 36, fontSize: 18 }}
    >
      {arrows[dir]}
    </motion.button>
  );
}

// ─── Çift yönlü ok grubu ──────────────────────────────────────────────────────
function DualArrow({ dir1, dir2, onClick1, onClick2, highlighted, visible }) {
  if (!visible) return null;
  return (
    <AnimatePresence>
      <motion.div
        key="dual"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <ArrowBtn dir={dir1} onClick={onClick1} highlighted={highlighted} />
        <ArrowBtn dir={dir2} onClick={onClick2} highlighted={highlighted} />
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Grid + ok sistemi ────────────────────────────────────────────────────────
function BoardWithArrows({ game, actions, cellSize }) {
  const { pendingAction, pendingShift, activeSide, lastShift } = game;
  const humanCanAct = activeSide === 'human';
  const shiftMode = pendingAction === 'shift';

  const selAxis  = pendingShift?.step === 'direction' ? pendingShift.axis  : null;
  const selIndex = pendingShift?.step === 'direction' ? pendingShift.index : null;

  function handleColArrow(c, dir) {
    if (!humanCanAct || !shiftMode) return;
    if (selAxis === 'col' && selIndex === c) actions.selectShiftDirection(dir);
    else actions.selectShiftLine('col', c);
  }
  function handleRowArrow(r, dir) {
    if (!humanCanAct || !shiftMode) return;
    if (selAxis === 'row' && selIndex === r) actions.selectShiftDirection(dir);
    else actions.selectShiftLine('row', r);
  }

  // Ok görünür mü?
  function colArrowVisible(c) {
    if (!shiftMode) return false;
    if (selAxis === null) return true;               // henüz seçilmedi
    if (selAxis === 'col' && selIndex === c) return true; // bu sütun seçili
    return false;
  }
  function rowArrowVisible(r) {
    if (!shiftMode) return false;
    if (selAxis === null) return true;
    if (selAxis === 'row' && selIndex === r) return true;
    return false;
  }
  // Vurgulu mu? (yön seçim aşaması)
  function colHighlighted(c) { return selAxis === 'col' && selIndex === c; }
  function rowHighlighted(r) { return selAxis === 'row' && selIndex === r; }
  // Satır/sütun sarı çerçeve
  function isHlRow(r) { return selAxis === 'row' && selIndex === r; }
  function isHlCol(c) { return selAxis === 'col' && selIndex === c; }

  const CELL = cellSize;
  const GAP  = Math.max(3, Math.round(cellSize * 0.055));

  return (
    <LayoutGroup>
      <div className="flex flex-col items-center">
        {/* GRID */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(5, ${CELL}px)`,
            gridTemplateRows: `repeat(5, ${CELL}px)`,
            width: CELL * 5 + GAP * 4,
            height: CELL * 5 + GAP * 4,
            gap: GAP,
            position: 'relative',
          }}
        >
          {game.board.map((row, r) =>
            row.map((cell, c) => {
              const hl = isHlRow(r) || isHlCol(c);
              return (
                <div
                  key={`slot-${r}-${c}`}
                  style={{
                    borderRadius: 10,
                    outline: hl ? '3px solid rgba(250,204,21,0.6)' : 'none',
                    outlineOffset: '-1px',
                    transition: 'outline 0.2s',
                    position: 'relative',
                  }}
                >
                  <BoardCell cell={cell} r={r} c={c} game={game} actions={actions} cellSize={CELL} />
                </div>
              );
            })
          )}

          {/* İÇ OKLAR */}
          <AnimatePresence>
            {shiftMode && [0,1,2,3,4].map(r => {
              const vis = rowArrowVisible(r);
              const hl  = rowHighlighted(r);
              if (!vis) return null;
              return (
                <React.Fragment key={`row-arrows-${r}`}>
                  <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}} 
                    style={{ position: 'absolute', left: 4, top: r * (CELL + GAP) + CELL / 2, transform: 'translateY(-50%)', zIndex: 100 }}>
                    <ArrowBtn dir="left" onClick={() => handleRowArrow(r, 'left')} highlighted={hl} />
                  </motion.div>
                  <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}}
                    style={{ position: 'absolute', right: 4, top: r * (CELL + GAP) + CELL / 2, transform: 'translateY(-50%)', zIndex: 100 }}>
                    <ArrowBtn dir="right" onClick={() => handleRowArrow(r, 'right')} highlighted={hl} />
                  </motion.div>
                </React.Fragment>
              );
            })}
            
            {shiftMode && [0,1,2,3,4].map(c => {
              const vis = colArrowVisible(c);
              const hl  = colHighlighted(c);
              if (!vis) return null;
              return (
                <React.Fragment key={`col-arrows-${c}`}>
                  <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}}
                    style={{ position: 'absolute', top: 4, left: c * (CELL + GAP) + CELL / 2, transform: 'translateX(-50%)', zIndex: 100 }}>
                    <ArrowBtn dir="up" onClick={() => handleColArrow(c, 'up')} highlighted={hl} />
                  </motion.div>
                  <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}}
                    style={{ position: 'absolute', bottom: 4, left: c * (CELL + GAP) + CELL / 2, transform: 'translateX(-50%)', zIndex: 100 }}>
                    <ArrowBtn dir="down" onClick={() => handleColArrow(c, 'down')} highlighted={hl} />
                  </motion.div>
                </React.Fragment>
              );
            })}
          </AnimatePresence>
        </div>

      {shiftMode && (
        <div className="text-center mt-2">
          <button
            onClick={actions.cancelPending}
            className="font-mono text-[10px] text-[#6B6B85] hover:text-[#AAAAB0] transition-colors"
          >
            kaydırmayı iptal et
          </button>
        </div>
      )}
    </div>
    </LayoutGroup>
  );
}

// ─── Kimlik seçim overlay ─────────────────────────────────────────────────────
function IdentityPicker({ game, actions }) {
  return null;
}

// ─── Exonerate overlay ────────────────────────────────────────────────────────
function ExonerateOverlay({ game, actions }) {
  if (game.pendingAction !== 'exonerate' || !game.pendingExonerateDiscard) return null;
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-[#0E0E16] border border-noir-border rounded-2xl p-8 max-w-xl w-full mx-4 anim-fade-in">
        <div className="font-mono text-[10px] tracking-widest text-[#6B6B85] uppercase mb-2">Temize çıkar</div>
        <h2 className="font-display text-xl text-noir-text mb-1">Hangi kartı at?</h2>
        <p className="text-xs text-[#7A7A6A] font-mono mb-6">Seçtiğin kart açıklanır; desteden yeni bir kart çekersin.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          {game.inspector.hand.map((id) => (
            <div key={id} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => actions.completeExonerate(id)}>
              <SuspectCard suspect={suspect(id)} size={72} showName playerRole="inspector" />
              <div className="text-[10px] font-mono text-noir-muted group-hover:text-green-400 transition-colors tracking-widest uppercase">At & Temize Çıkar</div>
            </div>
          ))}
        </div>
        <button onClick={actions.cancelPending} className="mt-5 text-[10px] text-[#8080A0] font-mono block mx-auto hover:text-[#AAAAB0]">iptal</button>
      </div>
    </div>
  );
}

// ─── Toast Bildirimleri ───────────────────────────────────────────────────────
function ToastNotification({ logs }) {
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    if (logs.length > 0) {
      setToast(logs[0]);
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [logs]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#1A1A24] text-[#E0DDD4] px-6 py-3 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-noir-border/50 text-xs sm:text-sm font-mono max-w-[90vw] text-center"
          dangerouslySetInnerHTML={{ __html: toast }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Sağ panel ───────────────────────────────────────────────────────────────
function ActionPanel({ game, actions }) {
  const {
    phase, turn, humanRole, activeSide,
    killer, inspector, publicExonerated, evidenceDeck,
    logs, pendingAction, board,
  } = game;

  const humanCanAct = activeSide === 'human';
  const secrets = actions.getActingSecrets(game);
  const inPlay = phase === PHASE.PLAY;
  const isKillerFirstKill = phase === PHASE.KILLER_FIRST_KILL;
  const isKillerTurn = turn === TURN.KILLER;
  const isHumanKiller = humanRole === 'killer';
  const isHumanInspector = humanRole === 'inspector';

  const deadCount = board.flat().filter((c) => c?.status === CELL_STATUS.DECEASED).length;
  const myIdentityId = isHumanKiller ? secrets.killerIdentityId : secrets.inspectorSecretId;
  const mySuspect = myIdentityId != null ? suspect(myIdentityId) : null;

  return (
    <div className="
      w-full lg:w-72 
      fixed bottom-0 left-0 right-0 z-40 lg:static 
      max-h-[50vh] lg:max-h-none overflow-y-auto lg:overflow-hidden
      border-t lg:border-t-0 lg:border-l border-noir-border/40 
      flex flex-col bg-[#09090F] lg:min-h-screen
      shadow-[0_-10px_40px_rgba(0,0,0,0.8)] lg:shadow-none
    ">

      {/* Başlık + tur */}
      <div className="p-5 border-b border-noir-border/30">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-xl text-noir-text anim-flicker leading-none">NOIR</div>
            <div className="font-mono text-[10px] text-[#8080A0] tracking-widest uppercase mt-1">
              {isHumanKiller ? '🔪 Katil' : '🔍 Dedektif'}
            </div>
          </div>
          <div className="text-right">
            <div className={`font-mono text-[11px] font-bold ${humanCanAct ? 'text-yellow-400 anim-pulse' : 'text-[#7A7A6A]'}`}>
              {humanCanAct ? '● Senin turun' : activeSide === 'ai' ? '○ AI oynuyor...' : '○ Bekleniyor'}
            </div>
            {(inPlay || isKillerFirstKill) && (
              <div className="font-mono text-[10px] text-[#8080A0] mt-0.5">
                {isKillerTurn ? 'Katil turu' : 'Dedektif turu'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kimliğim */}
      {mySuspect && (
        <div className="p-4 border-b border-noir-border/30">
          <div className="font-mono text-[10px] text-[#8080A0] tracking-widest uppercase mb-2">Kimliğim</div>
          <div className="flex items-center gap-3">
            <SuspectCard suspect={mySuspect} size={48} showName={false} state="mine" playerRole={humanRole} />
            <div>
              <div className="font-body text-sm text-noir-text font-semibold">{mySuspect.name}</div>
              <div className="font-mono text-[10px] text-[#8080A0]">{isHumanKiller ? 'Katil kimliği' : 'Gizli kimlik'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Aksiyonlar */}
      {humanCanAct && (phase === PHASE.KILLER_PICK_IDENTITY || phase === PHASE.KILLER_PICK_DISGUISE) && isHumanKiller && (
        <div className="p-4 border-b border-noir-border/30 bg-yellow-900/10">
          <div className="font-mono text-[10px] text-yellow-400 tracking-widest uppercase mb-3">
            Kimlik Seç
          </div>
          <p className="text-xs text-[#AAAAB0] mb-2">Tahtada sarı ile işaretlenmiş kartlardan hangisi olmak istediğini seç. (Diğeri kılık değiştirme kartın olacak)</p>
        </div>
      )}

      {humanCanAct && phase === PHASE.INSPECTOR_PICK_IDENTITY && isHumanInspector && (
        <div className="p-4 border-b border-noir-border/30 bg-blue-900/10">
          <div className="font-mono text-[10px] text-blue-400 tracking-widest uppercase mb-3">
            Gizli Kimlik Seç
          </div>
          <p className="text-xs text-[#AAAAB0] mb-2">Tahtada sarı ile işaretlenmiş gizli kimliklerden birini seç. (Komşularını tutuklayacaksın)</p>
        </div>
      )}

      {humanCanAct && (inPlay || isKillerFirstKill) && (
        <div className="p-4 border-b border-noir-border/30">
          <div className="font-mono text-[10px] text-[#8080A0] tracking-widest uppercase mb-3">
            {isKillerFirstKill ? 'İlk Hamle — Komşunu Öldür' : 'Hamle Seç'}
          </div>
          <div className="flex flex-col gap-2">

            {isHumanKiller && (
              <>
                <button
                  onClick={() => pendingAction === 'kill' ? actions.cancelPending() : actions.setPending('kill')}
                  className={`w-full px-4 py-2.5 rounded-lg border font-mono text-xs tracking-widest uppercase transition-all text-left flex items-center gap-2 ${
                    pendingAction === 'kill'
                      ? 'border-red-700 bg-red-900/20 text-red-400'
                      : 'border-noir-border text-noir-muted hover:border-red-700 hover:text-red-400'
                  }`}
                >
                  🗡️ {isKillerFirstKill ? 'Hedef Seç' : 'Öldür'}
                  {pendingAction === 'kill' && <span className="ml-auto text-[9px] opacity-60">tahtaya tıkla</span>}
                </button>
                {inPlay && (
                  <button
                    onClick={actions.executeDisguise}
                    disabled={evidenceDeck.length === 0}
                    className="w-full px-4 py-2.5 rounded-lg border border-noir-border/60 text-[#AAAAB0] font-mono text-xs tracking-widest uppercase hover:border-purple-700 hover:text-purple-400 transition-all text-left flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    ⇄ Kılık Değiştir
                  </button>
                )}
              </>
            )}

            {isHumanInspector && inPlay && (
              <>
                <button
                  onClick={() => pendingAction === 'arrest' ? actions.cancelPending() : actions.setPending('arrest')}
                  className={`w-full px-4 py-2.5 rounded-lg border font-mono text-xs tracking-widest uppercase transition-all text-left flex items-center gap-2 ${
                    pendingAction === 'arrest'
                      ? 'border-blue-600 bg-blue-900/20 text-blue-400'
                      : 'border-noir-border/60 text-[#AAAAB0] hover:border-blue-600 hover:text-blue-400'
                  }`}
                >
                  🔍 Tutuklama
                  {pendingAction === 'arrest' && <span className="ml-auto text-[9px] opacity-60">tahtaya tıkla</span>}
                </button>
                <button
                  onClick={actions.beginExonerate}
                  disabled={evidenceDeck.length === 0 || inspector.hand.length === 0}
                  className="w-full px-4 py-2.5 rounded-lg border border-noir-border/60 text-[#AAAAB0] font-mono text-xs tracking-widest uppercase hover:border-green-700 hover:text-green-400 transition-all text-left flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
                >
                  ✓ Temize Çıkar
                </button>
              </>
            )}

            {inPlay && (
              <button
                onClick={() => pendingAction === 'shift' ? actions.cancelPending() : actions.beginShift()}
                className={`w-full px-4 py-2.5 rounded-lg border font-mono text-xs tracking-widest uppercase transition-all text-left flex items-center gap-2 ${
                  pendingAction === 'shift'
                    ? 'border-yellow-600 bg-yellow-900/10 text-yellow-400'
                    : 'border-noir-border/60 text-[#AAAAB0] hover:border-yellow-700 hover:text-yellow-400'
                }`}
              >
                ↔ Tahta Kaydır
                {pendingAction === 'shift' && <span className="ml-auto text-[9px] opacity-60">ok'a tıkla</span>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* İstatistikler */}
      <div className="p-4 border-b border-noir-border/30 grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="font-mono text-base font-bold text-red-500">{deadCount}</div>
          <div className="font-mono text-[10px] text-[#8080A0] uppercase">Ölü</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-base font-bold text-green-500">{publicExonerated.length}</div>
          <div className="font-mono text-[10px] text-[#8080A0] uppercase">Masum</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-base font-bold text-[#AAAAAA]">{evidenceDeck.length}</div>
          <div className="font-mono text-[10px] text-[#8080A0] uppercase">Deste</div>
        </div>
      </div>

      {/* Dedektif eli */}
      {isHumanInspector && inspector.hand.length > 0 && (
        <div className="p-4 border-b border-noir-border/30">
          <div className="font-mono text-[10px] text-[#8080A0] tracking-widest uppercase mb-2">Elimdeki Kartlar</div>
          <div className="flex flex-wrap gap-1.5">
            {inspector.hand.map((id) => (
              <SuspectCard key={id} suspect={suspect(id)} size={44} showName={false} playerRole="inspector" />
            ))}
          </div>
        </div>
      )}

      {/* Temize çıkarılanlar */}
      {publicExonerated.length > 0 && (
        <div className="p-4 border-b border-noir-border/30">
          <div className="font-mono text-[10px] text-[#8080A0] tracking-widest uppercase mb-2">Masum İlan Edilenler</div>
          <div className="flex flex-wrap gap-1">
            {publicExonerated.map((id) => (
              <SuspectCard key={id} suspect={suspect(id)} size={34} showName={false} state="exonerated" />
            ))}
          </div>
        </div>
      )}

      {/* Günlük (Mobilde Gizli) */}
      <div className="hidden lg:flex flex-1 p-4 overflow-hidden flex-col min-h-0">
        <div className="font-mono text-[10px] text-[#8080A0] tracking-widest uppercase mb-2">Olay Günlüğü</div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`font-mono text-[10px] leading-relaxed pb-1.5 border-b border-noir-border/20 ${i === 0 ? 'text-[#E0DDD4]' : 'text-[#9A9890]'}`}
              dangerouslySetInnerHTML={{ __html: log }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ana GameScreen ───────────────────────────────────────────────────────────
export default function GameScreen({ game, actions }) {
  const cellSize = useGridCellSize();
  return (
    <div className="h-[100dvh] w-full flex flex-col lg:flex-row pb-[50vh] lg:pb-0 overflow-hidden">
      <div className="flex-1 flex items-center justify-center px-4 lg:px-6 pt-4">
        <BoardWithArrows game={game} actions={actions} cellSize={cellSize} />
      </div>
      <ActionPanel game={game} actions={actions} />
      <IdentityPicker game={game} actions={actions} />
      <ExonerateOverlay game={game} actions={actions} />
      <ToastNotification logs={game.logs} />
    </div>
  );
}
