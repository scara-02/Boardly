/* ============================================
   BOARDLY — Main App Entry Point
   ============================================ */

class App {
  constructor() {
    this.boardManager = new BoardManager();
    this.uiManager = new UIManager(this.boardManager, () => this.renderBoard());
    this.dragDropManager = new DragDropManager(this.boardManager, () => this.renderBoard());
  }

  init() {
    this.uiManager.init();
    this.renderBoard();
  }

  renderBoard() {
    const board = this.boardManager.getActiveBoard();
    if (!board) return;

    // Update board title input
    this.uiManager.bindBoardTitle();

    // Render columns
    const boardContent = document.getElementById('board-content');
    if (!boardContent) return;

    boardContent.innerHTML = '';

    board.columns.forEach(column => {
      boardContent.appendChild(this.createColumnElement(column));
    });

    // Add "Add Column" button
    const addColumnBtn = document.createElement('button');
    addColumnBtn.className = 'add-column-btn';
    addColumnBtn.id = 'add-column-btn';
    addColumnBtn.innerHTML = '<span>＋</span> Add Column';
    addColumnBtn.addEventListener('click', () => this.uiManager.addColumn());
    boardContent.appendChild(addColumnBtn);

    // Re-initialize drag & drop
    this.dragDropManager.init();

    // Re-apply filters
    this.uiManager.applyFilters();

    // Update sidebar
    this.uiManager.renderSidebar();
  }

  createColumnElement(column) {
    const colEl = document.createElement('div');
    colEl.className = 'column';
    colEl.dataset.columnId = column.id;

    // Header
    const header = document.createElement('div');
    header.className = 'column-header';

    const titleInput = document.createElement('input');
    titleInput.className = 'column-title';
    titleInput.type = 'text';
    titleInput.value = column.title;
    titleInput.spellcheck = false;
    titleInput.addEventListener('change', () => {
      if (titleInput.value.trim()) {
        const boardId = this.boardManager.getActiveBoardId();
        this.boardManager.updateColumnTitle(boardId, column.id, titleInput.value.trim());
      }
    });
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') titleInput.blur();
    });

    const count = document.createElement('span');
    count.className = 'column-count';
    count.textContent = column.cards.length;

    const menuBtn = document.createElement('button');
    menuBtn.className = 'column-menu-btn';
    menuBtn.innerHTML = '⋯';
    menuBtn.title = 'Column options';
    menuBtn.addEventListener('click', (e) => {
      this.uiManager.showColumnMenu(e, column.id);
    });

    header.appendChild(titleInput);
    header.appendChild(count);
    header.appendChild(menuBtn);

    // Cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'column-cards';

    column.cards.forEach(card => {
      cardsContainer.appendChild(this.createCardElement(card, column.id));
    });

    // Footer with add card button
    const footer = document.createElement('div');
    footer.className = 'column-footer';

    const addCardBtn = document.createElement('button');
    addCardBtn.className = 'add-card-btn';
    addCardBtn.innerHTML = '<span>＋</span> Add Card';
    addCardBtn.addEventListener('click', () => {
      this.uiManager.openCardModal(column.id);
    });

    footer.appendChild(addCardBtn);

    colEl.appendChild(header);
    colEl.appendChild(cardsContainer);
    colEl.appendChild(footer);

    return colEl;
  }

  createCardElement(card, columnId) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.priority = card.priority;
    cardEl.dataset.title = card.title;
    cardEl.dataset.description = card.description || '';

    // Priority stripe
    const stripe = document.createElement('div');
    stripe.className = `card-priority-stripe ${card.priority}`;
    cardEl.appendChild(stripe);

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = card.title;

    const editBtn = document.createElement('button');
    editBtn.className = 'card-edit-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Edit card';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.uiManager.openCardModal(columnId, card.id);
    });

    header.appendChild(title);
    header.appendChild(editBtn);
    cardEl.appendChild(header);

    // Description (only if it exists)
    if (card.description) {
      const desc = document.createElement('div');
      desc.className = 'card-description';
      desc.textContent = card.description;
      cardEl.appendChild(desc);
    }

    // Footer with badge and due date
    const footer = document.createElement('div');
    footer.className = 'card-footer';

    const badge = document.createElement('span');
    badge.className = `card-badge ${card.priority}`;
    badge.textContent = this.uiManager.getPriorityLabel(card.priority);
    footer.appendChild(badge);

    if (card.dueDate) {
      const dateInfo = this.uiManager.formatDate(card.dueDate);
      const dueDate = document.createElement('span');
      dueDate.className = `card-due-date ${dateInfo.overdue ? 'overdue' : ''}`;
      dueDate.innerHTML = `📅 ${dateInfo.text}`;
      footer.appendChild(dueDate);
    }

    cardEl.appendChild(footer);

    // Double-click to edit
    cardEl.addEventListener('dblclick', () => {
      this.uiManager.openCardModal(columnId, card.id);
    });

    return cardEl;
  }
}

// ── Initialize the app when DOM is ready ──
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
