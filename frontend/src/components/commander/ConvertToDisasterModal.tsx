import React, { useState } from 'react';
import { API_BASE_URL } from '../../config';

type Props = {
  incidentId: string;
  onClose: () => void;
  onConverted: (disaster: any) => void;
};

const ConvertToDisasterModal: React.FC<Props> = ({ incidentId, onClose, onConverted }) => {
  const [severity, setSeverity] = useState('medium');
  const [disasterType, setDisasterType] = useState('other');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = { severity_level: severity, disaster_type: disasterType };
      const res = await fetch(`${API_BASE_URL}/disasters/incidents/${encodeURIComponent(incidentId)}/convert`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('Convert failed', res.status, txt);
        alert(`Failed to convert incident: ${txt || res.status}`);
        return;
      }

      const created = await res.json();
      onConverted(created);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to convert incident. See console.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={backdropStyle}>
      <div style={modalStyle} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Convert to Disaster</h3>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">✕</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Severity
            <select value={severity} onChange={e => setSeverity(e.target.value)} style={inputStyle}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label style={{ display: 'block', marginBottom: 8 }}>
            Disaster Type
            <select value={disasterType} onChange={e => setDisasterType(e.target.value)} style={inputStyle}>
              <option value="other">Other</option>
              <option value="fire">Fire</option>
              <option value="flood">Flood</option>
              <option value="accident">Accident</option>
            </select>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button className="discard-btn" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="commander-button primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Converting…' : 'Convert'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', marginTop: 6, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'inherit' };
const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 };
const modalStyle: React.CSSProperties = { width: 520, maxWidth: '94%', background: 'var(--panel-bg, #071024)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 18 };
const closeButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' };

export default ConvertToDisasterModal;
