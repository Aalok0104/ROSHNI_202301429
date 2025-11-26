import React from 'react';

type Props = {
  title?: string;
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

const ConfirmModal: React.FC<Props> = ({ title = 'Confirm', message = '', onCancel, onConfirm, confirmLabel = 'Yes', cancelLabel = 'No' }) => {
  return (
    <div style={backdropStyle}>
      <div style={modalStyle} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 12 }}>{message}</div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button className="discard-btn" onClick={onCancel}>{cancelLabel}</button>
            <button className="commander-button primary" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 };
const modalStyle: React.CSSProperties = { width: 480, maxWidth: '94%', background: 'var(--panel-bg, #071024)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 18 };

export default ConfirmModal;
