export class CheckersGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = this.createBoard();
    this.currentPlayer = 'white';
    this.mustJumpFrom = null;
    this.hasJumpedForward = false; // NEW: tracks if pawn jumped forward this turn
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

    // If mid-chain jump, only this piece can move and only jumps are allowed
    if (this.mustJumpFrom) {
      if (this.mustJumpFrom.row !== row || this.mustJumpFrom.col !== col) return [];
      return this.getJumpsForPiece(row, col, piece, true);
    }

    const allJumps = this.getAllJumps(this.currentPlayer);
    if (allJumps.length > 0) {
      return this.getJumpsForPiece(row, col, piece, false);
    }

    // Regular moves
    const moves = [];
    if (piece.isKing) {
      // Kings move along full diagonals
      const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of directions) {
        let r = row + dr, c = col + dc;
        while (this.isValidPosition(r, c) && !this.board[r][c]) {
          moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c });
          r += dr; c += dc;
        }
      }
    } else {
      const directions = piece.player === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
      for (const [dr, dc] of directions) {
        const newRow = row + dr, newCol = col + dc;
        if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
          moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol });
        }
      }
    }

    return moves;
  }

  getJumpsForPiece(row, col, piece, isContinuation = false) {
    if (piece.isKing) {
      return this._getKingJumps(row, col);
    } else {
      return this._getPawnJumps(row, col, piece, isContinuation);
    }
  }

  _getPawnJumps(row, col, piece, isContinuation) {
    const jumps = [];
    const forwardDir = piece.player === 'white' ? -1 : 1;
    const forwardDirections = [[forwardDir, -1], [forwardDir, 1]];
    const backwardDirections = [[-forwardDir, -1], [-forwardDir, 1]];

    // Always check forward jumps
    for (const [dr, dc] of forwardDirections) {
      const midRow = row + dr, midCol = col + dc;
      const landRow = row + 2 * dr, landCol = col + 2 * dc;
      if (!this.isValidPosition(landRow, landCol)) continue;
      const midPiece = this.board[midRow][midCol];
      if (midPiece && midPiece.player !== this.currentPlayer && !this.board[landRow][landCol]) {
        jumps.push({
          fromRow: row, fromCol: col,
          toRow: landRow, toCol: landCol,
          jumpRow: midRow, jumpCol: midCol,
          isForward: true,
          canContinueCapture: true
        });
      }
    }

    // Backward jumps only allowed during a multi-jump if we've already jumped forward
    if (isContinuation && this.hasJumpedForward) {
      for (const [dr, dc] of backwardDirections) {
        const midRow = row + dr, midCol = col + dc;
        const landRow = row + 2 * dr, landCol = col + 2 * dc;
        if (!this.isValidPosition(landRow, landCol)) continue;
        const midPiece = this.board[midRow][midCol];
        if (midPiece && midPiece.player !== this.currentPlayer && !this.board[landRow][landCol]) {
          jumps.push({
            fromRow: row, fromCol: col,
            toRow: landRow, toCol: landCol,
            jumpRow: midRow, jumpCol: midCol,
            isForward: false,
            canContinueCapture: true
          });
        }
      }
    }

    return jumps;
  }

  _getKingJumps(row, col) {
    // NEW: King long-range capture
    // A king can capture any opponent piece on its diagonal (no pieces between them),
    // and land on any empty square beyond the captured piece.
    // BUT: only the square immediately after the captured piece allows further captures.
    const jumps = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
      let r = row + dr, c = col + dc;
      // Slide until we hit something or edge
      while (this.isValidPosition(r, c) && !this.board[r][c]) {
        r += dr; c += dc;
      }
      // Check if we found an enemy piece
      if (!this.isValidPosition(r, c)) continue;
      const target = this.board[r][c];
      if (!target || target.player === this.currentPlayer) continue;

      // Found an enemy at (r, c) — enumerate landing squares beyond it
      const jumpRow = r, jumpCol = c;
      r += dr; c += dc;
      let isFirst = true;
      while (this.isValidPosition(r, c) && !this.board[r][c]) {
        jumps.push({
          fromRow: row, fromCol: col,
          toRow: r, toCol: c,
          jumpRow, jumpCol,
          // Only the first square after capture allows chaining
          canContinueCapture: isFirst
        });
        isFirst = false;
        r += dr; c += dc;
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
          jumps.push(...this.getJumpsForPiece(row, col, piece, false));
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

      // Track if this pawn has jumped forward this turn
      if (!piece.isKing && move.isForward) {
        this.hasJumpedForward = true;
      }
    }

    // Promotion check
    const promotionRow = piece.player === 'white' ? 0 : 7;
    if (!piece.isKing && toRow === promotionRow) {
      piece.isKing = true;
    }

    // Check for chained capture
    if (captured && move.canContinueCapture) {
      const additionalJumps = this.getJumpsForPiece(toRow, toCol, piece, true);
      if (additionalJumps.length > 0) {
        this.mustJumpFrom = { row: toRow, col: toCol };
        return { success: true, captured: true, mustContinue: true };
      }
    }

    // End of turn
    this.mustJumpFrom = null;
    this.hasJumpedForward = false;
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

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.player === this.currentPlayer) {
          if (this.getValidMoves(row, col).length > 0) return null;
        }
      }
    }
    return this.currentPlayer === 'white' ? 'black' : 'white';
  }
}