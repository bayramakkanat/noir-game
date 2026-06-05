import { BOARD_SIZE, CELL_STATUS } from './constants.js';
import { SUSPECTS } from '../data/suspects.js';

/** @typedef {{ suspectId: number, status: 'alive' | 'deceased' }} BoardCell */

const NEIGHBOR_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export function createCell(suspectId) {
  return { suspectId, status: CELL_STATUS.ALIVE };
}

export function buildAlphabeticalLayout() {
  const sorted = [...SUSPECTS].sort((a, b) =>
    a.name.localeCompare(b.name, 'tr')
  );
  const layout = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    layout[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      layout[r][c] = sorted[r * BOARD_SIZE + c].id;
    }
  }
  return layout;
}

export function createBoardFromLayout(layout) {
  return layout.map((row) =>
    row.map((suspectId) => createCell(suspectId))
  );
}

export function cloneBoard(board) {
  return board.map((row) =>
    row.map((cell) => (cell ? { ...cell } : null))
  );
}

export function isInBounds(board, r, c) {
  return r >= 0 && r < board.length && c >= 0 && c < (board[0]?.length ?? 0);
}

export function isAlive(cell) {
  return cell && cell.status === CELL_STATUS.ALIVE;
}

export function getNeighborCoords(board, r, c) {
  const out = [];
  for (const [dr, dc] of NEIGHBOR_OFFSETS) {
    let nr = r + dr;
    let nc = c + dc;

    // Null satırları atla
    if (dr !== 0) {
      while (nr >= 0 && nr < board.length && board[nr].every(cell => cell === null)) {
        nr += dr > 0 ? 1 : -1;
      }
    }

    // Null sütunları atla
    if (dc !== 0) {
      while (nc >= 0 && nc < (board[0]?.length ?? 0) && board.every(row => row[nc] === null)) {
        nc += dc > 0 ? 1 : -1;
      }
    }

    if (isInBounds(board, nr, nc)) out.push({ r: nr, c: nc });
  }
  return out;
}

export function positionOf(board, suspectId) {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < (board[r]?.length ?? 0); c++) {
      const cell = board[r][c];
      if (cell && cell.suspectId === suspectId) return { r, c };
    }
  }
  return null;
}

export function areAdjacent(posA, posB) {
  if (!posA || !posB) return false;
  const dr = Math.abs(posA.r - posB.r);
  const dc = Math.abs(posA.c - posB.c);
  return dr <= 1 && dc <= 1 && (dr + dc > 0);
}

export function getAliveNeighborsAt(board, r, c) {
  return getNeighborCoords(board, r, c)
    .map(({ r: nr, c: nc }) => {
      const cell = board[nr][nc];
      return isAlive(cell) ? { r: nr, c: nc, cell } : null;
    })
    .filter(Boolean);
}

export function getAliveNeighborsOfSuspect(board, suspectId) {
  const pos = positionOf(board, suspectId);
  if (!pos) return [];
  return getAliveNeighborsAt(board, pos.r, pos.c);
}

export function countDeceased(board) {
  let n = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.status === CELL_STATUS.DECEASED) n++;
    }
  }
  return n;
}

export function countAlive(board) {
  let n = 0;
  for (const row of board) {
    for (const cell of row) {
      if (isAlive(cell)) n++;
    }
  }
  return n;
}

function getActiveRowIndices(board) {
  return board
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.some((cell) => cell !== null))
    .map(({ index }) => index);
}

function getActiveColIndices(board) {
  const numCols = board[0]?.length ?? 0;
  return Array.from({ length: numCols }, (_, index) => index)
    .filter((index) => board.some((row) => row[index] !== null));
}

/** Satırdaki tüm mevcut hücreler deceased mi? (tamamen null satırlar yok sayılır) */
function isRowAllDeceased(row) {
  return row.some((cell) => cell !== null) &&
    row.every((cell) => cell === null || cell.status === CELL_STATUS.DECEASED);
}

