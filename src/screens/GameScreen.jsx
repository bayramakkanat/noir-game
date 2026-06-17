import React, { useState } from 'react';
import { useFullscreen } from '../hooks/useFullscreen.js';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { PHASE, TURN, CELL_STATUS, GAME_MODE } from '../game/constants.js';
import { SUSPECTS } from '../data/suspects.js';
import gameOverBg from '../assets/game_over_bg.png';
import SuspectCard from '../components/SuspectCard.jsx';
import { buildWinSummary, HeroCard } from './EndScreen.jsx';


/* ── Aksiyon buton stilleri (desktop geniş + mobil kompakt) ── */
const actionBtnStyles = `
  .noir-action-btn { display:block; width:100%; background:none; border:none; padding:0; cursor:pointer; text-align:left; transition:transform 0.15s; }
  .noir-action-btn:hover { transform:translateY(-1px); }
  .noir-action-btn:active { transform:scale(0.98); }
  .noir-action-btn:disabled { opacity:0.3; pointer-events:none; }
  .nb-inner { display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:10px; border:1px solid; transition:border-color 0.2s, background 0.2s; }
  .nb-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:15px; }
  .nb-text { flex:1; min-width:0; }
  .nb-title { display:block; font-size:11px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:2px; }
  .nb-sub { display:block; font-size:10px; letter-spacing:0.06em; opacity:0.5; }
  .nb-arrow { font-size:14px; opacity:0.4; flex-shrink:0; }
  /* renk: kırmızı (kill) */
  .nb-kill .nb-inner { background:rgba(192,57,43,0.08); border-color:rgba(192,57,43,0.3); }
  .nb-kill:hover .nb-inner { background:rgba(192,57,43,0.16); border-color:rgba(192,57,43,0.65); }
  .nb-kill .nb-icon { background:rgba(192,57,43,0.18); }
  .nb-kill .nb-title { color:#E05A4A; }
  .nb-kill .nb-arrow { color:#E05A4A; }
  .nb-kill.nb-active .nb-inner { background:rgba(192,57,43,0.22); border-color:rgba(192,57,43,0.85); }
  .nb-kill.nb-active .nb-title { color:#FF7060; }
  .nb-kill.nb-active .nb-sub { opacity:0.8; color:#FF9080; }
  .nb-kill.nb-active .nb-arrow { opacity:1; color:#FF7060; }
  /* renk: mor (disguise) */
  .nb-purple .nb-inner { background:rgba(120,80,200,0.07); border-color:rgba(120,80,200,0.25); }
  .nb-purple:hover .nb-inner { background:rgba(120,80,200,0.15); border-color:rgba(120,80,200,0.55); }
  .nb-purple .nb-icon { background:rgba(120,80,200,0.18); }
  .nb-purple .nb-title { color:#A080E0; }
  .nb-purple .nb-arrow { color:#A080E0; }
  /* renk: mavi (arrest) */
  .nb-blue .nb-inner { background:rgba(48,96,200,0.07); border-color:rgba(48,96,200,0.25); }
  .nb-blue:hover .nb-inner { background:rgba(48,96,200,0.15); border-color:rgba(48,96,200,0.6); }
  .nb-blue .nb-icon { background:rgba(48,96,200,0.18); }
  .nb-blue .nb-title { color:#6090E0; }
  .nb-blue .nb-arrow { color:#6090E0; }
  .nb-blue.nb-active .nb-inner { background:rgba(48,96,200,0.22); border-color:rgba(48,96,200,0.85); }
  .nb-blue.nb-active .nb-title { color:#80B0FF; }
  .nb-blue.nb-active .nb-sub { opacity:0.8; color:#A0C0FF; }
  .nb-blue.nb-active .nb-arrow { opacity:1; color:#80B0FF; }
  /* renk: yeşil (exonerate) */
  .nb-green .nb-inner { background:rgba(30,140,80,0.07); border-color:rgba(30,140,80,0.25); }
  .nb-green:hover .nb-inner { background:rgba(30,140,80,0.15); border-color:rgba(30,140,80,0.6); }
  .nb-green .nb-icon { background:rgba(30,140,80,0.18); }
  .nb-green .nb-title { color:#50C080; }
  .nb-green .nb-arrow { color:#50C080; }
  /* renk: sarı (shift) */
  .nb-yellow .nb-inner { background:rgba(200,168,75,0.07); border-color:rgba(200,168,75,0.22); }
  .nb-yellow:hover .nb-inner { background:rgba(200,168,75,0.15); border-color:rgba(200,168,75,0.55); }
  .nb-yellow .nb-icon { background:rgba(200,168,75,0.16); }
  .nb-yellow .nb-title { color:#C8A84B; }
  .nb-yellow .nb-arrow { color:#C8A84B; }
  .nb-yellow.nb-active .nb-inner { background:rgba(200,168,75,0.18); border-color:rgba(200,168,75,0.8); }
  .nb-yellow.nb-active .nb-title { color:#F0CC70; }
  .nb-yellow.nb-active .nb-sub { opacity:0.8; color:#F0CC70; }
  .nb-yellow.nb-active .nb-arrow { opacity:1; color:#F0CC70; }
  /* renk: turuncu (solve) */
  .nb-orange .nb-inner { background:rgba(200,100,30,0.07); border-color:rgba(200,100,30,0.25); }
  .nb-orange:hover .nb-inner { background:rgba(200,100,30,0.15); border-color:rgba(200,100,30,0.6); }
  .nb-orange .nb-icon { background:rgba(200,100,30,0.18); }
  .nb-orange .nb-title { color:#E07840; }
  .nb-orange .nb-arrow { color:#E07840; }
  /* Mobil: ikon+başlık yan yana, alt metin gizli */
  @media (max-width:1023px) {
    .nb-inner { padding:8px 10px; gap:8px; border-radius:8px; }
    .nb-icon { width:26px; height:26px; font-size:13px; border-radius:6px; }
    .nb-title { font-size:10px; letter-spacing:0.14em; margin-bottom:0; }
    .nb-sub { display:none; }
    .nb-arrow { font-size:12px; }
  }
`;

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
// Panel ve kart boyutu dinamik hesap:
// 1) Ekran yüksekliğine göre kart boyutu belirlenir
// 2) 3 kart + padding = panel genişliği
// 3) Kalan alan grid'e gider
const CARD_GAP = 8;
const PANEL_PADDING = 40; // sol+sağ padding + scrollbar payı
const PANEL_MIN = 340;
const PANEL_MAX = 800;

