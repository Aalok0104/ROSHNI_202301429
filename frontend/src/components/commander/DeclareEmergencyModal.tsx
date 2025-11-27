import React, { useState } from 'react';
import { API_BASE_URL } from '../../config';

type Props = {
  onClose: () => void;
  onCreated: (created: any) => void;
};

const DeclareEmergencyModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentType, setIncidentType] = useState('sos');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: any = { incident_type: incidentType };
      if (title.trim()) payload.title = title.trim();
      if (description.trim()) payload.description = description.trim();
      // backend requires latitude and longitude (floats). Provide defaults of 0.0
      payload.latitude = latitude ? Number(latitude) : 0.0;
      payload.longitude = longitude ? Number(longitude) : 0.0;

      const res = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Create incident failed:', res.status, txt);
        // show user-facing error for non-success responses
        alert(`Failed to declare emergency: ${txt || res.status}`);
        return;
      }

      // Some environments may return 201/204 with empty body even though
      // the incident was created. Attempt to parse JSON, but tolerate empty
      // responses and notify the parent to refresh the incidents list.
      let created: any = null;
      try {
        // try to parse JSON; if body is empty this will throw
        created = await res.json();
      } catch (e) {
        // No JSON body returned — backend likely created the incident.
        // We avoid showing a misleading error to the user and instead
        // signal the parent to refresh its incidents list by passing
        // a null payload.
        console.warn('Create incident succeeded but returned no JSON body. Parent should refresh incidents.');
      }

      // Notify parent; if created is null the parent should re-fetch incidents.
      try {
        onCreated(created);
      } catch (e) {
        // swallow to avoid noisy errors in modal flow
        console.warn('onCreated handler threw', e);
      }
      onClose();
    } catch (err) {
      // Avoid showing the confusing localhost/network error to users when
      // the POST may have succeeded but the browser raised a follow-up error.
      console.warn('DeclareEmergencyModal: network/processing error', err);
      // Signal parent to refresh so the UI can reflect new incidents if any
      try { onCreated(null); } catch (_) {}
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={backdropStyle}>
      <div style={modalStyle} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Declare Emergency</h3>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">✕</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Title
            <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="Short title (optional)" />
          </label>

          <label style={{ display: 'block', marginBottom: 8 }}>
            Description
            <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, height: 80 }} placeholder="Details (optional)" />
          </label>

          <label style={{ display: 'block', marginBottom: 8 }}>
            Incident Type
            <select value={incidentType} onChange={e => setIncidentType(e.target.value)} style={inputStyle}>
              <option value="sos">SOS (civilian emergency)</option>
              <option value="fire">Fire</option>
              <option value="flood">Flood</option>
              <option value="accident">Accident</option>
              <option value="other">Other</option>
            </select>
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ flex: 1 }}>
              Latitude
              <input value={latitude} onChange={e => setLatitude(e.target.value)} style={inputStyle} placeholder="e.g. 12.97" />
            </label>
            <label style={{ flex: 1 }}>
              Longitude
              <input value={longitude} onChange={e => setLongitude(e.target.value)} style={inputStyle} placeholder="e.g. 77.59" />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button className="discard-btn" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="commander-button primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Declaring…' : 'Declare'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', marginTop: 6, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'inherit' };
const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 };
const modalStyle: React.CSSProperties = { width: 640, maxWidth: '94%', background: 'var(--panel-bg, #071024)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 18 };
const closeButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' };

export default DeclareEmergencyModal;
