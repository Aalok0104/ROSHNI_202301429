import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as civilianApi from '../api/civilian';
import '../styles.css';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<civilianApi.IncidentReport[]>([]);

  const handleClose = () => {
    if (!user) return navigate('/');
    if (user.role === 'civilian') navigate('/civilian');
    else navigate('/dashboard');
  };

  const handleDownload = () => {
    if (!incidents || incidents.length === 0) {
      globalThis.alert('No reports to download');
      return;
    }
    try {
      const payload = JSON.stringify(incidents, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${user?.username || 'reports'}_incidents.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      globalThis.alert('Unable to download reports');
    }
  };

  useEffect(() => {
    const load = async () => {
      if (user?.id) {
        const list = await civilianApi.getUserIncidents(user.id);
        setIncidents(list);
      }
    };
    load();
  }, [user]);

  if (!user) return null;

  return (
    <div className="civilian-page">
      <div className="civilian-container">
        <div className="civilian-header">
          <div className="header-content">
            <h1 className="page-title">Profile</h1>
            <p className="page-subtitle">Personal details and recent activity</p>
          </div>
          <div>
            <button className="btn-secondary" type="button" onClick={handleClose}>Close</button>
          </div>
        </div>

        <div className="three-column-layout">
          <aside className="left-sidebar">
            <div className="sidebar-box">
              <h3 className="sidebar-title">Account</h3>
              <div className="user-info">
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Permissions:</strong> {user.permissions?.join(', ') || '—'}</p>
              </div>
            </div>
          </aside>

          <main className="center-content">
            <h2 className="content-title">Recent Reports</h2>
            {incidents.length === 0 ? (
              <p>No reports yet. Use the SOS button on the Civilian page to submit an incident.</p>
            ) : (
              <div className="incidents-list">
                {incidents.map((incident) => (
                  <div key={incident.id} className="incident-card">
                    <div className="incident-header">
                      <span className="incident-type">{incident.disasterType}</span>
                      <span className={`incident-severity severity-${incident.severity}`}>{incident.severity}</span>
                    </div>
                    <p className="incident-description">{incident.description}</p>
                    {incident.imageUrl && incident.imageUrl.startsWith('data:') && (
                      <div style={{ marginTop: 8 }}>
                        <img 
                          src={incident.imageUrl} 
                          alt="incident" 
                          style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {incident.audioUrl && incident.audioUrl.startsWith('data:') && (
                      <div style={{ marginTop: 8 }}>
                        <audio controls src={incident.audioUrl} style={{ width: '100%' }}>
                          <track kind="captions" srcLang="en" label="captions" src="" />
                        </audio>
                      </div>
                    )}
                    <div className="incident-footer">
                      <span className="incident-location">📍 {incident.location}</span>
                      <span className="incident-time">{new Date(incident.timestamp || '').toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          <aside className="right-sidebar">
            <div className="sidebar-box resources-box">
              <h3 className="sidebar-title">Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type="button" className="resource-link" onClick={(e) => e.preventDefault()}>Edit profile (placeholder)</button>
                <button type="button" className="resource-link" onClick={handleDownload}>Download my reports</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
