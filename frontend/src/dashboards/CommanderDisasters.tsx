import React, { useEffect, useState } from 'react';
import '../components/commander/commanderStyles.css';
import '../components/commander/CommanderDisasters.css';
import { API_BASE_URL } from '../config';
import TeamAssignModal from '../components/commander/TeamAssignModal';
import DeclareEmergencyModal from '../components/commander/DeclareEmergencyModal';
import DisasterDetailModal from '../components/commander/DisasterDetailModal';

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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null);

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

  const handleOpenAssign = (incidentId: string) => {
    setActiveIncidentId(incidentId);
    setShowAssignModal(true);
  };

  const handleOpenDetail = (incident: Incident) => {
    setDetailIncident(incident);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setDetailIncident(null);
    setShowDetailModal(false);
  };

  const handleDiscardFromModal = async (incidentId: string) => {
    await handleDiscard(incidentId);
    handleCloseDetail();
  };

  const handleConvertFromModal = async (incidentId: string) => {
    await handleConvertToDisaster(incidentId);
    handleCloseDetail();
  };

  const handleOpenAssignFromDetail = (incidentId: string) => {
    // close detail and open assign modal for same incident
    setShowDetailModal(false);
    setActiveIncidentId(incidentId);
    setShowAssignModal(true);
  };

  const handleAssignTeam = async (teamId: string) => {
    // For now we just notify and close the modal. Integrating with task/disaster
    // assignment endpoints requires additional context (task or disaster id).
    // Keep this as a hook where real assignment logic can be added later.
    console.log('Assigning team', teamId, 'to incident', activeIncidentId);
    // Optionally: call backend here if you have an endpoint to assign directly.
    alert(`Team assigned (local): ${teamId}`);
  };

  const handleDeclareEmergency = async () => {
    // Open the declare emergency modal for commander input
    setShowDeclareModal(true);
  };

  const handleCreatedIncident = (created: any) => {
    setDisasters((prev: Incident[]) => [created, ...prev]);
    setShowDeclareModal(false);
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
                    <div className="incident-left" onClick={() => handleOpenDetail(d)} style={{ cursor: 'pointer' }}>
                      <div className="incident-icon">{d.incident_type === 'fire' ? '🔥' : d.incident_type === 'power' ? '⚡' : '📍'}</div>
                      <div className="incident-text">
                        <div className="incident-title">{d.title}</div>
                        <div className="incident-sub">{d.description || `${d.latitude ?? 'Unknown'}, ${d.longitude ?? ''}`}</div>
                      </div>
                    </div>

                    <div className="incident-actions">
                      <button className="discard-btn" onClick={() => handleDiscard(d.incident_id)}>Discard</button>
                      <button className="commander-button" onClick={() => handleConvertToDisaster(d.incident_id)}>Convert to Disaster</button>
                      <button className="commander-button primary" onClick={() => handleOpenAssign(d.incident_id)}>Assign to Team</button>
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
      {showAssignModal && activeIncidentId && (
        <TeamAssignModal
          incidentId={activeIncidentId}
          onClose={() => { setShowAssignModal(false); setActiveIncidentId(null); }}
          onAssign={handleAssignTeam}
        />
      )}
      {showDeclareModal && (
        <DeclareEmergencyModal
          onClose={() => setShowDeclareModal(false)}
          onCreated={handleCreatedIncident}
        />
      )}
      

      {showDetailModal && detailIncident && (
        <DisasterDetailModal
          incident={detailIncident}
          onClose={handleCloseDetail}
          onDiscard={() => handleDiscardFromModal(detailIncident.incident_id)}
          onConvert={() => handleConvertFromModal(detailIncident.incident_id)}
          onOpenAssign={() => handleOpenAssignFromDetail(detailIncident.incident_id)}
        />
      )}
    </div>
  );
};

export default CommanderDisasters;
