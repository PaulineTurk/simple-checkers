import { describe, it, expect, beforeEach } from 'vitest';
import { CheckersGame } from './game.js';

describe('CheckersGame', () => {
  let game;

  beforeEach(() => {
    game = new CheckersGame();
  });

  describe('Initialisation', () => {
    it('crée un plateau 8x8', () => {
      expect(game.board).toHaveLength(8);
      game.board.forEach(row => expect(row).toHaveLength(8));
    });

    it('place 12 pions blancs', () => {
      const counts = game.getCounts();
      expect(counts.white).toBe(12);
    });

    it('place 12 pions noirs', () => {
      const counts = game.getCounts();
      expect(counts.black).toBe(12);
    });

    it('commence avec les blancs', () => {
      expect(game.currentPlayer).toBe('white');
    });

    it('place les pions sur les cases sombres', () => {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = game.board[row][col];
          if (piece) {
            expect((row + col) % 2).toBe(1);
          }
        }
      }
    });
  });

  describe('Déplacement des pions', () => {
    it('déplace un pion blanc en diagonale vers l\'avant', () => {
      game.board[5][0] = { player: 'white', isKing: false };
      game.board[4][1] = null;

      const moves = game.getValidMoves(5, 0);
      expect(moves).toContainEqual({ fromRow: 5, fromCol: 0, toRow: 4, toCol: 1 });
    });

    it('déplace un pion noir en diagonale vers l\'avant', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[2][1] = { player: 'black', isKing: false };
      game.currentPlayer = 'black';

      const moves = game.getValidMoves(2, 1);
      expect(moves).toContainEqual({ fromRow: 2, fromCol: 1, toRow: 3, toCol: 0 });
      expect(moves).toContainEqual({ fromRow: 2, fromCol: 1, toRow: 3, toCol: 2 });
    });

    it('ne peut pas se déplacer vers une case occupée', () => {
      game.board[5][0] = { player: 'white', isKing: false };
      game.board[4][1] = { player: 'white', isKing: false };

      const moves = game.getValidMoves(5, 0);
      expect(moves).not.toContainEqual({ fromRow: 5, fromCol: 0, toRow: 4, toCol: 1 });
    });

    it('ne peut pas déplacer un pion adverse', () => {
      game.board[5][0] = { player: 'black', isKing: false };

      const moves = game.getValidMoves(5, 0);
      expect(moves).toHaveLength(0);
    });

    it('ne peut pas jouer hors tour', () => {
      game.board[2][1] = { player: 'black', isKing: false };

      const moves = game.getValidMoves(2, 1);
      expect(moves).toHaveLength(0);
    });

    it('ne peut pas sortir du plateau', () => {
      game.board[7][0] = { player: 'white', isKing: false };
      game.board[6][1] = null;

      const moves = game.getValidMoves(7, 0);
      expect(moves).toContainEqual({ fromRow: 7, fromCol: 0, toRow: 6, toCol: 1 });
    });
  });

  describe('Capture de pièces', () => {
    it('capture une pièce adverse en avant', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][0] = { player: 'white', isKing: false };
      game.board[4][1] = { player: 'black', isKing: false };
      game.board[3][2] = null;

      const moves = game.getValidMoves(5, 0);
      const jump = moves.find(m => m.jumpRow === 4 && m.jumpCol === 1);
      expect(jump).toBeDefined();
      expect(jump.toRow).toBe(3);
      expect(jump.toCol).toBe(2);
    });

    it('ne capture pas une pièce amie', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][0] = { player: 'white', isKing: false };
      game.board[4][1] = { player: 'white', isKing: false };

      const moves = game.getValidMoves(5, 0);
      expect(moves.some(m => m.jumpRow)).toBe(false);
    });

    it('met à jour le plateau après capture', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][0] = { player: 'white', isKing: false };
      game.board[4][1] = { player: 'black', isKing: false };
      game.board[3][2] = null;

      game.move(5, 0, 3, 2);

      expect(game.board[5][0]).toBeNull();
      expect(game.board[4][1]).toBeNull();
      expect(game.board[3][2]).toEqual({ player: 'white', isKing: false });
    });

    it('décrémente le compteur de pièces capturées', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][0] = { player: 'white', isKing: false };
      game.board[4][1] = { player: 'black', isKing: false };
      game.board[3][2] = null;

      game.move(5, 0, 3, 2);

      const counts = game.getCounts();
      expect(counts.black).toBe(0);
    });
  });

  describe('Multi-capture', () => {
    it('capture multiple en une séquence', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][2] = { player: 'white', isKing: false };
      game.board[4][1] = { player: 'black', isKing: false };
      game.board[2][1] = { player: 'black', isKing: false };
      game.board[3][0] = null;
      game.board[1][2] = null;

      const result = game.move(5, 2, 3, 0);

      expect(result.mustContinue).toBe(true);
      expect(game.board[4][1]).toBeNull();

      game.move(3, 0, 1, 2);

      expect(game.board[2][1]).toBeNull();
      expect(game.mustJumpFrom).toBeNull();
    });

    it('force à continuer la capture multiple', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][2] = { player: 'white', isKing: false };
      game.board[4][1] = { player: 'black', isKing: false };
      game.board[2][1] = { player: 'black', isKing: false };
      game.board[3][0] = null;
      game.board[1][2] = null;

      const result = game.move(5, 2, 3, 0);

      expect(result.mustContinue).toBe(true);
      expect(game.currentPlayer).toBe('white');
    });

    it('permet la capture en arrière pendant une multi-capture', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[4][4] = { player: 'white', isKing: false };
      game.board[3][3] = { player: 'black', isKing: false };
      game.board[3][1] = { player: 'black', isKing: false };
      game.board[4][0] = null;
      game.currentPlayer = 'white';

      const result = game.move(4, 4, 2, 2);
      expect(result.mustContinue).toBe(true);

      const nextMoves = game.getValidMoves(2, 2);
      const backwardJump = nextMoves.find(m => m.jumpRow === 3 && m.jumpCol === 1);
      expect(backwardJump).toBeDefined();
      expect(backwardJump.toRow).toBe(4);
      expect(backwardJump.toCol).toBe(0);
    });

    it('interdit la capture en arrière à l\'initiation', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][2] = { player: 'white', isKing: false };
      game.board[6][1] = { player: 'black', isKing: false };
      game.board[6][3] = null;

      const moves = game.getValidMoves(5, 2);
      const backwardJump = moves.find(m => m.jumpRow === 6);
      expect(backwardJump).toBeUndefined();
    });
  });

  describe('Capture obligatoire', () => {
    it('force la capture quand elle est disponible', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][0] = { player: 'white', isKing: false };
      game.board[5][4] = { player: 'white', isKing: false };
      game.board[4][1] = { player: 'black', isKing: false };
      game.board[3][2] = null;

      const moves = game.getValidMoves(5, 0);
      expect(moves.length).toBe(1);
      expect(moves[0].jumpRow).toBe(4);

      const movesForOther = game.getValidMoves(5, 4);
      expect(movesForOther).toHaveLength(0);
    });

    it('permet le déplacement normal sans capture possible', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][0] = { player: 'white', isKing: false };
      game.board[4][1] = null;

      const moves = game.getValidMoves(5, 0);
      expect(moves).toContainEqual({ fromRow: 5, fromCol: 0, toRow: 4, toCol: 1 });
    });
  });

  describe('Promotion en dame', () => {
    it('promouvoit un pion blanc arrivant à la ligne 0', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[1][0] = { player: 'white', isKing: false };
      game.board[0][1] = null;

      game.move(1, 0, 0, 1);

      expect(game.board[0][1].isKing).toBe(true);
    });

    it('promouvoit un pion noir arrivant à la ligne 7', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[6][1] = { player: 'black', isKing: false };
      game.board[7][0] = null;
      game.board[7][2] = null;
      game.currentPlayer = 'black';

      game.move(6, 1, 7, 0);

      expect(game.board[7][0].isKing).toBe(true);
    });

    it('permet à une dame de se déplacer en diagonale sur plusieurs cases', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[4][3] = { player: 'white', isKing: true };

      const moves = game.getValidMoves(4, 3);

      expect(moves).toContainEqual({ fromRow: 4, fromCol: 3, toRow: 3, toCol: 2 });
      expect(moves).toContainEqual({ fromRow: 4, fromCol: 3, toRow: 3, toCol: 4 });
      expect(moves).toContainEqual({ fromRow: 4, fromCol: 3, toRow: 5, toCol: 2 });
      expect(moves).toContainEqual({ fromRow: 4, fromCol: 3, toRow: 5, toCol: 4 });
    });

    it('permet à une dame de se déplacer en arrière', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[3][3] = { player: 'white', isKing: true };

      const moves = game.getValidMoves(3, 3);

      expect(moves.some(m => m.toRow > 3)).toBe(true);
    });

    it('permet à une dame de capturer dans toutes les directions', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[4][3] = { player: 'white', isKing: true };
      game.board[3][2] = { player: 'black', isKing: false };
      game.board[2][1] = null;

      const moves = game.getValidMoves(4, 3);
      const jump = moves.find(m => m.jumpRow === 3 && m.jumpCol === 2);
      expect(jump).toBeDefined();
    });
  });

  describe('Compteur de pièces', () => {
    it('retourne le nombre de pièces blanches et noires', () => {
      const counts = game.getCounts();
      expect(counts.white).toBe(12);
      expect(counts.black).toBe(12);
    });

    it('met à jour après capture', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][0] = { player: 'white', isKing: false };
      game.board[4][1] = { player: 'black', isKing: false };
      game.board[3][2] = null;

      game.move(5, 0, 3, 2);

      const counts = game.getCounts();
      expect(counts.white).toBe(1);
      expect(counts.black).toBe(0);
    });
  });

  describe('Fin de partie', () => {
    it('détecte la victoire quand un joueur n\'a plus de pièces', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[5][0] = { player: 'white', isKing: false };
      game.currentPlayer = 'black';

      const winner = game.getWinner();
      expect(winner).toBe('white');
    });

    it('détecte la victoire quand un joueur ne peut plus jouer', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.board[0][1] = { player: 'white', isKing: false };
      game.board[1][0] = { player: 'black', isKing: false };
      game.board[1][2] = { player: 'black', isKing: false };

      const winner = game.getWinner();
      expect(winner).toBe('black');
    });

    it('retourne null si la partie continue', () => {
      const winner = game.getWinner();
      expect(winner).toBeNull();
    });
  });

  describe('Réinitialisation', () => {
    it('remet le plateau à l\'état initial', () => {
      game.board = Array(8).fill(null).map(() => Array(8).fill(null));
      game.currentPlayer = 'black';

      game.reset();

      const counts = game.getCounts();
      expect(counts.white).toBe(12);
      expect(counts.black).toBe(12);
      expect(game.currentPlayer).toBe('white');
    });
  });
});
