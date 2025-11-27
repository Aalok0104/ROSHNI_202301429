import React from 'react';
import './LogoutConfirmModal.css';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay" onClick={onCancel}>
      <div className="logout-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="logout-modal-title">Confirm Logout</h2>
        <p className="logout-modal-message">Are you sure you want to log out?</p>
        <div className="logout-modal-buttons">
          <button 
            className="logout-modal-button logout-modal-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="logout-modal-button logout-modal-confirm"
            onClick={onConfirm}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
