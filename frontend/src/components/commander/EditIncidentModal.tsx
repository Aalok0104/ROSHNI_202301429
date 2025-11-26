import React, { useState, useEffect } from 'react';

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
  onSave: (id: string, payload: any) => Promise<void> | void;
  onDiscard: (id: string) => Promise<void> | void;
};

const EditIncidentModal: React.FC<Props> = ({ incident, onClose, onSave, onDiscard }) => {
  const [title, setTitle] = useState(incident.title || '');
  const [description, setDescription] = useState(incident.description || '');
  const [incidentType, setIncidentType] = useState(incident.incident_type || '');
  const [latitude, setLatitude] = useState<string>(incident.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState<string>(incident.longitude?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(incident.title || '');
    setDescription(incident.description || '');
    setIncidentType(incident.incident_type || '');
    setLatitude(incident.latitude?.toString() ?? '');
    setLongitude(incident.longitude?.toString() ?? '');
  }, [incident]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        title: title || undefined,
        description: description || undefined,
        incident_type: incidentType || undefined,
      };
      // Only include lat/lon if parseable numbers
      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        payload.latitude = lat;
        payload.longitude = lon;
      }

      await onSave(incident.incident_id, payload);
      onClose();
    } catch (err) {
      console.error('Failed to save incident', err);
      alert('Failed to save incident. See console.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirm('Discard this incident? This cannot be undone.')) return;
    try {
      await onDiscard(incident.incident_id);
      onClose();
    } catch (err) {
      console.error('Failed to discard incident', err);
      alert('Failed to discard incident. See console.');
    }
  };

  return (
    <div style={backdropStyle}>
      <div style={modalStyle} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Edit Incident</h3>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">✕</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <div className="label">Title</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ display: 'block', marginBottom: 8 }}>
            <div className="label">Description</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} />
          </label>

          <label style={{ display: 'block', marginBottom: 8 }}>
            <div className="label">Type</div>
            <input value={incidentType} onChange={(e) => setIncidentType(e.target.value)} style={inputStyle} />
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ flex: 1 }}>
              <div className="label">Latitude</div>
              <input value={latitude} onChange={(e) => setLatitude(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ flex: 1 }}>
              <div className="label">Longitude</div>
              <input value={longitude} onChange={(e) => setLongitude(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button className="discard-btn" onClick={handleDiscard} disabled={saving}>Discard</button>
            <button className="commander-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 };
const modalStyle: React.CSSProperties = { width: 640, maxWidth: '94%', background: 'var(--panel-bg, #071024)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 18 };
const closeButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'inherit' };

export default EditIncidentModal;
