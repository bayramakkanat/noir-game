import React, { useState } from 'react';
import { useFullscreen } from '../hooks/useFullscreen.js';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { PHASE, TURN, CELL_STATUS } from '../game/constants.js';
import { SUSPECTS } from '../data/suspects.js';
import SuspectCard from '../components/SuspectCard.jsx';
import HowToPlayModal from '../components/HowToPlayModal.jsx';

const BOARD_LAYOUT_TRANSITION = {
  type: 'tween',
  duration: 2.2,
  ease: [0.4, 0, 0.2, 1],
};

const CARD_LAYOUT_TRANSITION = {
  type: 'tween',
  duration: 2.2,
  ease: [0.4, 0, 0.2, 1],
};

// ─── Kaydırma overlay animasyonu ─────────────────────────────────────────────
function ShiftOverlay({ lastShift, cellSize, activeRows, activeCols }) {
  const [visible, setVisible] = React.useState(false);
  const [shift, setShift] = React.useState(null);
  const prevShift = React.useRef(null);

  React.useEffect(() => {
    if (!lastShift) return;
    const key = JSON.stringify(lastShift);
    if (key === JSON.stringify(prevShift.current)) return;
    prevShift.current = lastShift;
    setShift(lastShift);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [lastShift]);

  if (!visible || !shift) return null;

  const GAP = Math.max(3, Math.round(cellSize * 0.055));
  const isRow = shift.axis === 'row';
  const rowIdx = activeRows.indexOf(shift.index);
  const colIdx = activeCols.indexOf(shift.index);

  const dirArrow = { left: '←', right: '→', up: '↑', down: '↓' }[shift.direction];
  const dirLabel = { left: 'Sola', right: 'Sağa', up: 'Yukarı', down: 'Aşağı' }[shift.direction];
  const label = `${isRow ? `Satır ${shift.index + 1}` : `Sütun ${shift.index + 1}`} — ${dirLabel}`;

  // Overlay pozisyonu ve boyutu
  const overlayStyle = isRow ? {
    top: rowIdx * (cellSize + GAP),
    left: 0,
    width: activeCols.length * cellSize + (activeCols.length - 1) * GAP,
    height: cellSize,
  } : {
    top: 0,
    left: colIdx * (cellSize + GAP),
    width: cellSize,
    height: activeRows.length * cellSize + (activeRows.length - 1) * GAP,
  };

  // Ok hareketi
  const fromX = isRow ? (shift.direction === 'left' ? 30 : -30) : 0;
  const fromY = !isRow ? (shift.direction === 'up' ? 30 : -30) : 0;
  const toX = isRow ? (shift.direction === 'left' ? -30 : 30) : 0;
  const toY = !isRow ? (shift.direction === 'up' ? -30 : 30) : 0;

  // Sweep hareketi: kaydırma yönünden gelip karşı tarafa geçiyor
  const sweepFrom = isRow
    ? { x: shift.direction === 'right' ? '-100%' : '100%', y: 0 }
    : { x: 0, y: shift.direction === 'down' ? '-100%' : '100%' };
  const sweepTo = isRow
    ? { x: shift.direction === 'right' ? '100%' : '-100%', y: 0 }
    : { x: 0, y: shift.direction === 'down' ? '100%' : '-100%' };

  return (
    <motion.div
      key={JSON.stringify(shift)}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 3.2, times: [0, 0.08, 0.75, 1], ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        ...overlayStyle,
        borderRadius: 12,
        background: 'rgba(200, 168, 75, 0.10)',
        border: '2px solid rgba(200, 168, 75, 0.75)',
        boxShadow: '0 0 24px rgba(200,168,75,0.25), inset 0 0 20px rgba(200,168,75,0.08)',
        zIndex: 200,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: isRow ? 'row' : 'column',
        gap: 8,
        overflow: 'hidden',
      }}
    >
      {/* Sweep şeridi — kaydırma yönünde geçiyor */}
      <motion.div
        initial={sweepFrom}
        animate={sweepTo}
        transition={{ duration: 3.0, ease: [0.25, 0, 0.6, 1] }}
        style={{
          position: 'absolute',
          inset: 0,
          background: isRow
            ? `linear-gradient(${shift.direction === 'right' ? 90 : 270}deg, transparent 0%, rgba(200,168,75,0.08) 30%, rgba(200,168,75,0.32) 50%, rgba(200,168,75,0.08) 70%, transparent 100%)`
            : `linear-gradient(${shift.direction === 'down' ? 180 : 0}deg, transparent 0%, rgba(200,168,75,0.08) 30%, rgba(200,168,75,0.32) 50%, rgba(200,168,75,0.08) 70%, transparent 100%)`,
        }}
      />

      {/* Ok ikonu — büyük, net, ortada belirip yavaş söner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 1, 1] }}
        transition={{ duration: 3.0, times: [0, 0.12, 0.3, 1], ease: 'easeInOut' }}
        style={{
          display: 'flex',
          flexDirection: isRow ? 'row' : 'column',
          alignItems: 'center',
          gap: 8,
          zIndex: 10,
        }}
      >
        <span style={{
          fontSize: cellSize * 0.48,
          lineHeight: 1,
          filter: 'drop-shadow(0 0 16px rgba(200,168,75,1)) drop-shadow(0 0 6px rgba(200,168,75,0.8))',
          color: 'rgba(200,168,75,1)',
        }}>
          {dirArrow}
        </span>
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: Math.max(11, cellSize * 0.13),
          color: 'rgba(200,168,75,1)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textShadow: '0 0 16px rgba(200,168,75,0.9), 0 0 6px rgba(200,168,75,0.6)',
          writingMode: isRow ? 'horizontal-tb' : 'vertical-rl',
          fontWeight: '600',
        }}>
          {label}
        </span>
      </motion.div>
    </motion.div>
  );
}

// ─── Dinamik grid boyutu ──────────────────────────────────────────────────────
function useGridCellSize(numRows, numCols) {
  const [cellSize, setCellSize] = React.useState(72);

  React.useEffect(() => {
    function calc() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelW = vw >= 1024 ? 320 : 0;
      const availW = vw - panelW - 16;
      const availH = vh - 16;
      
      const estCell = Math.min(availW / numCols, availH / numRows);
      const gap = Math.max(3, Math.round(estCell * 0.055));
      
      const fromW = Math.floor((availW - ((numCols - 1) * gap)) / numCols);
      const fromH = Math.floor((availH - ((numRows - 1) * gap)) / numRows);
      const cell = Math.max(60, Math.min(fromW, fromH));
      setCellSize(cell);
    }

    calc();

    let timer;
    function onResize() {
      clearTimeout(timer);
      timer = setTimeout(calc, 150);
    }
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, [numRows, numCols]);

  return cellSize;
}

function suspect(id) {
  return SUSPECTS.find((s) => s.id === id) ?? { id, name: `#${id}` };
}

// ─── Tahta hücresi ────────────────────────────────────────────────────────────
function BoardCell({ cell, r, c, game, actions, cellSize }) {
  const { pendingAction, humanRole, phase, turn } = game;
  const secrets = actions.getActingSecrets(game);
  const humanCanAct = (() => {
  if (phase === PHASE.KILLER_PICK_IDENTITY && humanRole === 'killer') return true;
  if (phase === PHASE.KILLER_PICK_DISGUISE && humanRole === 'killer') return true;
  if (phase === PHASE.INSPECTOR_PICK_IDENTITY && humanRole === 'inspector') return true;
  if (phase === PHASE.KILLER_FIRST_KILL && humanRole === 'killer') return true;
  if (phase === PHASE.PLAY) {
    if (turn === TURN.KILLER && humanRole === 'killer') return true;
    if (turn === TURN.INSPECTOR && humanRole === 'inspector') return true;
  }
  return false;
})();

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
      initial={false}
      animate={{ scale: (isTargetable || isPickable) ? 1.05 : 1 }}
      transition={{
        layout: CARD_LAYOUT_TRANSITION,
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

// ─── Grid + ok sistemi ────────────────────────────────────────────────────────
function BoardWithArrows({ game, actions, cellSize, activeRows, activeCols }) {
  // 🔥 YENİ SATIR
  if (!activeRows.length || !activeCols.length) return <div className="text-white/50 p-8">Yükleniyor...</div>;
  
  const { pendingAction, pendingShift, phase, turn, humanRole } = game;
  const humanCanAct = (() => {
  if (phase === PHASE.KILLER_PICK_IDENTITY && humanRole === 'killer') return true;
  if (phase === PHASE.KILLER_PICK_DISGUISE && humanRole === 'killer') return true;
  if (phase === PHASE.INSPECTOR_PICK_IDENTITY && humanRole === 'inspector') return true;
  if (phase === PHASE.KILLER_FIRST_KILL && humanRole === 'killer') return true;
  if (phase === PHASE.PLAY) {
    if (turn === TURN.KILLER && humanRole === 'killer') return true;
    if (turn === TURN.INSPECTOR && humanRole === 'inspector') return true;
  }
  return false;
})();
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
        <motion.div
          layout
          transition={{ layout: BOARD_LAYOUT_TRANSITION }}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${activeCols.length}, ${CELL}px)`,
            gridTemplateRows: `repeat(${activeRows.length}, ${CELL}px)`,
            width: CELL * activeCols.length + GAP * (activeCols.length - 1),
            height: CELL * activeRows.length + GAP * (activeRows.length - 1),
            gap: GAP,
            position: 'relative',
          }}
        >
          <AnimatePresence mode="popLayout">
            {activeRows.map((r) =>
              activeCols.map((c) => {

                const cell = game.board[r][c];
              const hl = isHlRow(r) || isHlCol(c);
              // suspectId bazlı key ve layoutId: kaydırmada Framer Motion kartı takip eder
              const cardKey = cell ? `card-${cell.suspectId}` : `empty-${r}-${c}`;
              return (
                <motion.div
                  key={cardKey}
                  layoutId={cell ? `card-${cell.suspectId}` : undefined}
                  layout
                  initial={false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{
                    layout: CARD_LAYOUT_TRANSITION,
                    opacity: { duration: 1.4, ease: 'easeOut' },
                    scale: { duration: 1.4, ease: 'easeOut' },
                  }}
                  style={{
                    borderRadius: 10,
                    outline: hl ? '3px solid rgba(250,204,21,0.6)' : 'none',
                    outlineOffset: '-1px',
                    transition: 'outline 0.2s',
                    position: 'relative',
                  }}
                >
                  <BoardCell cell={cell} r={r} c={c} game={game} actions={actions} cellSize={CELL} />
                </motion.div>
              );
            })
          )}
          </AnimatePresence>

          {/* KAYDIRMA OVERLAY */}
          <ShiftOverlay
            lastShift={game.lastShift}
            cellSize={CELL}
            activeRows={activeRows}
            activeCols={activeCols}
          />

          {/* İÇ OKLAR */}
          <AnimatePresence>
            {shiftMode && activeRows.map((r, ri) => {
              const vis = rowArrowVisible(r);
              const hl  = rowHighlighted(r);
              if (!vis) return null;
              return (
                <React.Fragment key={`row-arrows-${r}`}>
                  <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}} 
                    style={{ position: 'absolute', left: 4, top: ri * (CELL + GAP) + CELL / 2, transform: 'translateY(-50%)', zIndex: 100 }}>
                    <ArrowBtn dir="left" onClick={() => handleRowArrow(r, 'left')} highlighted={hl} />
                  </motion.div>
                  <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}}
                    style={{ position: 'absolute', right: 4, top: ri * (CELL + GAP) + CELL / 2, transform: 'translateY(-50%)', zIndex: 100 }}>
                    <ArrowBtn dir="right" onClick={() => handleRowArrow(r, 'right')} highlighted={hl} />
                  </motion.div>
                </React.Fragment>
              );
            })}
            
            {shiftMode && activeCols.map((c, ci) => {
              const vis = colArrowVisible(c);
              const hl  = colHighlighted(c);
              if (!vis) return null;
              return (
                <React.Fragment key={`col-arrows-${c}`}>
                  <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}}
                    style={{ position: 'absolute', top: 4, left: ci * (CELL + GAP) + CELL / 2, transform: 'translateX(-50%)', zIndex: 100 }}>
                    <ArrowBtn dir="up" onClick={() => handleColArrow(c, 'up')} highlighted={hl} />
                  </motion.div>
                  <motion.div initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}}
                    style={{ position: 'absolute', bottom: 4, left: ci * (CELL + GAP) + CELL / 2, transform: 'translateX(-50%)', zIndex: 100 }}>
                    <ArrowBtn dir="down" onClick={() => handleColArrow(c, 'down')} highlighted={hl} />
                  </motion.div>
                </React.Fragment>
              );
            })}
          </AnimatePresence>
        </motion.div>

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
          {game.inspector.hand
            .filter((id) => !(game.killedSuspectIds ?? []).includes(id))
            .map((id) => (
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
  const [dismissedIndex, setDismissedIndex] = React.useState(-1);
  const latestLog = logs[0] ?? null;
  const latestIndex = logs.length;
  const toast = latestLog && latestIndex > dismissedIndex ? latestLog : null;

  React.useEffect(() => {
    if (!latestLog) return;
    const timer = setTimeout(() => setDismissedIndex(latestIndex), 5000);
    return () => clearTimeout(timer);
  }, [latestLog, latestIndex]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={latestIndex}
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          onClick={() => setDismissedIndex(latestIndex)}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#1A1A24] text-[#E0DDD4] px-6 py-3 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-noir-border/50 text-xs sm:text-sm font-mono max-w-[90vw] text-center cursor-pointer"
          dangerouslySetInnerHTML={{ __html: toast }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Sağ panel ───────────────────────────────────────────────────────────────
function ActionPanel({ game, actions, onQuit, onOpenRules }) {
  const {
    phase, turn, humanRole, activeSide,
    killer, inspector, publicExonerated, evidenceDeck,
    logs, pendingAction, board, killCount,
  } = game;

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const humanCanAct = (() => {
  if (phase === PHASE.KILLER_PICK_IDENTITY && humanRole === 'killer') return true;
  if (phase === PHASE.KILLER_PICK_DISGUISE && humanRole === 'killer') return true;
  if (phase === PHASE.INSPECTOR_PICK_IDENTITY && humanRole === 'inspector') return true;
  if (phase === PHASE.KILLER_FIRST_KILL && humanRole === 'killer') return true;
  if (phase === PHASE.PLAY) {
    if (turn === TURN.KILLER && humanRole === 'killer') return true;
    if (turn === TURN.INSPECTOR && humanRole === 'inspector') return true;
  }
  return false;
})();
  const secrets = actions.getActingSecrets(game);
  const inPlay = phase === PHASE.PLAY;
  const isKillerFirstKill = phase === PHASE.KILLER_FIRST_KILL;
  const isKillerTurn = turn === TURN.KILLER;
  const isHumanKiller = humanRole === 'killer';
  const isHumanInspector = humanRole === 'inspector';

  const deadCount = killCount ?? board.flat().filter((c) => c?.status === CELL_STATUS.DECEASED).length;
  const myIdentityId = isHumanKiller ? secrets.killerIdentityId : secrets.inspectorSecretId;
  const mySuspect = myIdentityId != null ? suspect(myIdentityId) : null;

  return (
    <div className="
      w-full lg:w-80 
      fixed bottom-0 left-0 right-0 z-40 lg:static 
      max-h-[50vh] lg:max-h-none overflow-y-auto lg:overflow-hidden
      border-t lg:border-t-0 lg:border-l border-noir-border/40 
      flex flex-col bg-[#09090F] lg:min-h-screen
      shadow-[0_-10px_40px_rgba(0,0,0,0.8)] lg:shadow-none
    ">

           {/* Başlık + tur - GÜNCELLENDI */}
      <div className="p-5 border-b border-noir-border/30">
        <div className="flex items-start justify-between gap-2">
          
          {/* SOL: SADECE NOIR LOGOSU */}
          <div className="flex items-start gap-2 min-w-0">
            <div className="min-w-0">
              <div className="font-display text-2xl text-noir-text anim-flicker leading-none">NOIR</div>
              <div className="font-mono text-[11px] text-[#8080A0] tracking-widest uppercase mt-1">
                {isHumanKiller ? '🔪 Katil' : '🔍 Dedektif'}
              </div>
            </div>
          </div>

          {/* SAĞ: [🏠] [?] | Durum Mesajı | Tam Ekran Butonu */}
          <div className="text-right flex items-center gap-2 flex-shrink-0">
            
            {/* ANA MENU (🏠) */}
            {onQuit && (
              <button
  onClick={onQuit}
  title="Ana Menü"
  aria-label="Ana Menü"
  className="flex items-center justify-center w-8 h-8 rounded-lg border border-noir-border/50 bg-white/[0.04] font-mono text-base text-[#9090A8] hover:text-white hover:border-white/25 hover:bg-white/[0.08] transition-all outline-none focus:outline-none"
>
  🏠
</button>
            )}

            {/* YARDIM (?) */}
            {onOpenRules && (
              <button
                type="button"
                onClick={onOpenRules}
                title="Nasıl oynanır?"
                aria-label="Nasıl oynanır"
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-noir-border/50 text-[#707088] hover:text-noir-accent hover:border-noir-accent/45 hover:bg-noir-accent/5 font-mono text-sm leading-none transition-colors"
              >
                ?
              </button>
            )}

            {/* DURUM MESAJI (Bekleniyor / Senin turun) */}
            <div className="flex flex-col items-end gap-0 ml-1">
              <div className={`font-mono text-xs font-bold whitespace-nowrap ${humanCanAct ? 'text-yellow-400 anim-pulse' : 'text-[#7A7A6A]'}`}>
                {humanCanAct ? '● Senin turun' : activeSide === 'ai' ? '○ AI oynuyor...' : '○ Bekleniyor'}
              </div>
              {(inPlay || isKillerFirstKill) && (
                <div className="font-mono text-[11px] text-[#8080A0] mt-0.5 whitespace-nowrap">
                  {isKillerTurn ? 'Katil turu' : 'Dedektif turu'}
                </div>
              )}
            </div>

            {/* TAM EKRAN BUTONU */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-noir-border/50 bg-white/[0.04] font-mono text-base text-[#9090A8] hover:text-white hover:border-white/25 hover:bg-white/[0.08] transition-all"
            >
              {isFullscreen ? '⛶' : '⛶'}
            </button>
          </div>
        </div>
      </div>

      {/* Kimliğim */}
      {mySuspect && (
        <div className="p-4 border-b border-noir-border/30">
          <div className="font-mono text-xs text-[#8080A0] tracking-widest uppercase mb-2">Kimliğim</div>
          <div className="flex items-center gap-3">
            <SuspectCard suspect={mySuspect} size={56} showName={false} state="mine" playerRole={humanRole} />
            <div>
              <div className="font-body text-sm text-noir-text font-semibold">{mySuspect.name}</div>
              <div className="font-mono text-xs text-[#8080A0]">{isHumanKiller ? 'Katil kimliği' : 'Gizli kimlik'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Katilin kılık değiştirme kartı */}
      {isHumanKiller && killer.disguiseCardSuspectId != null && (
        <div className="p-4 border-b border-noir-border/30">
          <div className="font-mono text-xs text-[#8080A0] tracking-widest uppercase mb-2">Kılık Değiştirme Kartım</div>
          <div className="flex items-center gap-3">
            <SuspectCard suspect={suspect(killer.disguiseCardSuspectId)} size={56} showName={false} state="disguise" playerRole="killer" />
            <div>
              <div className="font-body text-sm text-noir-text font-semibold">{suspect(killer.disguiseCardSuspectId).name}</div>
              <div className="font-mono text-xs text-purple-400">Kılık değiştirince bu olacaksın</div>
            </div>
          </div>
        </div>
      )}

      {/* Aksiyonlar */}
      {humanCanAct && (phase === PHASE.KILLER_PICK_IDENTITY || phase === PHASE.KILLER_PICK_DISGUISE) && isHumanKiller && (
        <div className="p-4 border-b border-noir-border/30 bg-yellow-900/10">
          <div className="font-mono text-xs text-yellow-400 tracking-widest uppercase mb-3">
            Kimlik Seç
          </div>
          <p className="text-xs text-[#AAAAB0] mb-2">Tahtada sarı ile işaretlenmiş kartlardan hangisi olmak istediğini seç. (Diğeri kılık değiştirme kartın olacak)</p>
        </div>
      )}

      {humanCanAct && phase === PHASE.INSPECTOR_PICK_IDENTITY && isHumanInspector && (
        <div className="p-4 border-b border-noir-border/30 bg-blue-900/10">
          <div className="font-mono text-xs text-blue-400 tracking-widest uppercase mb-3">
            Gizli Kimlik Seç
          </div>
          <p className="text-xs text-[#AAAAB0] mb-2">Tahtada sarı ile işaretlenmiş gizli kimliklerden birini seç. (Komşularını tutuklayacaksın)</p>
        </div>
      )}
     
      {humanCanAct && (inPlay || isKillerFirstKill) && (
        <div className="p-4 border-b border-noir-border/30">
          <div className="font-mono text-xs text-[#8080A0] tracking-widest uppercase mb-3">
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
                  {pendingAction === 'kill' && <span className="ml-auto text-[10px] opacity-60">tahtaya tıkla</span>}
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
                  {pendingAction === 'arrest' && <span className="ml-auto text-[10px] opacity-60">tahtaya tıkla</span>}
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
                {pendingAction === 'shift' && <span className="ml-auto text-[10px] opacity-60">ok'a tıkla</span>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* İstatistikler */}
      <div className="p-4 border-b border-noir-border/30 grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="font-mono text-base font-bold text-red-500">{deadCount}</div>
          <div className="font-mono text-xs text-[#8080A0] uppercase">Ölü</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-base font-bold text-green-500">{publicExonerated.length}</div>
          <div className="font-mono text-xs text-[#8080A0] uppercase">Masum</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-base font-bold text-[#AAAAAA]">{evidenceDeck.length}</div>
          <div className="font-mono text-xs text-[#8080A0] uppercase">Deste</div>
        </div>
      </div>

      {/* Dedektif eli */}
      {isHumanInspector && inspector.hand.length > 0 && (
        <div className="p-4 border-b border-noir-border/30">
          <div className="font-mono text-xs text-[#8080A0] tracking-widest uppercase mb-2">Elimdeki Kartlar</div>
          <div className="flex flex-wrap gap-1.5">
            {inspector.hand.map((id) => (
              <SuspectCard key={id} suspect={suspect(id)} size={44} showName={false} playerRole="inspector" />
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
              className={`font-mono text-xs leading-relaxed pb-1.5 border-b border-noir-border/20 ${
                i === 0
                  ? 'text-[#E0DDD4] bg-noir-accent/5 px-2 py-1.5 rounded-lg border-noir-accent/20'
                  : 'text-[#9A9890]'
              }`}
              dangerouslySetInnerHTML={{ __html: log }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ana GameScreen ───────────────────────────────────────────────────────────
export default function GameScreen({ game, actions, onQuit }) {
  if (!game || !game.board) {
    return <div className="min-h-screen flex items-center justify-center bg-[#09090F]"><div className="text-white/50">Oyun yükleniyor...</div></div>;
  }
  
  const [rulesOpen, setRulesOpen] = useState(false);

  const activeRows = game.board
    .map((row, r) => ({ r, isEmpty: row.every(cell => cell === null) }))
    .filter(x => !x.isEmpty)
    .map(x => x.r);

  const activeCols = (() => {
    const numCols = game.board[0]?.length ?? 5;
    return Array.from({ length: numCols }, (_, c) => c)
      .filter(c => game.board.some(row => row[c] !== null));
  })();

  const cellSize = useGridCellSize(activeRows.length, activeCols.length);

  return (
    <div className="relative h-[100dvh] w-full flex flex-col lg:flex-row pb-[50vh] lg:pb-0 overflow-hidden bg-[#09090F]">
      <div className="relative z-10 flex flex-1 flex-col lg:flex-row w-full min-h-0 min-w-0">
        <div className="flex-1 flex items-center justify-center px-2 lg:px-4 pt-1 min-h-0">
          <BoardWithArrows game={game} actions={actions} cellSize={cellSize} activeRows={activeRows} activeCols={activeCols} />
        </div>
        <ActionPanel
          game={game}
          actions={actions}
          onQuit={onQuit}
          onOpenRules={() => setRulesOpen(true)}
        />
      </div>
      <ExonerateOverlay game={game} actions={actions} />
      <ToastNotification logs={game.logs} />
      {rulesOpen && <HowToPlayModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
