import React, { useState, useEffect } from 'react';
import './SOSConfirmModal.css';

interface SOSConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const SOSConfirmModal: React.FC<SOSConfirmModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(10);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCancel(); // Auto-close when timer runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="sos-confirm-overlay">
      <div className="sos-confirm-modal">
        <div className="sos-confirm-timer">
          {countdown}
        </div>
        <p className="sos-confirm-message">Choose an action below</p>
        
        <h2 className="sos-confirm-title">Emergency SOS Activated</h2>
        <p className="sos-confirm-question">Would you like to report a disaster emergency?</p>
        
        <div className="sos-confirm-buttons">
          <button 
            className="sos-confirm-button sos-confirm-report"
            onClick={onConfirm}
          >
            🚨 Report Disaster
          </button>
          <button 
            className="sos-confirm-button sos-confirm-dont-report"
            onClick={onCancel}
          >
            Don't Report Disaster
          </button>
        </div>
        
        <p className="sos-confirm-auto-close">
          This dialog will close automatically in {countdown} seconds
        </p>
      </div>
    </div>
  );
};

export default SOSConfirmModal;
