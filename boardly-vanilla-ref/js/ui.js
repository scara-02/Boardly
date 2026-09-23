/* ============================================
   BOARDLY — UI Controller
   Modals, Sidebar, Search, Context Menus
   ============================================ */

class UIManager {
  constructor(boardManager, renderCallback) {
    this.boardManager = boardManager;
    this.renderCallback = renderCallback;
    this.activeFilter = null;    // null = show all, or 'urgent'|'high'|'medium'|'low'
    this.searchQuery = '';
    this.sidebarOpen = true;
    this.activeContextMenu = null;

    // Modal state
    this.editingCard = null;       // { cardId, columnId } if editing
    this.addingToColumnId = null;  // columnId if adding new card
  }

  // ── Initialize ──

  init() {
    this.bindSidebar();
    this.bindSearch();
    this.bindFilter();
    this.bindModals();
    this.bindGlobalEvents();
    this.renderSidebar();
  }

  // ── Sidebar ──

  bindSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleSidebar());
    }

    const addBoardBtn = document.getElementById('add-board-btn');
    if (addBoardBtn) {
      addBoardBtn.addEventListener('click', () => this.createNewBoard());
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed', !this.sidebarOpen);
    }
  }

  renderSidebar() {
    const boardList = document.getElementById('board-list');
    if (!boardList) return;

    const boards = this.boardManager.getBoards();
    const activeBoardId = this.boardManager.getActiveBoardId();

    boardList.innerHTML = boards.map(board => `
      <li class="board-list-item ${board.id === activeBoardId ? 'active' : ''}"
          data-board-id="${board.id}">
        <span class="board-icon">📋</span>
        <span class="board-name">${this.escapeHtml(board.title)}</span>
        <button class="board-delete-btn" data-board-id="${board.id}" title="Delete board">✕</button>
      </li>
    `).join('');

    // Bind click events
    boardList.querySelectorAll('.board-list-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('board-delete-btn')) return;
        const boardId = item.dataset.boardId;
        this.boardManager.setActiveBoard(boardId);
        this.renderSidebar();
        this.renderCallback();
      });
    });

    // Bind delete events
    boardList.querySelectorAll('.board-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const boardId = btn.dataset.boardId;
        if (confirm('Delete this board and all its contents?')) {
          this.boardManager.deleteBoard(boardId);
          this.renderSidebar();
          this.renderCallback();
        }
      });
    });
  }

  createNewBoard() {
    const title = prompt('Enter board name:', 'New Board');
    if (title !== null && title.trim()) {
      this.boardManager.createBoard(title.trim());
      this.renderSidebar();
      this.renderCallback();
    }
  }

  // ── Board Title Editing ──

  bindBoardTitle() {
    const titleInput = document.getElementById('board-title');
    if (!titleInput) return;

    const board = this.boardManager.getActiveBoard();
    if (board) {
      titleInput.value = board.title;
    }

    titleInput.addEventListener('change', () => {
      const board = this.boardManager.getActiveBoard();
      if (board && titleInput.value.trim()) {
        this.boardManager.updateBoardTitle(board.id, titleInput.value.trim());
        this.renderSidebar();
      }
    });

    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        titleInput.blur();
      }
    });
  }

  // ── Search ──

  bindSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.applyFilters();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        this.searchQuery = '';
        this.applyFilters();
        searchInput.blur();
      }
    });
  }

  // ── Filter ──

  bindFilter() {
    const filterBtn = document.getElementById('filter-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    if (!filterBtn || !filterDropdown) return;

    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterDropdown.classList.toggle('show');
      filterBtn.classList.toggle('active', filterDropdown.classList.contains('show'));
    });

    filterDropdown.querySelectorAll('.filter-option').forEach(option => {
      option.addEventListener('click', () => {
        const priority = option.dataset.priority;

        if (this.activeFilter === priority) {
          // Toggle off
          this.activeFilter = null;
          option.classList.remove('active');
        } else {
          // Set new filter
          filterDropdown.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
          option.classList.add('active');
          this.activeFilter = priority;
        }

        filterDropdown.classList.remove('show');
        filterBtn.classList.toggle('active', this.activeFilter !== null);
        this.applyFilters();
      });
    });
  }

  applyFilters() {
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
      let visible = true;

      // Search filter
      if (this.searchQuery) {
        const title = (card.dataset.title || '').toLowerCase();
        const description = (card.dataset.description || '').toLowerCase();
        if (!title.includes(this.searchQuery) && !description.includes(this.searchQuery)) {
          visible = false;
        }
      }

      // Priority filter
      if (this.activeFilter) {
        if (card.dataset.priority !== this.activeFilter) {
          visible = false;
        }
      }

      card.classList.toggle('hidden', !visible);
    });

    // Update column counts to reflect visible cards
    document.querySelectorAll('.column').forEach(col => {
      const visibleCards = col.querySelectorAll('.card:not(.hidden)').length;
      const countEl = col.querySelector('.column-count');
      if (countEl) {
        countEl.textContent = visibleCards;
      }
    });
  }

  // ── Modals ──

  bindModals() {
    // Card Modal
    const cardModal = document.getElementById('card-modal');
    const cardModalClose = document.getElementById('card-modal-close');
    const cardForm = document.getElementById('card-form');
    const cardDeleteBtn = document.getElementById('card-delete-btn');
    const cardCancelBtn = document.getElementById('card-cancel-btn');

    if (cardModalClose) {
      cardModalClose.addEventListener('click', () => this.closeCardModal());
    }

    if (cardCancelBtn) {
      cardCancelBtn.addEventListener('click', () => this.closeCardModal());
    }

    if (cardModal) {
      cardModal.addEventListener('click', (e) => {
        if (e.target === cardModal) this.closeCardModal();
      });
    }

    if (cardForm) {
      cardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveCard();
      });
    }

    if (cardDeleteBtn) {
      cardDeleteBtn.addEventListener('click', () => this.deleteCurrentCard());
    }
  }

  openCardModal(columnId, cardId = null) {
    const modal = document.getElementById('card-modal');
    const modalTitle = document.getElementById('card-modal-title');
    const deleteBtn = document.getElementById('card-delete-btn');
    const titleInput = document.getElementById('card-title-input');
    const descInput = document.getElementById('card-desc-input');
    const prioritySelect = document.getElementById('card-priority-input');
    const dueDateInput = document.getElementById('card-due-date-input');

    if (!modal) return;

    if (cardId) {
      // Edit mode
      this.editingCard = { cardId, columnId };
      this.addingToColumnId = null;
      modalTitle.textContent = 'Edit Card';
      deleteBtn.style.display = 'inline-flex';

      const board = this.boardManager.getActiveBoard();
      const result = this.boardManager.findCardById(board.id, cardId);
      if (result) {
        titleInput.value = result.card.title;
        descInput.value = result.card.description;
        prioritySelect.value = result.card.priority;
        dueDateInput.value = result.card.dueDate;
      }
    } else {
      // Add mode
      this.editingCard = null;
      this.addingToColumnId = columnId;
      modalTitle.textContent = 'New Card';
      deleteBtn.style.display = 'none';

      titleInput.value = '';
      descInput.value = '';
      prioritySelect.value = 'medium';
      dueDateInput.value = '';
    }

    modal.classList.add('show');
    setTimeout(() => titleInput.focus(), 100);
  }

  closeCardModal() {
    const modal = document.getElementById('card-modal');
    if (modal) {
      modal.classList.remove('show');
    }
    this.editingCard = null;
    this.addingToColumnId = null;
  }

  saveCard() {
    const titleInput = document.getElementById('card-title-input');
    const descInput = document.getElementById('card-desc-input');
    const prioritySelect = document.getElementById('card-priority-input');
    const dueDateInput = document.getElementById('card-due-date-input');

    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }

    const boardId = this.boardManager.getActiveBoardId();
    const cardData = {
      title,
      description: descInput.value.trim(),
      priority: prioritySelect.value,
      dueDate: dueDateInput.value
    };

    if (this.editingCard) {
      // Update existing card
      this.boardManager.updateCard(
        boardId,
        this.editingCard.columnId,
        this.editingCard.cardId,
        cardData
      );
    } else if (this.addingToColumnId) {
      // Create new card
      this.boardManager.createCard(boardId, this.addingToColumnId, cardData);
    }

    this.closeCardModal();
    this.renderCallback();
  }

  deleteCurrentCard() {
    if (!this.editingCard) return;

    if (confirm('Delete this card?')) {
      const boardId = this.boardManager.getActiveBoardId();
      this.boardManager.deleteCard(
        boardId,
        this.editingCard.columnId,
        this.editingCard.cardId
      );
      this.closeCardModal();
      this.renderCallback();
    }
  }

  // ── Column Actions ──

  showColumnMenu(e, columnId) {
    e.stopPropagation();
    this.closeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <button class="context-menu-item" data-action="rename">
        ✏️ Rename Column
      </button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item danger" data-action="delete">
        🗑️ Delete Column
      </button>
    `;

    // Position the menu
    const rect = e.target.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;

    document.body.appendChild(menu);
    this.activeContextMenu = menu;

    // Bind actions
    menu.querySelector('[data-action="rename"]').addEventListener('click', () => {
      this.closeContextMenu();
      const columnTitle = document.querySelector(`.column[data-column-id="${columnId}"] .column-title`);
      if (columnTitle) {
        columnTitle.focus();
        columnTitle.select();
      }
    });

    menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
      this.closeContextMenu();
      if (confirm('Delete this column and all its cards?')) {
        const boardId = this.boardManager.getActiveBoardId();
        this.boardManager.deleteColumn(boardId, columnId);
        this.renderCallback();
      }
    });
  }

  closeContextMenu() {
    if (this.activeContextMenu) {
      this.activeContextMenu.remove();
      this.activeContextMenu = null;
    }
  }

  addColumn() {
    const title = prompt('Enter column name:', 'New Column');
    if (title !== null && title.trim()) {
      const boardId = this.boardManager.getActiveBoardId();
      this.boardManager.createColumn(boardId, title.trim());
      this.renderCallback();
    }
  }

  // ── Global Events ──

  bindGlobalEvents() {
    // Close context menu on click outside
    document.addEventListener('click', () => {
      this.closeContextMenu();
      const filterDropdown = document.getElementById('filter-dropdown');
      const filterBtn = document.getElementById('filter-btn');
      if (filterDropdown) filterDropdown.classList.remove('show');
      if (filterBtn) filterBtn.classList.remove('active');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeCardModal();
        this.closeContextMenu();
      }
    });
  }

  // ── Helpers ──

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    const options = { month: 'short', day: 'numeric' };

    if (diffDays < 0) return { text: date.toLocaleDateString('en-US', options), overdue: true };
    if (diffDays === 0) return { text: 'Today', overdue: false };
    if (diffDays === 1) return { text: 'Tomorrow', overdue: false };
    return { text: date.toLocaleDateString('en-US', options), overdue: false };
  }

  getPriorityLabel(priority) {
    const labels = {
      urgent: '🔴 Urgent',
      high: '🟠 High',
      medium: '🔵 Medium',
      low: '🟢 Low'
    };
    return labels[priority] || priority;
  }
}

// Export as global
window.UIManager = UIManager;