function useGridAndPanelSize(numRows, numCols) {
  const [sizes, setSizes] = React.useState({ cellSize: 72, panelWidth: 420, cardSize: 74 });

  React.useEffect(() => {
    function calc() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isDesktop = vw >= 1024;

      if (!isDesktop) {
        setSizes({ cellSize: Math.max(56, Math.floor((vw - 8) / numCols)), panelWidth: vw, cardSize: 64 });
        return;
      }

      // 1) Kart boyutu: ekran yüksekliğinin %12'si, min 70 max 130
      // Bu sayede kartlar ve sağ panel daha geniş ve okunaklı olur
      const cardSize = Math.min(130, Math.max(70, Math.round(vh * 0.12)));

      // 2) Panel genişliği: 4 kart yan yana + 3 gap + padding
      //    Dedektif elinde 4 kart olabilir. Katil elinde daha az olsa bile, 
      //    katil ve dedektif ekranlarının tam senkronize olması için 
      //    her zaman 4 kartlık alana göre genişlik ayrılır.
      const panelWidth = Math.min(
        PANEL_MAX,
        Math.max(PANEL_MIN, 4 * cardSize + 3 * CARD_GAP + PANEL_PADDING)
      );

      // 3) Grid kalan alanı kullanır
      const GAP_RATIO = 0.055;
      const MARGIN = 12;
      const gridAvailW = vw - panelWidth - MARGIN;
      const gridAvailH = vh - 8;

      const gapFromW = Math.max(3, Math.round((gridAvailW / numCols) * GAP_RATIO));
      const cellFromW = Math.floor((gridAvailW - (numCols - 1) * gapFromW) / numCols);

      const gapFromH = Math.max(3, Math.round((gridAvailH / numRows) * GAP_RATIO));
      const cellFromH = Math.floor((gridAvailH - (numRows - 1) * gapFromH) / numRows);

      const cellSize = Math.max(60, Math.min(cellFromW, cellFromH));

      setSizes({ cellSize, panelWidth, cardSize });
    }

    calc();
    let timer;
    function onResize() { clearTimeout(timer); timer = setTimeout(calc, 150); }
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, [numRows, numCols]);

  return sizes;
}

// ─── Tutuklama flash efekti ──────────────────────────────────────────────────
function useArrestFlash(game) {
  const [flashId, setFlashId] = React.useState(null);
  const prevArrestCount = React.useRef(0);
  const prevInvestigated = React.useRef([]);

  React.useEffect(() => {
    // Standart mod: arrestFailCount sayacı ile takip (aynı şüpheli tekrar tutuklanınca da tetiklenir)
    const currCount = game.arrestFailCount ?? 0;
    if (currCount > prevArrestCount.current) {
      prevArrestCount.current = currCount;
      const id = game.lastArrestedId;
      if (id != null) {
        setFlashId(id);
        const t = setTimeout(() => setFlashId(null), 3000);
        return () => clearTimeout(t);
      }
    }
    // Klasik mod: investigated listesi ile takip
    const curr = game.inspector.investigated ?? [];
    const prev = prevInvestigated.current;
    if (curr.length > prev.length) {
      const newId = curr[curr.length - 1];
      setFlashId(newId);
      const t = setTimeout(() => setFlashId(null), 3000);
      prevInvestigated.current = curr;
      return () => clearTimeout(t);
    }
    prevInvestigated.current = curr;
  }, [game.arrestFailCount, game.lastArrestedId, game.inspector.investigated]);

  return flashId;
}

function suspect(id) {
  return SUSPECTS.find((s) => s.id === id) ?? { id, name: `#${id}` };
}

