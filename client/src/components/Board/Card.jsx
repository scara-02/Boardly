import React from 'react';
import { Edit2 } from 'lucide-react';

const Card = ({ card, columnId, onEdit, onDragStart, uiManagerUtils }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ cardId: card._id || card.id, sourceColumnId: columnId }));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
    if (onDragStart) onDragStart(card._id || card.id, columnId);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
  };

  return (
    <div 
      className="card" 
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={() => onEdit(columnId, card._id || card.id)}
    >
      <div className={`card-priority-stripe ${card.priority || 'medium'}`}></div>
      
      <div className="card-header">
        <div className="card-title">{card.title}</div>
        <button 
          className="card-edit-btn" 
          title="Edit card"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(columnId, card._id || card.id);
          }}
        >
          <Edit2 size={14} />
        </button>
      </div>

      {card.description && (
        <div className="card-description">{card.description}</div>
      )}

      <div className="card-footer">
        <span className={`card-badge ${card.priority || 'medium'}`}>
          {uiManagerUtils.getPriorityLabel(card.priority || 'medium')}
        </span>
        
        {card.dueDate && (
          <span className={`card-due-date ${uiManagerUtils.isOverdue(card.dueDate) ? 'overdue' : ''}`}>
            📅 {uiManagerUtils.formatDateText(card.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
};

export default Card;
