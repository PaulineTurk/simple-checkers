export class CheckersGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = this.createBoard();
    this.currentPlayer = 'white';
    this.mustJumpFrom = null;
  }

  createBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          if (row < 3) board[row][col] = { player: 'black', isKing: false };
          if (row > 4) board[row][col] = { player: 'white', isKing: false };
        }
      }
    }
    return board;
  }

  getPiece(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.board[row][col];
  }

  isValidPosition(row, col) {
    return row >= 0 && row <= 7 && col >= 0 && col <= 7;
  }

  getValidMoves(row, col) {
    const piece = this.getPiece(row, col);
    if (!piece || piece.player !== this.currentPlayer) return [];

    const allJumps = this.getAllJumps(this.currentPlayer);

    if (allJumps.length > 0) {
      const canContinueJump = this.mustJumpFrom &&
        this.mustJumpFrom.row === row &&
        this.mustJumpFrom.col === col;
      return this.getJumpsForPiece(row, col, piece, canContinueJump);
    }

    const jumps = this.getJumpsForPiece(row, col, piece, false);
    const moves = [];
    const directions = piece.isKing
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : (piece.player === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
        moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol });
      }
    }

    return [...moves, ...jumps];
  }

  getJumpsForPiece(row, col, piece, allowBackward = false) {
    const jumps = [];
    let directions = piece.isKing
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : (piece.player === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

    if (allowBackward && !piece.isKing) {
      directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    }

    for (const [dr, dc] of directions) {
      const midRow = row + dr;
      const midCol = col + dc;
      const landRow = row + 2 * dr;
      const landCol = col + 2 * dc;

      if (!this.isValidPosition(landRow, landCol)) continue;

      const midPiece = this.board[midRow][midCol];
      if (midPiece && midPiece.player !== this.currentPlayer && !this.board[landRow][landCol]) {
        jumps.push({
          fromRow: row, fromCol: col,
          toRow: landRow, toCol: landCol,
          jumpRow: midRow, jumpCol: midCol
        });
      }
    }
    return jumps;
  }

  getAllJumps(player) {
    const jumps = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.player === player) {
          const canContinueJump = this.mustJumpFrom &&
            this.mustJumpFrom.row === row &&
            this.mustJumpFrom.col === col;
          jumps.push(...this.getJumpsForPiece(row, col, piece, canContinueJump));
        }
      }
    }
    return jumps;
  }

  move(fromRow, fromCol, toRow, toCol) {
    const validMoves = this.getValidMoves(fromRow, fromCol);
    const move = validMoves.find(m => m.toRow === toRow && m.toCol === toCol);
    if (!move) return { success: false };

    const piece = { ...this.board[fromRow][fromCol] };
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;

    let captured = false;
    if (move.jumpRow !== undefined) {
      this.board[move.jumpRow][move.jumpCol] = null;
      captured = true;
    }

    const promotionRow = piece.player === 'white' ? 0 : 7;
    if (!piece.isKing && toRow === promotionRow) {
      piece.isKing = true;
    }

    if (captured) {
      const additionalJumps = this.getJumpsForPiece(toRow, toCol, piece);
      if (additionalJumps.length > 0) {
        this.mustJumpFrom = { row: toRow, col: toCol };
        return { success: true, captured: true, mustContinue: true };
      }
    }

    this.mustJumpFrom = null;
    this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
    return { success: true, captured, switched: true };
  }

  getCounts() {
    let white = 0, black = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece) piece.player === 'white' ? white++ : black++;
      }
    }
    return { white, black };
  }

  getWinner() {
    const counts = this.getCounts();
    if (counts.white === 0) return 'black';
    if (counts.black === 0) return 'white';

    const currentPlayer = this.currentPlayer;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.player === currentPlayer) {
          const moves = this.getValidMoves(row, col);
          if (moves.length > 0) return null;
        }
      }
    }
    return currentPlayer === 'white' ? 'black' : 'white';
  }
}
