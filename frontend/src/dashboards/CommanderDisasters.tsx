import React, { useEffect, useState } from 'react';
import '../components/commander/commanderStyles.css';
import '../components/commander/CommanderDisasters.css';
import { API_BASE_URL } from '../config';

type Incident = {
  incident_id: string;
  reported_by_user_id?: string;
  title: string;
  description?: string;
  incident_type?: string;
  status?: string;
  reported_at?: string;
  latitude?: number;
  longitude?: number;
};

const CommanderDisasters: React.FC = () => {
  const [disasters, setDisasters] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/incidents`, { credentials: 'include' });
        if (!res.ok) {
          setDisasters([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setDisasters(data || []);
      } catch (err) {
        setDisasters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, []);

  const handleDiscard = async (incidentId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/${encodeURIComponent(incidentId)}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'discarded' }),
      });

      if (res.ok) {
        setDisasters((prev: Incident[]) => prev.filter((d: Incident) => d.incident_id !== incidentId));
      } else {
        console.warn('Failed to discard incident', await res.text());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToDisaster = async (incidentId: string) => {
    const severity = window.prompt('Severity level (low, medium, high, critical)', 'medium') || 'medium';
    const type = window.prompt('Disaster type (fire, flood, accident, other)', 'other') || 'other';

    try {
      const res = await fetch(`${API_BASE_URL}/incidents/${encodeURIComponent(incidentId)}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'converted', severity_level: severity, disaster_type: type }),
      });

      if (res.ok) {
        const json = await res.json();
        // remove the incident from the list
        setDisasters((prev: Incident[]) => prev.filter((d: Incident) => d.incident_id !== incidentId));
        alert(`Converted to disaster ${json.disaster_id || ''}`);
      } else {
        console.warn('Failed to convert incident', await res.text());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclareEmergency = async () => {
    if (!confirm('Declare a civilian emergency? This will create an SOS incident.')) return;

    try {
      // minimal SOS payload: use 0,0 coordinates if none available
      const payload = { latitude: 0.0, longitude: 0.0, incident_type: 'sos' };
      const res = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        // prepend to list
        setDisasters((prev: Incident[]) => [created, ...prev]);
      } else {
        console.warn('Failed to declare emergency', await res.text());
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="commander-shell">
      <div style={{ padding: '1.5rem 1.5rem 0.5rem 1.5rem' }}>
        <div className="disasters-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px',fontWeight:'800' }}>Disasters</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>Manage and assign all reported incidents.</p>
          </div>

          <div>
            <button className="commander-button emergency" title="Declare Civilian Emergency" onClick={handleDeclareEmergency}>Declare Civilian Emergency</button>
          </div>
        </div>
      </div>

      <div className="commander-main" style={{ paddingTop: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
            <div className="panel-title">Reported Incidents</div>
            <div className="panel-body">
              {loading && <div className="subtle">Loading incidents...</div>}

              {!loading && disasters.length === 0 && (
                <div className="subtle">No reported incidents at the moment.</div>
              )}

              <ul className="incidents-list">
                {disasters.map((d) => (
                  <li key={d.incident_id} className="incident-item">
                    <div className="incident-left">
                      <div className="incident-icon">{d.incident_type === 'fire' ? '🔥' : d.incident_type === 'power' ? '⚡' : '📍'}</div>
                      <div className="incident-text">
                        <div className="incident-title">{d.title}</div>
                        <div className="incident-sub">{d.description || `${d.latitude ?? 'Unknown'}, ${d.longitude ?? ''}`}</div>
                      </div>
                    </div>

                    <div className="incident-actions">
                      <button className="discard-btn" onClick={() => handleDiscard(d.incident_id)}>Discard</button>
                      <button className="commander-button primary" onClick={() => handleConvertToDisaster(d.incident_id)}>Assign to Team</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right column intentionally left empty to keep layout consistent with dashboard.
          Reduced width to give the main incidents panel more room. */}
        <div style={{ width: 700 }} />
      </div>
    </div>
  );
};

export default CommanderDisasters;
