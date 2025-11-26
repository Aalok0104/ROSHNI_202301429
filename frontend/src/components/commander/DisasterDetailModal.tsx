import React from 'react';

type Incident = {
  incident_id: string;
  title?: string;
  description?: string;
  incident_type?: string;
  reported_at?: string;
  latitude?: number;
  longitude?: number;
};

type Props = {
  incident: Incident;
  onClose: () => void;
  onDiscard: (id: string) => Promise<void> | void;
  onConvert: (id: string) => Promise<void> | void;
};

const DisasterDetailModal: React.FC<Props> = ({ incident, onClose, onDiscard, onConvert }) => {
  return (
    <div style={backdropStyle}>
      <div style={modalStyle} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{incident.title || 'Incident Details'}</h3>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">✕</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}>{incident.incident_type || 'Unknown type'} • {incident.reported_at || ''}</div>

          <div style={{ marginBottom: 12 }}>{incident.description || 'No description provided.'}</div>

          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Location: {incident.latitude ?? 'Unknown'}, {incident.longitude ?? 'Unknown'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <button className="discard-btn" onClick={() => onDiscard(incident.incident_id)}>Discard</button>
            {/* Assign-to-team removed */}
            <button className="commander-button primary" onClick={() => onConvert(incident.incident_id)}>Convert to Disaster</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 };
const modalStyle: React.CSSProperties = { width: 680, maxWidth: '94%', background: 'var(--panel-bg, #071024)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 18 };
const closeButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' };

export default DisasterDetailModal;