/** Sütundaki tüm mevcut hücreler deceased mi? (tamamen null sütunlar yok sayılır) */
function isColAllDeceased(board, colIndex) {
  return board.some((row) => row[colIndex] !== null) &&
    board.every(row => {
    const cell = row[colIndex];
    return cell === null || cell.status === CELL_STATUS.DECEASED;
  });
}

/**
 * Tüm deceased olan satır ve sütunları NULL ile doldurur.
 * Karakterler yerinde kalır, sadece o satır/sütun null olur.
 * Board boyutu (5x5) değişmez — null hücreler boş alan gösterir.
 * 
 * @returns {{ board, removedRows, removedCols }}
 */
export function removeEmptyRowsAndCols(board) {
  if (!board.length) return { board, removedRows: [], removedCols: [] };

  const next = cloneBoard(board);
  const removedRows = [];
  const removedCols = [];

  const numRows = next.length;
  const numCols = next[0]?.length ?? 0;

  // Boş satırları null yap
  for (let r = 0; r < numRows; r++) {
    if (isRowAllDeceased(next[r])) {
      removedRows.push(r);
      next[r] = next[r].map(() => null);
    }
  }

  // Boş sütunları null yap
  for (let c = 0; c < numCols; c++) {
    if (isColAllDeceased(next, c)) {
      removedCols.push(c);
      for (let r = 0; r < numRows; r++) {
        next[r][c] = null;
      }
    }
  }

  return { board: next, removedRows, removedCols };
}

/**
 * Kaç null satır/sütun var? (grid boyutu hesabı için)
 */
export function getBoardDimensions(board) {
  const totalRows = board.length;
  const totalCols = board[0]?.length ?? 0;

  let nullRows = 0;
  for (let r = 0; r < totalRows; r++) {
    if (board[r].every(cell => cell === null)) nullRows++;
  }

  let nullCols = 0;
  for (let c = 0; c < totalCols; c++) {
    if (board.every(row => row[c] === null)) nullCols++;
  }

  return {
    activeRows: totalRows - nullRows,
    activeCols: totalCols - nullCols,
    totalRows,
    totalCols,
    nullRows,
    nullCols,
  };
}

export function markDeceased(board, suspectId) {
  const next = cloneBoard(board);
  const pos = positionOf(next, suspectId);
  if (!pos) return next;
  const cell = next[pos.r][pos.c];
  if (cell) cell.status = CELL_STATUS.DECEASED;
  return next;
}

export function shiftRow(board, rowIndex, direction) {
  const next = cloneBoard(board);
  const row = next[rowIndex];
  const activeCols = getActiveColIndices(next);
  const len = activeCols.length;
  if (len <= 1) return next;

  if (direction === 'right') {
    const last = row[activeCols[len - 1]];
    for (let i = len - 1; i > 0; i--) row[activeCols[i]] = row[activeCols[i - 1]];
    row[activeCols[0]] = last;
  } else {
    const first = row[activeCols[0]];
    for (let i = 0; i < len - 1; i++) row[activeCols[i]] = row[activeCols[i + 1]];
    row[activeCols[len - 1]] = first;
  }
  return next;
}

export function shiftColumn(board, colIndex, direction) {
  const next = cloneBoard(board);
  const activeRows = getActiveRowIndices(next);
  const len = activeRows.length;
  if (len <= 1) return next;

  if (direction === 'down') {
    const last = next[activeRows[len - 1]][colIndex];
    for (let i = len - 1; i > 0; i--) {
      next[activeRows[i]][colIndex] = next[activeRows[i - 1]][colIndex];
    }
    next[activeRows[0]][colIndex] = last;
  } else {
    const first = next[activeRows[0]][colIndex];
    for (let i = 0; i < len - 1; i++) {
      next[activeRows[i]][colIndex] = next[activeRows[i + 1]][colIndex];
    }
    next[activeRows[len - 1]][colIndex] = first;
  }
  return next;
}

export function getSuspectAt(board, r, c) {
  const cell = board[r]?.[c];
  return cell ? cell.suspectId : null;
}
