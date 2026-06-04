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

/** Alfabetik sırayla 5×5 başlangıç düzeni (fiziksel NOIR tahtası). */
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

/**
 * @param {number[][]} layout — her hücrede suspectId
 * @returns {(BoardCell | null)[][]}
 */
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

export function isInBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function isAlive(cell) {
  return cell && cell.status === CELL_STATUS.ALIVE;
}

/**
 * @param {(BoardCell | null)[][]} board
 * @returns {{ r: number, c: number }[]}
 */
export function getNeighborCoords(r, c) {
  const out = [];
  for (const [dr, dc] of NEIGHBOR_OFFSETS) {
    const nr = r + dr;
    const nc = c + dc;
    if (isInBounds(nr, nc)) out.push({ r: nr, c: nc });
  }
  return out;
}

/**
 * @param {(BoardCell | null)[][]} board
 * @returns {{ r: number, c: number } | null}
 */
export function positionOf(board, suspectId) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
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

/**
 * @param {(BoardCell | null)[][]} board
 * @returns {{ r: number, c: number, cell: BoardCell }[]}
 */
export function getAliveNeighborsAt(board, r, c) {
  return getNeighborCoords(r, c)
    .map(({ r: nr, c: nc }) => {
      const cell = board[nr][nc];
      return isAlive(cell) ? { r: nr, c: nc, cell } : null;
    })
    .filter(Boolean);
}

/**
 * @param {(BoardCell | null)[][]} board
 * @returns {{ r: number, c: number, cell: BoardCell }[]}
 */
export function getAliveNeighborsOfSuspect(board, suspectId) {
  const pos = positionOf(board, suspectId);
  if (!pos) return [];
  return getAliveNeighborsAt(board, pos.r, pos.c);
}

export function countDeceased(board) {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (cell && cell.status === CELL_STATUS.DECEASED) n++;
    }
  }
  return n;
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
  if (direction === 'right') {
    const last = row[BOARD_SIZE - 1];
    for (let c = BOARD_SIZE - 1; c > 0; c--) row[c] = row[c - 1];
    row[0] = last;
  } else {
    const first = row[0];
    for (let c = 0; c < BOARD_SIZE - 1; c++) row[c] = row[c + 1];
    row[BOARD_SIZE - 1] = first;
  }
  return next;
}

export function shiftColumn(board, colIndex, direction) {
  const next = cloneBoard(board);
  if (direction === 'down') {
    const last = next[BOARD_SIZE - 1][colIndex];
    for (let r = BOARD_SIZE - 1; r > 0; r--) {
      next[r][colIndex] = next[r - 1][colIndex];
    }
    next[0][colIndex] = last;
  } else {
    const first = next[0][colIndex];
    for (let r = 0; r < BOARD_SIZE - 1; r++) {
      next[r][colIndex] = next[r + 1][colIndex];
    }
    next[BOARD_SIZE - 1][colIndex] = first;
  }
  return next;
}

export function getSuspectAt(board, r, c) {
  const cell = board[r]?.[c];
  return cell ? cell.suspectId : null;
}
