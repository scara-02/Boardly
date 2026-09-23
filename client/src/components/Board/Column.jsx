import React, { useState } from 'react';
import Card from './Card';
import { MoreHorizontal, Plus } from 'lucide-react';

const Column = ({ 
  column, 
  onUpdateTitle, 
  onAddCard, 
  onEditCard, 
  onDropCard,
  uiManagerUtils
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [title, setTitle] = useState(column.title);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only remove if we're leaving the column itself, not entering a child element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      
      const data = JSON.parse(dataStr);
      if (data.sourceColumnId !== (column._id || column.id)) {
        onDropCard(data.cardId, data.sourceColumnId, column._id || column.id);
      }
    } catch (err) {
      console.error('Invalid drop data', err);
    }
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== column.title) {
      onUpdateTitle(column._id || column.id, title.trim());
    } else {
      setTitle(column.title);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  return (
    <div 
      className={`column ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <input 
          className="column-title" 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          spellCheck="false"
        />
        <span className="column-count">{column.cards ? column.cards.length : 0}</span>
        <button className="column-menu-btn" title="Column options">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div className="column-cards">
        {column.cards && column.cards.map(card => (
          <Card 
            key={card._id || card.id} 
            card={card} 
            columnId={column._id || column.id} 
            onEdit={onEditCard}
            uiManagerUtils={uiManagerUtils}
          />
        ))}
      </div>

      <div className="column-footer">
        <button className="add-card-btn" onClick={() => onAddCard(column._id || column.id)}>
          <span><Plus size={14} /></span> Add Card
        </button>
      </div>
    </div>
  );
};

export default Column;
