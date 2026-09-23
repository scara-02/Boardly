/* ============================================
   BOARDLY — HTML5 Drag & Drop Engine
   ============================================ */

class DragDropManager {
  constructor(boardManager, renderCallback) {
    this.boardManager = boardManager;
    this.renderCallback = renderCallback;
    this.draggedCard = null;      // The DOM element being dragged
    this.draggedCardId = null;
    this.draggedFromColumnId = null;
    this.dropIndicator = null;
  }

  // ── Initialize drag & drop on all cards and columns ──

  init() {
    this.bindCardDragEvents();
    this.bindColumnDropZones();
  }

  // ── Card Drag Events ──

  bindCardDragEvents() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      card.setAttribute('draggable', 'true');

      card.addEventListener('dragstart', (e) => this.onDragStart(e, card));
      card.addEventListener('dragend', (e) => this.onDragEnd(e, card));
    });
  }

  onDragStart(e, card) {
    this.draggedCard = card;
    this.draggedCardId = card.dataset.cardId;
    this.draggedFromColumnId = card.closest('.column').dataset.columnId;

    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.draggedCardId);

    // Add visual feedback with a slight delay so the ghost image captures normal state
    requestAnimationFrame(() => {
      card.classList.add('dragging');
    });
  }

  onDragEnd(e, card) {
    card.classList.remove('dragging');
    this.clearAllDropIndicators();
    this.clearAllDragOverStates();
    this.draggedCard = null;
    this.draggedCardId = null;
    this.draggedFromColumnId = null;
  }

  // ── Column Drop Zone Events ──

  bindColumnDropZones() {
    const columns = document.querySelectorAll('.column');

    columns.forEach(column => {
      const cardsContainer = column.querySelector('.column-cards');

      column.addEventListener('dragover', (e) => this.onDragOver(e, column, cardsContainer));
      column.addEventListener('dragenter', (e) => this.onDragEnter(e, column));
      column.addEventListener('dragleave', (e) => this.onDragLeave(e, column));
      column.addEventListener('drop', (e) => this.onDrop(e, column, cardsContainer));
    });
  }

  onDragOver(e, column, cardsContainer) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!this.draggedCardId) return;

    // Find the card element we're hovering over
    const afterCard = this.getInsertionPoint(cardsContainer, e.clientY);

    // Remove previous indicator
    this.clearDropIndicator(cardsContainer);

    // Create drop indicator
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';

    if (afterCard) {
      cardsContainer.insertBefore(indicator, afterCard);
    } else {
      cardsContainer.appendChild(indicator);
    }
  }

  onDragEnter(e, column) {
    e.preventDefault();
    if (this.draggedCardId) {
      column.classList.add('drag-over');
    }
  }

  onDragLeave(e, column) {
    // Only trigger if we're actually leaving the column (not a child element)
    const rect = column.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      column.classList.remove('drag-over');
      const cardsContainer = column.querySelector('.column-cards');
      this.clearDropIndicator(cardsContainer);
    }
  }

  onDrop(e, column, cardsContainer) {
    e.preventDefault();
    e.stopPropagation();

    if (!this.draggedCardId) return;

    const toColumnId = column.dataset.columnId;
    const boardId = this.boardManager.getActiveBoardId();

    // Calculate insertion index
    const insertIndex = this.getInsertionIndex(cardsContainer, e.clientY);

    // Move the card in the data model
    this.boardManager.moveCard(
      boardId,
      this.draggedFromColumnId,
      toColumnId,
      this.draggedCardId,
      insertIndex
    );

    // Clean up
    column.classList.remove('drag-over');
    this.clearDropIndicator(cardsContainer);

    // Re-render the board
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  // ── Helpers ──

  getInsertionPoint(cardsContainer, mouseY) {
    const cards = [...cardsContainer.querySelectorAll('.card:not(.dragging)')];

    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (mouseY < midY) {
        return card;
      }
    }

    return null; // Drop at end
  }

  getInsertionIndex(cardsContainer, mouseY) {
    const cards = [...cardsContainer.querySelectorAll('.card:not(.dragging)')];

    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (mouseY < midY) {
        return i;
      }
    }

    return cards.length; // Insert at end
  }

  clearDropIndicator(container) {
    if (container) {
      container.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    }
  }

  clearAllDropIndicators() {
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
  }

  clearAllDragOverStates() {
    document.querySelectorAll('.column.drag-over').forEach(col => {
      col.classList.remove('drag-over');
    });
  }
}

// Export as global
window.DragDropManager = DragDropManager;
