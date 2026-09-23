/* ============================================
   BOARDLY — Board Data Model & localStorage
   ============================================ */

class BoardManager {
  constructor() {
    this.STORAGE_KEY = 'boardly_data';
    this.data = this.load();
  }

  // ── Persistence ──

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('BoardManager: Failed to load data from localStorage', e);
    }
    return this.createDefaultData();
  }

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('BoardManager: Failed to save data to localStorage', e);
    }
  }

  createDefaultData() {
    const boardId = this.generateId();
    return {
      activeBoardId: boardId,
      boards: [
        {
          id: boardId,
          title: 'My First Board',
          columns: [
            {
              id: this.generateId(),
              title: '📋 To Do',
              cards: [
                {
                  id: this.generateId(),
                  title: 'Welcome to Boardly!',
                  description: 'This is your first task card. Try dragging it to another column!',
                  priority: 'medium',
                  dueDate: '',
                  createdAt: new Date().toISOString()
                },
                {
                  id: this.generateId(),
                  title: 'Customize your board',
                  description: 'Click the column title to rename it, or add new columns and cards.',
                  priority: 'low',
                  dueDate: '',
                  createdAt: new Date().toISOString()
                }
              ]
            },
            {
              id: this.generateId(),
              title: '🔄 In Progress',
              cards: [
                {
                  id: this.generateId(),
                  title: 'Explore drag & drop',
                  description: 'Grab any card and move it between columns to organize your work.',
                  priority: 'high',
                  dueDate: this.getFutureDate(3),
                  createdAt: new Date().toISOString()
                }
              ]
            },
            {
              id: this.generateId(),
              title: '✅ Done',
              cards: [
                {
                  id: this.generateId(),
                  title: 'Install Boardly',
                  description: 'You did it! Boardly is up and running.',
                  priority: 'low',
                  dueDate: '',
                  createdAt: new Date().toISOString()
                }
              ]
            }
          ]
        }
      ]
    };
  }

  // ── Helpers ──

  generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  getFutureDate(daysFromNow) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
  }

  // ── Board CRUD ──

  getBoards() {
    return this.data.boards;
  }

  getActiveBoard() {
    return this.data.boards.find(b => b.id === this.data.activeBoardId) || this.data.boards[0];
  }

  getActiveBoardId() {
    return this.data.activeBoardId;
  }

  setActiveBoard(boardId) {
    this.data.activeBoardId = boardId;
    this.save();
  }

  createBoard(title) {
    const board = {
      id: this.generateId(),
      title: title || 'Untitled Board',
      columns: []
    };
    this.data.boards.push(board);
    this.data.activeBoardId = board.id;
    this.save();
    return board;
  }

  updateBoardTitle(boardId, newTitle) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (board) {
      board.title = newTitle;
      this.save();
    }
  }

  deleteBoard(boardId) {
    const idx = this.data.boards.findIndex(b => b.id === boardId);
    if (idx === -1) return;

    this.data.boards.splice(idx, 1);

    // If we deleted the active board, switch to another
    if (this.data.activeBoardId === boardId) {
      this.data.activeBoardId = this.data.boards.length > 0 ? this.data.boards[0].id : null;
    }

    // Always keep at least one board
    if (this.data.boards.length === 0) {
      const newBoard = {
        id: this.generateId(),
        title: 'New Board',
        columns: []
      };
      this.data.boards.push(newBoard);
      this.data.activeBoardId = newBoard.id;
    }

    this.save();
  }

  // ── Column CRUD ──

  getColumns(boardId) {
    const board = this.data.boards.find(b => b.id === boardId);
    return board ? board.columns : [];
  }

  createColumn(boardId, title) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (!board) return null;

    const column = {
      id: this.generateId(),
      title: title || 'New Column',
      cards: []
    };
    board.columns.push(column);
    this.save();
    return column;
  }

  updateColumnTitle(boardId, columnId, newTitle) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (!board) return;

    const column = board.columns.find(c => c.id === columnId);
    if (column) {
      column.title = newTitle;
      this.save();
    }
  }

  deleteColumn(boardId, columnId) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (!board) return;

    board.columns = board.columns.filter(c => c.id !== columnId);
    this.save();
  }

  // ── Card CRUD ──

  getCards(boardId, columnId) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (!board) return [];

    const column = board.columns.find(c => c.id === columnId);
    return column ? column.cards : [];
  }

  createCard(boardId, columnId, cardData) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (!board) return null;

    const column = board.columns.find(c => c.id === columnId);
    if (!column) return null;

    const card = {
      id: this.generateId(),
      title: cardData.title || 'Untitled Card',
      description: cardData.description || '',
      priority: cardData.priority || 'medium',
      dueDate: cardData.dueDate || '',
      createdAt: new Date().toISOString()
    };

    column.cards.push(card);
    this.save();
    return card;
  }

  updateCard(boardId, columnId, cardId, updates) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (!board) return;

    const column = board.columns.find(c => c.id === columnId);
    if (!column) return;

    const card = column.cards.find(c => c.id === cardId);
    if (card) {
      Object.assign(card, updates);
      this.save();
    }
  }

  deleteCard(boardId, columnId, cardId) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (!board) return;

    const column = board.columns.find(c => c.id === columnId);
    if (!column) return;

    column.cards = column.cards.filter(c => c.id !== cardId);
    this.save();
  }

  findCardById(boardId, cardId) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (!board) return null;

    for (const column of board.columns) {
      const card = column.cards.find(c => c.id === cardId);
      if (card) {
        return { card, columnId: column.id };
      }
    }
    return null;
  }

  // ── Card Movement (Drag & Drop) ──

  moveCard(boardId, fromColumnId, toColumnId, cardId, insertAtIndex) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (!board) return;

    const fromColumn = board.columns.find(c => c.id === fromColumnId);
    const toColumn = board.columns.find(c => c.id === toColumnId);
    if (!fromColumn || !toColumn) return;

    // Find and remove card from source column
    const cardIndex = fromColumn.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const [card] = fromColumn.cards.splice(cardIndex, 1);

    // Insert into target column at the specified index
    if (insertAtIndex !== undefined && insertAtIndex >= 0) {
      toColumn.cards.splice(insertAtIndex, 0, card);
    } else {
      toColumn.cards.push(card);
    }

    this.save();
  }
}

// Export as global
window.BoardManager = BoardManager;