// ─── Tahta hücresi ────────────────────────────────────────────────────────────────────────────────
function BoardCell({ cell, r, c, game, actions, cellSize, arrestFlashId }) {
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
    ['kill', 'arrest', 'solve_identity', 'solve_disguise'].includes(pendingAction) &&
    actions.isCoordTargetable(game, r, c, pendingAction, secrets);

  const isMyIdentity = game.gameOver
    ? (cell.suspectId === game.killer?.identitySuspectId || cell.suspectId === game.inspector?.secretIdentitySuspectId)
    : (humanRole === 'killer'
        ? cell.suspectId === secrets.killerIdentityId
        : cell.suspectId === secrets.inspectorSecretId);

  const isExonerated = game.publicExonerated.includes(cell.suspectId);

  // Standart mod: sadece katil kendi yedek kılığını görür; oyun bittiğinde herkes görür
  const isDisguise =
    game.gameMode === GAME_MODE.STANDARD &&
    cell.suspectId === game.killer.disguiseSuspectId &&
    (game.gameOver || humanRole === 'killer');

  // Canvas badge: her iki oyuncu da görür
  // killer_answers → kılıç (katil komşuydu)
  // inspector_answers → dedektif silüeti (dedektif komşuydu)
  const isCanvasAdjacent = (() => {
    const killerCanvases = game.positiveKillerCanvases ?? [];
    const inspectorCanvases = game.positiveInspectorCanvases ?? [];
    if (killerCanvases.includes(cell.suspectId)) return true;
    if (inspectorCanvases.includes(cell.suspectId)) return true;
    const canvas = game.pendingCanvas;
    if (!canvas || !canvas.isAdjacent) return false;
    return cell.suspectId === canvas.triggerSuspectId;
  })();

  // Canvas badge tipleri: her ikisi aynı anda olabilir
  const canvasTypes = (() => {
    const killerCanvases = game.positiveKillerCanvases ?? [];
    const inspectorCanvases = game.positiveInspectorCanvases ?? [];
    const types = new Set();
    if (killerCanvases.includes(cell.suspectId)) types.add('killer');
    if (inspectorCanvases.includes(cell.suspectId)) types.add('detective');
    const canvas = game.pendingCanvas;
    if (canvas?.isAdjacent && canvas.triggerSuspectId === cell.suspectId) {
      types.add(canvas.type === 'killer_answers' ? 'killer' : 'detective');
    }
    return Array.from(types);
  })();

  // ÖNEMLİ: isMyIdentity her zaman isExonerated'dan önce kontrol edilir.
  // Aksi halde, oyun sonunda dedektifin (veya katilin) kimliği temize çıkarılmış
  // bir karaktere denk gelirse 'mine' durumuna hiç girilmez ve büyüteç/kılıç
  // badge'i hiç görünmez (sadece çerçeve rengi görünür).
  let cardState = 'normal';
  if (isDeceased) cardState = 'eliminated';
  else if (isMyIdentity) cardState = 'mine';
  else if (isExonerated) cardState = 'exonerated';
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
    
    // Eğer oyuncu bir aksiyon butonu seçmişse (Örn: Çöz, Kaydır, Öldür) önce onu uygula
    if (['kill', 'arrest', 'solve_identity', 'solve_disguise'].includes(pendingAction)) {
      actions.executeBoardAction(r, c);
      return;
    }

    // --- QUICK ACTIONS (Hızlı Dokunma / Kısayol) ---
    // Hiçbir buton seçili değilse ve tahtada bir karaktere dokunulmuşsa
    if (!pendingAction) {
      // Katil rolü için
      if (humanRole === 'killer' && turn === TURN.KILLER) {
        // Yedek kılığa tıklandıysa -> Kılık Değiştir (Disguise)
        if (game.gameMode === GAME_MODE.STANDARD && cell.suspectId === game.killer.disguiseSuspectId) {
          actions.executeDisguise();
          return;
        }
        // Komşu, canlı birine tıklandıysa -> Öldür (Kill)
        if (actions.isCoordTargetable(game, r, c, 'kill', secrets)) {
          actions.executeBoardAction(r, c, 'kill');
          return;
        }
      }
      
      // Dedektif rolü için
      if (humanRole === 'inspector' && turn === TURN.INSPECTOR) {
        // Komşu, canlı birine tıklandıysa -> Tutukla (Arrest)
        if (actions.isCoordTargetable(game, r, c, 'arrest', secrets)) {
          actions.executeBoardAction(r, c, 'arrest');
          return;
        }
        // Eldeki masum kartlarından birine tahtada tıklandıysa -> Temize Çıkar (Exonerate)
        if (game.inspector.hand.includes(cell.suspectId)) {
          actions.completeExonerate(cell.suspectId);
          return;
        }
      }
    }
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

  // Solve renk sistemi
  const isSolveIdentitySelected = pendingAction === 'solve_disguise' &&
    cell.suspectId === game.solveGuess?.identityId;
  const solveRingColor =
    pendingAction === 'solve_identity' ? 'ring-red-500' :
    pendingAction === 'solve_disguise' ? 'ring-purple-500' : 'ring-yellow-400';

  const isArrestFlash = cell && arrestFlashId === cell.suspectId;

  return (
    <motion.div
      layout="position"
      initial={false}
      animate={{ scale: (isTargetable || isPickable) ? 1.05 : 1 }}
      transition={{
        layout: CARD_LAYOUT_TRANSITION,
        scale: { type: 'spring', stiffness: 300, damping: 20 }
      }}
      style={{
        zIndex: isWrapAround
          ? 50
          : (isTargetable || isPickable)
            ? 30
            : (isMyIdentity || isDisguise)
              ? 35
              : 1,
        position: 'relative',
      }}
      whileHover={(!isDeceased && humanCanAct) ? { scale: 1.07, zIndex: 40 } : {}}
      className={`cursor-pointer`}
    >
      {(isTargetable || isPickable) && (
        <div className={`absolute inset-0 rounded-lg ring-[3px] ${solveRingColor} animate-pulse pointer-events-none z-20`} />
      )}
      {/* Kimlik seçildi — kırmızı sabit çerçeve */}
      {isSolveIdentitySelected && (
        <div className="absolute inset-0 rounded-lg ring-[3px] ring-red-500 pointer-events-none z-20"
          style={{ boxShadow: '0 0 12px rgba(239,68,68,0.6)' }} />
      )}
      
      {/* OYUN SONU: Gizli kimlikleri açıkça göster - Moved to inside z-10 container */}
      {game.gameOver && (
        <>
          {/* Dedektifin elinde kalan masum kartlarını göster */}
          {game.inspector?.hand?.includes(cell.suspectId) && (
            <div className="absolute inset-0 rounded-lg border-[2px] border-green-500/70 pointer-events-none z-30"
                 style={{ boxShadow: 'inset 0 0 8px rgba(34,197,94,0.2)' }} />
          )}
        </>
      )}

      {/* Tutuklama flash efekti — mavi titreme */}
      {isArrestFlash && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none z-30"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: [0, 0.85, 0.6, 0.85, 0.5, 0], scale: [0.92, 1.06, 1, 1.04, 1, 0.96] }}
          transition={{ duration: 3.0, ease: 'easeInOut' }}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0.1) 60%, transparent 100%)',
            boxShadow: '0 0 20px rgba(59,130,246,0.6), inset 0 0 14px rgba(59,130,246,0.3)',
            border: '2px solid rgba(99,179,237,0.8)',
          }}
        />
      )}
      
      <div className="relative z-10">
        <SuspectCard
          suspect={suspect(cell.suspectId)}
          state={cardState}
          size={cellSize}
          onClick={handleClick}
          showName
          playerRole={
            game.gameOver
              ? (cell.suspectId === game.killer?.identitySuspectId ? 'killer' : 'inspector')
              : humanRole
          }
          isIdentityBadge={isMyIdentity}
          identityRole={
            cell.suspectId === (game.gameOver ? game.killer?.identitySuspectId : secrets.killerIdentityId)
              ? 'killer'
              : 'inspector'
          }
          nameFontSize={Math.max(10, Math.round(cellSize * 0.15))}
          canvasAdjacent={isCanvasAdjacent}
          canvasTypes={canvasTypes}
          isDisguise={isDisguise}
          endgameRole={game.gameOver ? (cell.suspectId === game.killer?.identitySuspectId ? 'killer' : cell.suspectId === game.inspector?.secretIdentitySuspectId ? 'inspector' : null) : null}
          endgameDisguise={game.gameOver && game.gameMode === GAME_MODE.STANDARD && cell.suspectId === game.killer?.disguiseSuspectId}
        />
      </div>
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
  if (!activeRows.length || !activeCols.length) return <div className="text-white/50 p-8">Yükleniyor...</div>;
  
  const arrestFlashId = useArrestFlash(game);
  
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
                  <BoardCell cell={cell} r={r} c={c} game={game} actions={actions} cellSize={CELL} arrestFlashId={arrestFlashId} />
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
function ExonerateOverlay({ game, actions, cardSize = 74 }) {
  if (game.pendingAction !== 'exonerate' || !game.pendingExonerateDiscard) return null;
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-[#0E0E16] border border-noir-border rounded-2xl p-8 max-w-xl w-full mx-4 anim-fade-in">
        <div className="font-mono text-[10px] tracking-widest text-[#6B6B85] uppercase mb-2">Temize çıkar</div>
        <h2 className="font-display text-xl text-noir-text mb-1">Hangi kartı at?</h2>
        <p className="text-xs text-[#7A7A6A] font-mono mb-6">Seçtiğin kart açıklanır; desteden yeni bir kart çekersin.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          {game.inspector.hand.map((id) => {
            const isDeceased = (game.killedSuspectIds ?? []).includes(id);
            return (
              <div key={id} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => actions.completeExonerate(id)}>
                <SuspectCard suspect={suspect(id)} size={cardSize} showName playerRole="inspector" state={isDeceased ? 'eliminated' : 'normal'} />
                <div className="text-[10px] font-mono text-noir-muted group-hover:text-green-400 transition-colors tracking-widest uppercase">
                  {isDeceased ? 'At & El Yenile' : 'At & Temize Çıkar'}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={actions.cancelPending} className="mt-5 text-[10px] text-[#8080A0] font-mono block mx-auto hover:text-[#AAAAB0]">iptal</button>
      </div>
    </div>
  );
}

// ─── Solve overlay (Standart mod) ───────────────────────────────────────────
function SolveOverlay({ game, actions, cardSize = 74 }) {
  const [guessIdentity, setGuessIdentity] = React.useState(null);
  const [guessDisguise, setGuessDisguise] = React.useState(null);

  if (game.pendingAction !== 'solve') return null;

  // Tahta üzerindeki tüm suspect'leri listele (cansız dahil)
  const allSuspects = game.board.flat().filter(Boolean);
  // Öldürülenler de seçilebilir (Disguise ölmüş olabilir)
  const allIds = [
    ...allSuspects.map(c => c.suspectId),
    ...(game.killedSuspectIds ?? []),
  ];
  const uniqueIds = [...new Set(allIds)];

  function toggle(id, slot) {
    if (slot === 'identity') {
      setGuessIdentity(prev => prev === id ? null : id);
    } else {
      setGuessDisguise(prev => prev === id ? null : id);
    }
  }

  const canConfirm = guessIdentity !== null && guessDisguise !== null && guessIdentity !== guessDisguise;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0E0E16] border border-noir-border rounded-2xl p-6 max-w-2xl w-full anim-fade-in">
        <div className="font-mono text-[10px] tracking-widest text-orange-400/70 uppercase mb-1">Çözüm</div>
        <h2 className="font-display text-xl text-noir-text mb-1">Katili ve kılığını belirle</h2>
        <p className="text-[11px] text-[#7A7A6A] font-mono mb-5">
          Yanlış tahmin edersan katil kazanır!
        </p>

        {/* İki sütun: Identity + Disguise */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Kimlik seçimi */}
          <div>
            <div className="font-mono text-[10px] text-orange-300 tracking-widest uppercase mb-2">
              Katil Kimliği
              {guessIdentity && (
                <span className="ml-2 text-orange-400">— {suspect(guessIdentity).name}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A3E transparent' }}>
              {uniqueIds.map(id => {
                const isSelected = guessIdentity === id;
                const isDead = (game.killedSuspectIds ?? []).includes(id);
                return (
                  <div
                    key={id}
                    onClick={() => toggle(id, 'identity')}
                    className={`cursor-pointer rounded-lg transition-all ${
                      isSelected
                        ? 'ring-2 ring-orange-400 scale-105'
                        : 'opacity-60 hover:opacity-90 hover:scale-102'
                    }`}
                  >
                    <SuspectCard
                      suspect={suspect(id)}
                      size={Math.min(cardSize, 60)}
                      showName={false}
                      state={isDead ? 'eliminated' : 'normal'}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kılık seçimi */}
          <div>
            <div className="font-mono text-[10px] text-purple-300 tracking-widest uppercase mb-2">
              Yedek Kılık
              {guessDisguise && (
                <span className="ml-2 text-purple-400">— {suspect(guessDisguise).name}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A3E transparent' }}>
              {uniqueIds.map(id => {
                const isSelected = guessDisguise === id;
                const isDead = (game.killedSuspectIds ?? []).includes(id);
                const isDisabled = id === guessIdentity;
                return (
                  <div
                    key={id}
                    onClick={() => !isDisabled && toggle(id, 'disguise')}
                    className={`rounded-lg transition-all ${
                      isDisabled
                        ? 'opacity-20 cursor-not-allowed'
                        : isSelected
                          ? 'ring-2 ring-purple-400 scale-105 cursor-pointer'
                          : 'opacity-60 hover:opacity-90 cursor-pointer'
                    }`}
                  >
                    <SuspectCard
                      suspect={suspect(id)}
                      size={Math.min(cardSize, 60)}
                      showName={false}
                      state={isDead ? 'eliminated' : 'normal'}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Onay */}
        <div className="flex items-center justify-between">
          <button
            onClick={actions.cancelPending}
            className="font-mono text-[10px] text-[#8080A0] hover:text-[#AAAAB0] transition-colors"
          >
            iptal
          </button>
          <button
            onClick={() => canConfirm && actions.executeSolve(guessIdentity, guessDisguise)}
            disabled={!canConfirm}
            className={`px-5 py-2.5 rounded-xl font-mono text-[11px] tracking-widest uppercase font-semibold transition-all ${
              canConfirm
                ? 'bg-orange-500/20 border border-orange-500/60 text-orange-300 hover:bg-orange-500/30 hover:border-orange-400'
                : 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
            }`}
          >
            🎯 Tahminimi Onayla
          </button>
        </div>
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
    const timer = setTimeout(() => setDismissedIndex(latestIndex), 3000);
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
          className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#1A1A24] text-[#E0DDD4] px-6 py-3 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-noir-border/50 text-xs sm:text-sm font-mono max-w-[90vw] text-center cursor-pointer"
          dangerouslySetInnerHTML={{ __html: toast }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Oyun Sonu Paneli ────────────────────────────────────────────────────────
function GameOverPanel({ game, actions, onReset, onQuit }) {
  const killerWon    = game.winner === 'killer';
  const playerWon    = (game.humanRole === 'killer' && killerWon) || (game.humanRole === 'inspector' && !killerWon);
  const accentColor  = killerWon ? '#C0392B' : '#4090C8';
  
  const killerSuspect    = SUSPECTS.find(s => s.id === game.killer.identitySuspectId);
  const inspectorSuspect = SUSPECTS.find(s => s.id === game.inspector.secretIdentitySuspectId);
  const isStandard       = game.gameMode === 'standard';
  const disguiseSuspect  = isStandard ? SUSPECTS.find(s => s.id === game.killer.disguiseSuspectId) : null;
  
  const summaryLines = buildWinSummary({ game, killerSuspect, inspectorSuspect, disguiseSuspect });
  const inspectorWon = game.winner === 'inspector';
  const killerStamp   = inspectorWon ? 'caught' : 'escaped';
  const inspectorStamp = (killerWon && game.winReason === 'inspector_killed') ? 'killed' : null;

  return (
    <div 
      className="flex-1 flex flex-col p-5 overflow-y-auto w-full max-w-sm mx-auto relative" 
      style={{ 
        scrollbarWidth: 'thin', 
        scrollbarColor: '#2A2A3E transparent',
        backgroundImage: `linear-gradient(to bottom, rgba(9,9,15,0.7), rgba(9,9,15,0.95)), url(${gameOverBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="relative z-10 text-center mb-5 mt-2">
        <div className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: accentColor }}>
          — Dava Kapandı —
        </div>
        <h2 className="font-display text-3xl font-bold mb-1" style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}44` }}>
          {killerWon ? 'KATİL KAZANDI' : 'DEDEKTİF KAZANDI'}
        </h2>
        <div className={`font-mono text-xs tracking-widest uppercase mt-2 ${playerWon ? 'text-[#D4A017]' : 'text-[#888898]'}`}>
          {playerWon ? '✦ Sen Kazandın ✦' : '✦ Sen Kaybettin ✦'}
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap justify-center gap-4 sm:gap-6 mb-5">
        {killerSuspect && (
          <HeroCard
            suspect={killerSuspect}
            label="Katilin Kimliği"
            labelColor='#C0392B'
            dim={inspectorWon}
            stamp={killerStamp}
          />
        )}
        {inspectorSuspect && (
          <HeroCard
            suspect={inspectorSuspect}
            label="Dedektif"
            labelColor={inspectorWon ? '#4090C8' : '#888898'}
            dim={killerWon && game.winReason !== 'inspector_killed'}
            stamp={inspectorStamp}
          />
        )}
      </div>

      <div className="relative z-10 w-full rounded-xl border mb-6 overflow-hidden flex-shrink-0" style={{ borderColor: accentColor + '33', background: 'rgba(13,13,20,0.85)' }}>
        <div className="px-4 py-2 font-mono text-[9px] tracking-[0.35em] uppercase" style={{ background: accentColor + '18', color: accentColor }}>
          Oyun Özeti
        </div>
        <div className="px-4 py-4 space-y-3">
          {summaryLines.map((line, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-base mt-0.5 shrink-0">{line.icon}</span>
              <p className="font-body text-[13px] leading-relaxed" style={{ color: line.color }}>
                {line.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-auto pt-4 pb-2 space-y-3">
        <motion.button
          onClick={onReset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 rounded-xl font-mono text-sm tracking-widest uppercase transition-all duration-200 border"
          style={{ background: '#0D0D14', borderColor: accentColor + '55', color: accentColor }}
          onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
          onMouseLeave={e => e.currentTarget.style.borderColor = accentColor + '55'}
        >
          Yeni Oyun
        </motion.button>
        {onQuit && (
          <button
            onClick={onQuit}
            className="w-full py-2.5 rounded-xl font-mono text-[10px] tracking-widest uppercase text-[#6B6B85] hover:text-white transition-colors"
          >
            Ana Menüye Dön
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sağ panel ───────────────────────────────────────────────────────────────
function ActionPanel({ game, actions, onQuit, panelWidth = 320, cardSize = 74, isMultiplayer }) {
  const [showMobileLog, setShowMobileLog] = React.useState(false);
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
    <div
      className="
        w-full lg:static
        fixed bottom-0 left-0 right-0 z-40
        max-h-[50vh] lg:max-h-none overflow-y-auto lg:overflow-hidden
        border-t lg:border-t-0 lg:border-l border-noir-border/40
        flex flex-col bg-[#09090F] lg:min-h-screen
        shadow-[0_-10px_40px_rgba(0,0,0,0.8)] lg:shadow-none
      "
      style={{ width: panelWidth }}
    >

           {/* Başlık — sıkıştırıldı */}
      <div className="px-3 py-2.5 border-b border-noir-border/30 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg text-noir-text anim-flicker">NOIR</span>
          <span className="font-mono text-[10px] text-[#8080A0] tracking-widest uppercase">
            {isHumanKiller ? '🔪 Katil' : '🔍 Dedektif'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-mono text-[10px] font-bold whitespace-nowrap ${
            humanCanAct ? 'text-yellow-400' : 'text-[#6A6A7A]'
          }`}>
            {humanCanAct ? '● Senin turun' : isMultiplayer ? '○ Karşı Taraf...' : activeSide === 'ai' ? '○ AI...' : '○ Bekle'}
          </span>
          {onQuit && (
            <button onClick={onQuit} title="Ana Menü"
              className="w-7 h-7 rounded-lg border border-noir-border/40 bg-white/[0.03] text-sm text-[#9090A8] hover:text-white transition-all flex items-center justify-center">
              🏠
            </button>
          )}
          <button onClick={toggleFullscreen} title={isFullscreen ? 'Küçült' : 'Tam ekran'}
            className="w-7 h-7 rounded-lg border border-noir-border/40 bg-white/[0.03] text-sm text-[#9090A8] hover:text-white transition-all flex items-center justify-center">
            ⛶
          </button>
        </div>
      </div>

      {/* Kimlik + istatistikler tek satırda */}
      {mySuspect && (
        <div className="px-3 py-2 border-b border-noir-border/30 flex items-center gap-2.5 flex-shrink-0">
          <SuspectCard suspect={mySuspect} size={cardSize} showName={false} state="mine" playerRole={humanRole} />
          <div className="flex-1 min-w-0">
            <div className="font-body text-sm text-noir-text font-semibold truncate">{mySuspect.name}</div>
            <div className="font-mono text-[10px] text-[#8080A0]">{isHumanKiller ? 'Katil kimliği' : 'Gizli kimlik'}</div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center">
              <div className="font-mono text-sm font-bold text-red-500">{deadCount}</div>
              <div className="font-mono text-[9px] text-[#8080A0] uppercase">Ölü</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-sm font-bold text-green-500">{publicExonerated.length}</div>
              <div className="font-mono text-[9px] text-[#8080A0] uppercase">Masum</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-sm font-bold text-[#AAAAAA]">{evidenceDeck.length}</div>
              <div className="font-mono text-[9px] text-[#8080A0] uppercase">Deste</div>
            </div>
          </div>
        </div>
      )}

      {/* Yedek kılık kartı gizlendi */}

      {humanCanAct && (phase === PHASE.KILLER_PICK_IDENTITY || phase === PHASE.KILLER_PICK_DISGUISE) && isHumanKiller && (
        <div className="px-3 py-2 border-b border-noir-border/30 bg-yellow-900/10 flex-shrink-0">
          <p className="font-mono text-[10px] text-yellow-400 uppercase tracking-widest">Kimlik Seç</p>
          <p className="text-[11px] text-[#AAAAB0] mt-0.5">Tahtada sarı ile işaretlenen kartı seç.</p>
        </div>
      )}

     
      {humanCanAct && (inPlay || isKillerFirstKill) && (
        <div className="px-3 py-2 border-b border-noir-border/30 flex-shrink-0">
          <div className="font-mono text-[9px] text-[#8080A0] tracking-widest uppercase mb-1.5">
            {isKillerFirstKill ? 'İlk Hamle — Komşunu Öldür' : 'Hamle Seç'}
          </div>
          <div className="flex flex-col gap-1.5">

            {isHumanKiller && (
              <>
                <button
                  onClick={() => pendingAction === 'kill' ? actions.cancelPending() : actions.setPending('kill')}
                  className={`noir-action-btn nb-kill${pendingAction === 'kill' ? ' nb-active' : ''}`}
                >
                  <div className="nb-inner">
                    <div className="nb-icon">🗡️</div>
                    <div className="nb-text">
                      <span className="nb-title">{isKillerFirstKill ? 'Hedef Seç' : 'Öldür'}</span>
                      <span className="nb-sub">{pendingAction === 'kill' ? 'Tahtada bir karta tıkla' : 'Komşu bir şüpheliyi hedefle'}</span>
                    </div>
                    <span className="nb-arrow">{pendingAction === 'kill' ? '✕' : '›'}</span>
                  </div>
                </button>
                {inPlay && (() => {
                  const isStandard = game.gameMode === GAME_MODE.STANDARD;
                  const disguiseDead = isStandard
                    ? (game.killedSuspectIds ?? []).includes(game.killer.disguiseSuspectId)
                    : game.evidenceDeck.length === 0;
                  return (
                    <button
                      onClick={actions.executeDisguise}
                      disabled={disguiseDead}
                      className="noir-action-btn nb-purple"
                    >
                      <div className="nb-inner">
                        <div className="nb-icon">⇄</div>
                        <div className="nb-text">
                          <span className="nb-title">Kılık Değiştir</span>
                          <span className="nb-sub">
                            {isStandard
                              ? (disguiseDead ? 'Yedek kılık öldü' : 'Yedeğe geç')
                              : 'Desteden yeni kimlik çek'}
                          </span>
                        </div>
                        <span className="nb-arrow">›</span>
                      </div>
                    </button>
                  );
                })()}
              </>
            )}

            {isHumanInspector && inPlay && (
              <>
                <button
                  onClick={() => pendingAction === 'arrest' ? actions.cancelPending() : actions.setPending('arrest')}
                  className={`noir-action-btn nb-blue${pendingAction === 'arrest' ? ' nb-active' : ''}`}
                >
                  <div className="nb-inner">
                    <div className="nb-icon">🔗</div>
                    <div className="nb-text">
                      <span className="nb-title">Tutuklama</span>
                      <span className="nb-sub">{pendingAction === 'arrest' ? 'Tahtada bir karta tıkla' : 'Şüpheliyi tutuklat'}</span>
                    </div>
                    <span className="nb-arrow">{pendingAction === 'arrest' ? '✕' : '›'}</span>
                  </div>
                </button>
                <button
                  onClick={actions.beginExonerate}
                  disabled={evidenceDeck.length === 0 || inspector.hand.length === 0}
                  className="noir-action-btn nb-green"
                >
                  <div className="nb-inner">
                    <div className="nb-icon">✓</div>
                    <div className="nb-text">
                      <span className="nb-title">Temize Çıkar</span>
                      <span className="nb-sub">Elindeki kartı at, masumu kurtar</span>
                    </div>
                    <span className="nb-arrow">›</span>
                  </div>
                </button>
                {game.gameMode === GAME_MODE.STANDARD && (
                  <button
                    onClick={
                      pendingAction === 'solve_identity' || pendingAction === 'solve_disguise'
                        ? actions.cancelPending
                        : actions.beginSolve
                    }
                    className={`noir-action-btn nb-orange${
                      pendingAction === 'solve_identity' || pendingAction === 'solve_disguise' ? ' nb-active' : ''
                    }`}
                  >
                    <div className="nb-inner">
                      <div className="nb-icon">🎯</div>
                      <div className="nb-text">
                        <span className="nb-title">Çöz</span>
                        <span className="nb-sub">
                          {pendingAction === 'solve_identity' ? 'Katil kimliğini seç'
                            : pendingAction === 'solve_disguise' ? 'Yedek kılığı seç'
                            : 'Kimliği ve kılığı tahmin et'}
                        </span>
                      </div>
                      <span className="nb-arrow">
                        {pendingAction === 'solve_identity' || pendingAction === 'solve_disguise' ? '✕' : '›'}
                      </span>
                    </div>
                  </button>
                )}
              </>
            )}

            {inPlay && (
              <button
                onClick={() => pendingAction === 'shift' ? actions.cancelPending() : actions.beginShift()}
                className={`noir-action-btn nb-yellow${pendingAction === 'shift' ? ' nb-active' : ''}`}
              >
                <div className="nb-inner">
                  <div className="nb-icon">↔</div>
                  <div className="nb-text">
                    <span className="nb-title">Tahta Kaydır</span>
                    <span className="nb-sub">{pendingAction === 'shift' ? 'Yön okuna tıkla' : 'Satır veya sütunu kaydır'}</span>
                  </div>
                  <span className="nb-arrow">{pendingAction === 'shift' ? '✕' : '›'}</span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dedektif gizli kimlik seçici — büyük kartlar */}
      {humanCanAct && phase === PHASE.INSPECTOR_PICK_IDENTITY && isHumanInspector && (
        <div className="px-3 py-3 border-b border-noir-border/30 bg-blue-900/10 flex-shrink-0">
          <p className="font-mono text-[10px] text-blue-400 uppercase tracking-widest mb-0.5">Gizli Kimlik Seç</p>
          <p className="text-[11px] text-[#AAAAB0] mb-3">Aşağıdaki kartlardan birini seç.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {inspector.hand.map((id) => {
              const isKilled = (game.killedSuspectIds ?? []).includes(id);
              return (
                <div
                  key={id}
                  className={`flex flex-col items-center cursor-pointer group ${
                    isKilled ? 'opacity-30 pointer-events-none' : ''
                  }`}
                  onClick={() => !isKilled && actions.pickInspectorIdentity(id)}
                >
                  <div className="ring-2 ring-blue-500/60 group-hover:ring-blue-400 rounded-lg transition-all group-hover:scale-105">
                    <SuspectCard suspect={suspect(id)} size={cardSize} showName playerRole="inspector" state={isKilled ? 'eliminated' : 'normal'} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dedektif eli — kimlik seçme fazı dışında */}
      {isHumanInspector && inspector.hand.length > 0 && phase !== PHASE.INSPECTOR_PICK_IDENTITY && (
        <div className="px-3 py-2 border-b border-noir-border/30 flex-shrink-0">
          <div className="font-mono text-[9px] text-[#8080A0] tracking-widest uppercase mb-1.5">Elimdeki Kartlar</div>
          <div className="flex items-center justify-between">
            <div className="flex flex-nowrap gap-1.5">
              {inspector.hand.map((id) => (
                <SuspectCard key={id} suspect={suspect(id)} size={cardSize} showName={false} playerRole="inspector" />
              ))}
            </div>
            {/* Olay Günlüğü butonu — sadece mobil, boş sağ alana */}
            <button
              onClick={() => setShowMobileLog(true)}
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all ml-2 flex-shrink-0"
              title="Olay Günlüğü"
            >
              <span className="text-sm">🔍</span>
              <span className="font-mono text-[9px] tracking-wide">{logs.length}</span>
            </button>
          </div>
        </div>
      )}

      {/* Katil için ayrı olay günlüğü butonu satırı — sadece mobil */}
      {isHumanKiller && (
        <div className="lg:hidden px-3 py-2 border-b border-noir-border/30 flex items-center justify-between flex-shrink-0">
          <span className="font-mono text-[9px] text-[#8080A0] tracking-widest uppercase">Olay Günlüğü</span>
          <button
            onClick={() => setShowMobileLog(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Olay Günlüğü"
          >
            <span className="text-sm">🔍</span>
            <span className="font-mono text-[9px] tracking-wide">{logs.length} kayıt</span>
          </button>
        </div>
      )}

      {/* Olay Günlüğü — kalan tüm alan */}
      <div className="hidden lg:flex flex-1 flex-col min-h-0 px-3 py-2 overflow-hidden">
        <div className="font-mono text-[9px] text-[#8080A0] tracking-widest uppercase mb-1.5">Olay Günlüğü</div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pr-0.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A3E transparent' }}>
          {logs.map((log, i) => {
            const isDetective = log.includes('🔍') || log.includes('✓') || log.includes('↺') || log.includes('Dedektif') || log.includes('🔗');
            const isKiller = log.includes('🗡️') || log.includes('⇄') || log.includes('Katil');
            const colorClass = isDetective ? 'text-blue-400' : isKiller ? 'text-red-400' : 'text-[#9A9890]';
            const sizeClass = "text-[12px] lg:text-[14px]";

            return (
              <div key={i}
                className={`font-mono ${sizeClass} leading-relaxed py-1.5 px-2 rounded ${
                  i === 0
                    ? `bg-noir-accent/10 border border-noir-accent/30 ${colorClass} font-semibold`
                    : `${colorClass} opacity-80`
                }`}
                dangerouslySetInnerHTML={{ __html: log }}
              />
            );
          })}
        </div>
      </div>

      {/* Mobil Olay Günlüğü Overlay */}
      <AnimatePresence>
        {showMobileLog && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="lg:hidden absolute inset-0 z-50 bg-[#09090F] flex flex-col p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="font-mono text-[11px] text-[#8080A0] tracking-widest uppercase">Olay Günlüğü</div>
              <button
                onClick={() => setShowMobileLog(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A3E transparent' }}>
              {logs.map((log, i) => {
                const isDetective = log.includes('🔍') || log.includes('✓') || log.includes('↺') || log.includes('Dedektif') || log.includes('🔗');
                const isKiller = log.includes('🗡️') || log.includes('⇄') || log.includes('Katil');
                const colorClass = isDetective ? 'text-blue-400' : isKiller ? 'text-red-400' : 'text-[#9A9890]';
                return (
                  <div key={i}
                    className={`font-mono text-[13px] leading-relaxed py-2 px-2.5 rounded ${
                      i === 0
                        ? `bg-noir-accent/10 border border-noir-accent/30 ${colorClass} font-semibold`
                        : `${colorClass} opacity-80`
                    }`}
                    dangerouslySetInnerHTML={{ __html: log }}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Ana GameScreen ───────────────────────────────────────────────────────────
export default function GameScreen({ game, actions, onQuit, onReset, isMultiplayer }) {
  if (!game || !game.board) {
    return <div className="min-h-screen flex items-center justify-center bg-[#09090F]"><div className="text-white/50">Oyun yükleniyor...</div></div>;
  }
  


  const activeRows = game.board
    .map((row, r) => ({ r, isEmpty: row.every(cell => cell === null) }))
    .filter(x => !x.isEmpty)
    .map(x => x.r);

  const activeCols = (() => {
    const numCols = game.board[0]?.length ?? 5;
    return Array.from({ length: numCols }, (_, c) => c)
      .filter(c => game.board.some(row => row[c] !== null));
  })();

  const { cellSize, panelWidth, cardSize } = useGridAndPanelSize(activeRows.length, activeCols.length);

  return (
    <div className="relative h-[100dvh] w-full flex flex-col lg:flex-row pb-[46vh] lg:pb-0 overflow-hidden bg-[#09090F]">
      <style>{actionBtnStyles}</style>
      <div className="relative z-10 flex flex-1 flex-col lg:flex-row w-full min-h-0 min-w-0">
        <div className="flex-1 flex items-center justify-center px-2 lg:px-4 pt-1 min-h-0 relative">
          <BoardWithArrows game={game} actions={actions} cellSize={cellSize} activeRows={activeRows} activeCols={activeCols} />
          <ToastNotification logs={game.logs} />
        </div>
        {game.gameOver ? (
          <div
            className="
              w-full lg:static
              fixed bottom-0 left-0 right-0 z-40
              max-h-[50vh] lg:max-h-none overflow-y-auto lg:overflow-hidden
              border-t lg:border-t-0 lg:border-l border-noir-border/40
              flex flex-col bg-[#09090F] lg:min-h-screen
              shadow-[0_-10px_40px_rgba(0,0,0,0.8)] lg:shadow-none
            "
            style={{ width: panelWidth }}
          >
            <GameOverPanel game={game} actions={actions} onReset={onReset} onQuit={onQuit} />
          </div>
        ) : (
          <ActionPanel
            game={game}
            actions={actions}
            onQuit={onQuit}
            panelWidth={panelWidth}
            cardSize={cardSize}
            isMultiplayer={isMultiplayer}
          />
        )}
      </div>
      <ExonerateOverlay game={game} actions={actions} cardSize={cardSize} />

    </div>
  );
}
