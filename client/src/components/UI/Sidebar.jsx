import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { KanbanSquare, Plus, LogOut, Settings } from 'lucide-react';

const Sidebar = ({ boards, activeBoardId, onSelectBoard, onCreateBoard, sidebarOpen }) => {
  const { user, tenant, logout } = useAuth();

  if (!sidebarOpen) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <KanbanSquare size={24} color="var(--primary)" />
          <h1>Boardly</h1>
        </div>
      </div>
      
      <div className="sidebar-section">
        <div className="sidebar-section-title">Your Boards</div>
        <ul className="board-list">
          {boards.map(board => (
            <li 
              key={board._id || board.id} 
              className={`board-item ${activeBoardId === (board._id || board.id) ? 'active' : ''}`}
              onClick={() => onSelectBoard(board._id || board.id)}
            >
              {board.title}
            </li>
          ))}
        </ul>
        <button className="add-board-btn" onClick={onCreateBoard}>
          <Plus size={16} /> New Board
        </button>
      </div>

      <div style={{ marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{tenant?.name}</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user?.name} ({user?.role})</p>
        </div>
        <button 
          onClick={logout} 
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            width: '100%', padding: '0.75rem', 
            backgroundColor: 'transparent', border: '1px solid var(--border-color)', 
            color: 'var(--text-primary)', borderRadius: '6px', 
            cursor: 'pointer', transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
