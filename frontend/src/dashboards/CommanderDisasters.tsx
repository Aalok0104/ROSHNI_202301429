import React, { useEffect, useState } from 'react';
import '../components/commander/commanderStyles.css';
import '../components/commander/CommanderDisasters.css';
import { API_BASE_URL } from '../config';
// Team assignment flow removed per request
import DeclareEmergencyModal from '../components/commander/DeclareEmergencyModal';
import DisasterDetailModal from '../components/commander/DisasterDetailModal';
import EditIncidentModal from '../components/commander/EditIncidentModal';
import ConvertToDisasterModal from '../components/commander/ConvertToDisasterModal';
import ConfirmModal from '../components/commander/ConfirmModal';
import GenerateReportModal from '../components/commander/GenerateReportModal';
import { useTheme } from '../contexts/ThemeContext';
import type { SessionUser } from '../types';

type Props = {
  user: SessionUser;
};

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

type Disaster = {
  disaster_id: string;
  title?: string;
  description?: string;
  disaster_type?: string;
  status?: string;
  severity_level?: string;
  latitude?: number;
  longitude?: number;
};

const COOKIE_NAME = 'commander_disaster_id';

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^|\\s)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

function setSessionCookie(name: string, value: string) {
  // session cookie (no expires) scoped to site root
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

const CommanderDisasters: React.FC<Props> = ({ user }) => {
  const { theme } = useTheme();
  const [disasters, setDisasters] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [disastersLoading, setDisastersLoading] = useState(true);
  const [reportedDisasters, setReportedDisasters] = useState<Disaster[]>([]);
  // assign-team state removed
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [endDisasterId, setEndDisasterId] = useState<string | null>(null);
  const [showGenerateReport, setShowGenerateReport] = useState(false);
  const [commanderActiveDisasterId, setCommanderActiveDisasterId] = useState<string | null>(() => {
    try {
      return readCookie(COOKIE_NAME);
    } catch {
      return null;
    }
  });

  // Reusable incidents fetch so parent can refresh after creates
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/incidents`, { credentials: 'include' });
      if (!res.ok) {
        setDisasters([]);
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

  useEffect(() => {
    // fetchIncidents is declared above so it can be reused elsewhere
    const fetchDisasters = async () => {
      try {
        setDisastersLoading(true);
        const res = await fetch(`${API_BASE_URL}/disasters`, { credentials: 'include' });
        if (!res.ok) {
          setReportedDisasters([]);
          return;
        }
        const data = await res.json();
        setReportedDisasters(data || []);
      } catch (err) {
        setReportedDisasters([]);
      } finally {
        setDisastersLoading(false);
      }
    };

    fetchIncidents();
    fetchDisasters();
  }, []);

  // helper to refresh disasters list (used after closing/creating)
  const refreshDisasters = async () => {
    try {
      setDisastersLoading(true);
      const res = await fetch(`${API_BASE_URL}/disasters`, { credentials: 'include' });
      if (!res.ok) {
        setReportedDisasters([]);
        return;
      }
      const data = await res.json();
      setReportedDisasters(data || []);
    } catch (err) {
      setReportedDisasters([]);
    } finally {
      setDisastersLoading(false);
    }
  };

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
    // prevent conversion if commander already has an active disaster
    if (commanderActiveDisasterId) {
      alert('You already have an active disaster. End it before converting another incident.');
      return;
    }

    // open modal
    setConvertIncidentId(incidentId);
    setShowConvertModal(true);
  };

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertIncidentId, setConvertIncidentId] = useState<string | null>(null);

  const handleConverted = (created: any) => {
    // remove source incident if present
    if (created && created.disaster_id) {
      setDisasters((prev: Incident[]) => prev.filter((d: Incident) => d.incident_id !== convertIncidentId));
      setReportedDisasters((prev: Disaster[]) => [created, ...(prev || [])]);
    }
    setShowConvertModal(false);
    setConvertIncidentId(null);
    // set a session cookie to mark this commander as owning an active disaster
    try {
      if (created && created.disaster_id) {
        setSessionCookie(COOKIE_NAME, created.disaster_id);
        setCommanderActiveDisasterId(created.disaster_id);
      }
    } catch (e) {
      // ignore cookie errors
    }
  };

  const handleEndDisasterConfirm = async () => {
    if (!endDisasterId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/disasters/${encodeURIComponent(endDisasterId)}/close`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Failed to close disaster', res.status, txt);
        alert(`Failed to close disaster: ${txt || res.status}`);
        return;
      }
      // refresh list and show generate report option
      await refreshDisasters();
      setShowConfirmEnd(false);
      setShowGenerateReport(true);
      // if this commander had the same active cookie, delete it so they can convert again
      try {
        const current = readCookie(COOKIE_NAME);
        if (current && current === endDisasterId) {
          deleteCookie(COOKIE_NAME);
          setCommanderActiveDisasterId(null);
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error(err);
      alert('Failed to close disaster. See console.');
    }
  };

  const handleReportGenerated = (report: any) => {
    // optionally do something with the report, for now just notify and close modal
    console.log('Report generated', report);
    alert('Report draft created');
    setShowGenerateReport(false);
    setEndDisasterId(null);
  };

  // assign-team handler removed

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

  // assign-team handler removed

  // assign-team functionality removed

  const handleDeclareEmergency = async () => {
    // Open the declare emergency modal for commander input
    setShowDeclareModal(true);
  };

  const handleCreatedIncident = (created: any) => {
    (async () => {
      if (created && created.incident_id) {
        setDisasters((prev: Incident[]) => [created, ...prev]);
      } else {
        // no created object provided: re-fetch incidents from API
        await fetchIncidents();
      }
      setShowDeclareModal(false);
    })();
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editIncident, setEditIncident] = useState<Incident | null>(null);

  const handleSaveIncident = async (incidentId: string, payload: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/${encodeURIComponent(incidentId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Failed to update incident', res.status, txt);
        alert(`Failed to update incident: ${txt || res.status}`);
        return;
      }
      const updated = await res.json();
      setDisasters((prev: Incident[]) => prev.map((it) => it.incident_id === incidentId ? updated : it));
    } catch (err) {
      console.error(err);
      alert('Failed to update incident. See console.');
    }
  };

  const handleDiscardFromEdit = async (incidentId: string) => {
    await handleDiscard(incidentId);
  };

  const renderSeverity = (severity: string | undefined) => {
    const level = (severity || 'low').toLowerCase();

    if (level === 'critical') {
      return (
        <div className="severity-dots" title="Critical Severity">
          <span className="dot black"></span>
          <span className="dot black"></span>
          <span className="dot black"></span>
          <span className="dot black"></span>
        </div>
      );
    }
    if (level === 'high') {
      return (
        <div className="severity-dots" title="High Severity">
          <span className="dot red"></span>
          <span className="dot red"></span>
          <span className="dot red"></span>
        </div>
      );
    }
    if (level === 'medium') {
      return (
        <div className="severity-dots" title="Medium Severity">
          <span className="dot yellow"></span>
          <span className="dot yellow"></span>
        </div>
      );
    }
    // Low or unknown
    return (
      <div className="severity-dots" title="Low Severity">
        <span className="dot green"></span>
      </div>
    );
  };

  return (
    <div className={`commander-shell ${theme === 'light' ? 'light-mode' : 'dark-mode'}`} style={{ background: theme === 'light' ? '#f8fafc' : 'var(--commander-bg)' }}>
      <div style={{ padding: '1.5rem 1.5rem 0.5rem 1.5rem' }}>
        <div className="disasters-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: theme === 'light' ? '#0f172a' : '#f8fafc' }}>Disasters</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>Manage and assign all reported incidents.</p>
          </div>

          <div>
            <button className="commander-button emergency declare-civilian-emergency" title="Declare Civilian Emergency" onClick={handleDeclareEmergency}>Declare Civilian Emergency</button>
          </div>
        </div>
      </div>

      <div className="commander-main" style={{ paddingTop: '1rem', background: 'transparent' }}>
        <div style={{ flex: 1 }}>
          <div className="commander-panel" style={{ padding: '0', overflow: 'hidden', background: theme === 'light' ? '#ffffff' : 'var(--panel-bg)', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid var(--border-color)', width: '100%', minWidth: '0', display: 'block' }}>
            <div className="panel-title" style={{ padding: '1rem', borderBottom: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.05)', fontWeight: 600, color: theme === 'light' ? '#0f172a' : '#f8fafc' }}>Reported Incidents</div>
            <div className="panel-body" style={{ padding: '1rem' }}>
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
                      <button className="commander-button" onClick={() => { setDetailIncident(d); setShowDetailModal(true); }}>View</button>
                      <button className="commander-button" onClick={() => { setEditIncident(d); setShowEditModal(true); }}>Edit</button>
                      <button
                        className="commander-button"
                        onClick={() => handleConvertToDisaster(d.incident_id)}
                        disabled={!!commanderActiveDisasterId}
                        title={commanderActiveDisasterId ? 'You already have an active disaster. End it before converting another incident.' : 'Convert to Disaster'}
                      >
                        Convert to Disaster
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        {/* Reported Disasters column */}
        <div style={{ width: 700 }}>
          <div className="commander-panel" style={{ marginLeft: 12, padding: '0', overflow: 'hidden', background: theme === 'light' ? '#ffffff' : 'var(--panel-bg)', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid var(--border-color)', width: '100%', minWidth: '0', display: 'block' }}>
            <div className="panel-title" style={{ padding: '1rem', borderBottom: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.05)', fontWeight: 600, color: theme === 'light' ? '#0f172a' : '#f8fafc' }}>Reported Disasters</div>
            <div className="panel-body" style={{ padding: '1rem' }}>
              {disastersLoading && <div className="subtle">Loading disasters...</div>}
              {!disastersLoading && reportedDisasters.length === 0 && (
                <div className="subtle">No active disasters.</div>
              )}

              <ul className="incidents-list">
                {reportedDisasters.map((d: Disaster) => (
                  <li key={d.disaster_id} className="incident-item">
                    <div className="incident-left" style={{ cursor: 'default' }}>
                      <div className="incident-icon">🚨</div>
                      <div className="incident-text">
                        <div className="incident-title">{d.title || 'Untitled Disaster'}</div>
                        <div className="incident-sub">{d.description || `${d.latitude ?? 'Unknown'}, ${d.longitude ?? ''}`}</div>
                      </div>
                    </div>
                    <div className="incident-actions">
                      {renderSeverity(d.severity_level)}
                      <button className="commander-button emergency" onClick={() => { setEndDisasterId(d.disaster_id); setShowConfirmEnd(true); }}>End Disaster</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {/* Assign modal removed */}
      {showDeclareModal && (
        <DeclareEmergencyModal
          onClose={() => setShowDeclareModal(false)}
          onCreated={handleCreatedIncident}
        />
      )}
      {showConvertModal && convertIncidentId && (
        <ConvertToDisasterModal
          incidentId={convertIncidentId}
          onClose={() => { setShowConvertModal(false); setConvertIncidentId(null); }}
          onConverted={handleConverted}
          commanderId={user?.user_id}
        />
      )}

      {showConfirmEnd && endDisasterId && (
        <ConfirmModal
          title="End Disaster"
          message="Are you sure you want to end this disaster?"
          onCancel={() => { setShowConfirmEnd(false); setEndDisasterId(null); }}
          onConfirm={handleEndDisasterConfirm}
          confirmLabel="Yes"
          cancelLabel="No"
        />
      )}

      {showGenerateReport && endDisasterId && (
        <GenerateReportModal
          disasterId={endDisasterId}
          onClose={() => { setShowGenerateReport(false); setEndDisasterId(null); }}
          onGenerated={handleReportGenerated}
        />
      )}


      {showDetailModal && detailIncident && (
        <DisasterDetailModal
          incident={detailIncident}
          onClose={handleCloseDetail}
          onDiscard={() => handleDiscardFromModal(detailIncident.incident_id)}
          onConvert={() => handleConvertFromModal(detailIncident.incident_id)}
        />
      )}
      {showEditModal && editIncident && (
        <EditIncidentModal
          incident={editIncident}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveIncident}
          onDiscard={handleDiscardFromEdit}
        />
      )}
    </div>
  );
};

export default CommanderDisasters;

