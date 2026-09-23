import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import Sidebar from '../components/UI/Sidebar';
import Column from '../components/Board/Column';
import CardModal from '../components/UI/CardModal';
import { Menu, Search, Filter } from 'lucide-react';

const Board = () => {
  const { user, tenant, logout } = useAuth();
  
  // State
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  
  // Modal State
  const [modalState, setModalState] = useState({ isOpen: false, data: null, targetColumnId: null });

  // Utils ported from Vanilla JS
  const uiManagerUtils = {
    getPriorityLabel: (priority) => {
      const labels = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };
      return labels[priority] || 'Medium';
    },
    formatDateText: (dateString) => {
      const d = new Date(dateString);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Today';
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
      
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },
    isOverdue: (dateString) => {
      const d = new Date(dateString);
      d.setHours(23, 59, 59, 999);
      return d < new Date();
    }
  };

  // Fetch Boards on mount
  useEffect(() => {
    fetchBoards();
  }, []);

  // Fetch Lists/Cards when activeBoard changes
  useEffect(() => {
    if (activeBoard) {
      fetchLists(activeBoard._id);
    }
  }, [activeBoard]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/boards');
      setBoards(res.data.data);
      if (res.data.data.length > 0 && !activeBoard) {
        setActiveBoard(res.data.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch boards', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async (boardId) => {
    try {
      const res = await apiClient.get(`/boards/${boardId}/lists`);
      // Sort lists by position
      const sortedLists = res.data.data.sort((a, b) => a.position - b.position);
      setLists(sortedLists);
    } catch (err) {
      console.error('Failed to fetch lists', err);
    }
  };

  const handleCreateBoard = async () => {
    const title = prompt('Enter new board title:');
    if (!title) return;
    try {
      const res = await apiClient.post('/boards', { title, description: '' });
      setBoards([...boards, res.data.data]);
      setActiveBoard(res.data.data);
    } catch (err) {
      alert('Failed to create board');
    }
  };

  const handleAddColumn = async () => {
    if (!activeBoard) return;
    const title = prompt('Enter column title:');
    if (!title) return;
    try {
      const position = lists.length;
      const res = await apiClient.post(`/boards/${activeBoard._id}/lists`, { title, position });
      // Initialize empty cards array for new list
      setLists([...lists, { ...res.data.data, cards: [] }]);
    } catch (err) {
      alert('Failed to create column');
    }
  };

  const handleUpdateColumnTitle = async (listId, newTitle) => {
    try {
      await apiClient.patch(`/lists/${listId}`, { title: newTitle });
      setLists(lists.map(l => l._id === listId ? { ...l, title: newTitle } : l));
    } catch (err) {
      console.error('Failed to update column title', err);
    }
  };

  const handleUpdateBoardTitle = async (newTitle) => {
    if (!activeBoard || !newTitle.trim() || newTitle === activeBoard.title) return;
    try {
      await apiClient.patch(`/boards/${activeBoard._id}`, { title: newTitle });
      setActiveBoard({ ...activeBoard, title: newTitle });
      setBoards(boards.map(b => b._id === activeBoard._id ? { ...b, title: newTitle } : b));
    } catch (err) {
      console.error('Failed to update board title', err);
    }
  };

  // ── Card Operations ──

  const handleOpenNewCardModal = (columnId) => {
    setModalState({ isOpen: true, data: null, targetColumnId: columnId });
  };

  const handleOpenEditCardModal = (columnId, cardId) => {
    const list = lists.find(l => l._id === columnId);
    if (!list) return;
    const card = list.cards.find(c => c._id === cardId);
    if (card) {
      setModalState({ isOpen: true, data: { ...card, id: card._id }, targetColumnId: columnId });
    }
  };

  const handleSaveCard = async (cardData) => {
    const listId = modalState.targetColumnId;
    
    try {
      if (cardData.id) {
        // Update existing
        const res = await apiClient.patch(`/cards/${cardData.id}`, {
          title: cardData.title,
          description: cardData.description,
          priority: cardData.priority,
          dueDate: cardData.dueDate
        });
        
        // Optimistic update
        setLists(lists.map(list => {
          if (list._id === listId) {
            return {
              ...list,
              cards: list.cards.map(c => c._id === cardData.id ? { ...c, ...res.data.data } : c)
            };
          }
          return list;
        }));
      } else {
        // Create new
        const targetList = lists.find(l => l._id === listId);
        const position = targetList.cards ? targetList.cards.length : 0;
        
        const res = await apiClient.post(`/lists/${listId}/cards`, {
          title: cardData.title,
          description: cardData.description,
          priority: cardData.priority,
          dueDate: cardData.dueDate,
          position
        });
        
        // Optimistic update
        setLists(lists.map(list => {
          if (list._id === listId) {
            return { ...list, cards: [...(list.cards || []), res.data.data] };
          }
          return list;
        }));
      }
      setModalState({ isOpen: false, data: null, targetColumnId: null });
    } catch (err) {
      alert('Failed to save card');
      console.error(err);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    
    const listId = modalState.targetColumnId;
    try {
      await apiClient.delete(`/cards/${cardId}`);
      // Optimistic update
      setLists(lists.map(list => {
        if (list._id === listId) {
          return { ...list, cards: list.cards.filter(c => c._id !== cardId) };
        }
        return list;
      }));
      setModalState({ isOpen: false, data: null, targetColumnId: null });
    } catch (err) {
      alert('Failed to delete card');
    }
  };

  const handleDropCard = async (cardId, sourceListId, targetListId) => {
    if (sourceListId === targetListId) return; // Intra-list sorting not fully implemented in UI yet
    
    // Find the card
    const sourceList = lists.find(l => l._id === sourceListId);
    const card = sourceList.cards.find(c => c._id === cardId);
    if (!card) return;

    const targetList = lists.find(l => l._id === targetListId);
    const newPosition = targetList.cards ? targetList.cards.length : 0;

    // Optimistic UI update
    setLists(prevLists => {
      return prevLists.map(list => {
        if (list._id === sourceListId) {
          return { ...list, cards: list.cards.filter(c => c._id !== cardId) };
        }
        if (list._id === targetListId) {
          return { ...list, cards: [...(list.cards || []), card] };
        }
        return list;
      });
    });

    try {
      // Backend expects: PATCH /cards/:id with listId and position
      await apiClient.patch(`/cards/${cardId}`, { 
        listId: targetListId,
        position: newPosition
      });
    } catch (err) {
      console.error('Failed to move card', err);
      // Revert optimistic update by refetching
      fetchLists(activeBoard._id);
    }
  };

  // ── Filters & Search ──
  const getFilteredLists = () => {
    return lists.map(list => {
      const filteredCards = (list.cards || []).filter(card => {
        const matchesSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter ? card.priority === activeFilter : true;
        return matchesSearch && matchesFilter;
      });
      return { ...list, cards: filteredCards };
    });
  };

  const filteredLists = getFilteredLists();

  return (
    <div id="app">
      <Sidebar 
        boards={boards} 
        activeBoardId={activeBoard?._id}
        onSelectBoard={(id) => setActiveBoard(boards.find(b => b._id === id))}
        onCreateBoard={handleCreateBoard}
        sidebarOpen={sidebarOpen}
      />

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
            {activeBoard && (
              <input 
                type="text" 
                className="board-title" 
                spellCheck="false" 
                value={activeBoard.title}
                onChange={(e) => setActiveBoard({...activeBoard, title: e.target.value})}
                onBlur={(e) => handleUpdateBoardTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              />
            )}
          </div>
          <div className="topbar-center">
            <div className="search-container">
              <span className="search-icon"><Search size={16} /></span>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="topbar-right" style={{ position: 'relative' }}>
            <button 
              className={`filter-btn ${activeFilter ? 'active' : ''}`}
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            >
              <span><Filter size={16} /></span> {activeFilter ? uiManagerUtils.getPriorityLabel(activeFilter) : 'Filter'}
            </button>
            
            {filterDropdownOpen && (
              <div className="filter-dropdown show">
                <button className="filter-option" onClick={() => { setActiveFilter(null); setFilterDropdownOpen(false); }}>
                  Show All
                </button>
                {['urgent', 'high', 'medium', 'low'].map(priority => (
                  <button 
                    key={priority}
                    className="filter-option" 
                    onClick={() => { setActiveFilter(priority); setFilterDropdownOpen(false); }}
                  >
                    <span className="filter-dot" style={{ background: `var(--priority-${priority})` }}></span>
                    {uiManagerUtils.getPriorityLabel(priority)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="board-content">
          {loading ? (
            <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading board...</div>
          ) : !activeBoard ? (
            <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>No boards found. Create one to get started!</div>
          ) : (
            <>
              {filteredLists.map(list => (
                <Column 
                  key={list._id} 
                  column={list} 
                  onUpdateTitle={handleUpdateColumnTitle}
                  onAddCard={handleOpenNewCardModal}
                  onEditCard={handleOpenEditCardModal}
                  onDropCard={handleDropCard}
                  uiManagerUtils={uiManagerUtils}
                />
              ))}
              <button className="add-column-btn" onClick={handleAddColumn}>
                <span><Plus size={16} /></span> Add Column
              </button>
            </>
          )}
        </div>
      </div>

      <CardModal 
        isOpen={modalState.isOpen}
        initialData={modalState.data}
        onClose={() => setModalState({ isOpen: false, data: null, targetColumnId: null })}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
      />
    </div>
  );
};

export default Board;
