import React, { useState, useEffect } from 'react';

const CardModal = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const isEditing = !!initialData?.id;

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setPriority(initialData?.priority || 'medium');
      
      // Format date for input[type="date"] if it exists
      let formattedDate = '';
      if (initialData?.dueDate) {
        const d = new Date(initialData.dueDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().split('T')[0];
        }
      }
      setDueDate(formattedDate);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null
    });
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => {
      if (e.target.classList.contains('modal-overlay')) onClose();
    }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEditing ? 'Edit Card' : 'New Card'}</h2>
          <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
        </div>
        
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="card-title-input">Title</label>
            <input 
              type="text" 
              id="card-title-input" 
              placeholder="Enter card title..." 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="card-desc-input">Description</label>
            <textarea 
              id="card-desc-input" 
              placeholder="Add a description..." 
              rows="3"
              value={description}
              onChange={e => setDescription(e.target.value)}
            ></textarea>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="card-priority-input">Priority</label>
              <select 
                id="card-priority-input"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🔵 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="card-due-date-input">Due Date</label>
              <input 
                type="date" 
                id="card-due-date-input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="modal-actions">
            {isEditing && (
              <button 
                type="button" 
                className="btn btn-danger" 
                style={{ marginRight: 'auto' }}
                onClick={() => onDelete(initialData.id)}
              >
                🗑️ Delete
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">💾 Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardModal;
