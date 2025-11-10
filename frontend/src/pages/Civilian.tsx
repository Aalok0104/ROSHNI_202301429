// src/pages/Civilian.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import EmergencyReportForm from '../components/EmergencyReportForm';
import roshniLogo from '../assets/react.svg';
import * as civilianApi from '../api/civilian';
import '../styles.css';

export default function Civilian() {
  const { user } = useAuth();
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [myIncidents, setMyIncidents] = useState<civilianApi.IncidentReport[]>([]);
  const [alertIndex, setAlertIndex] = useState(0);

  const emergencyAlerts = [
    '🌊 Tsunami Warning for Coastal Regions - Seek Higher Ground Immediately',
    '🔥 Fire Alert: Wildfires reported in Northern Districts - Evacuate if instructed',
    '☎️ National Emergency Helpline: 1-888-HELP-NOW',
    '⚠️ Cyclone Alert: Stay indoors and secure windows and doors',
  ];

  useEffect(() => {
    // slower alert rotation for readability
    const interval = setInterval(() => {
      setAlertIndex((prev) => (prev + 1) % emergencyAlerts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [emergencyAlerts.length]);

  useEffect(() => {
    if (user?.id) {
      loadMyIncidents();
    }
  }, [user]);

  const loadMyIncidents = async () => {
    if (user?.id) {
      const incidents = await civilianApi.getUserIncidents(user.id);
      setMyIncidents(incidents);
    }
  };

  const handleEmergencyReportSuccess = () => {
    loadMyIncidents();
  };

  return (
    <div className="civilian-page">
      {/* Alert Banner */}
      <div className="alert-banner">
        <div className="alert-content">
          <span className="alert-icon">🚨</span>
          <span className="alert-text">{emergencyAlerts[alertIndex]}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="civilian-container">
        {/* Header with SOS Button */}
        <div className="civilian-header">
          <div className="header-content">
            <h1 className="page-title">Citizen Emergency Portal</h1>
            <p className="page-subtitle">Report emergencies and get guidance</p>
          </div>
          <button
            className="sos-button"
            onClick={() => setShowEmergencyForm(true)}
            aria-label="Emergency SOS Button"
          >
            <span className="sos-icon">🚨</span>
            <span className="sos-text">EMERGENCY SOS</span>
          </button>
        </div>

        {/* Three Column Layout */}
        <div className="three-column-layout">
          {/* Left Sidebar - Navigation/Index */}
          <aside className="left-sidebar">
            <div className="sidebar-box">
              <h3 className="sidebar-title">📋 Quick Navigation</h3>
                <nav className="sidebar-nav">
                  <a href="#before-disaster" className="nav-link active">Before a Disaster</a>
                  <a href="#during-emergency" className="nav-link">During an Emergency</a>
                  <a href="#after-disaster" className="nav-link">After a Disaster</a>
                  <a href="#my-reports" className="nav-link">My Reports ({myIncidents.length})</a>
                  <a href="#contacts" className="nav-link">Emergency Contacts</a>
                  <a href="#alerts" className="nav-link">Active Alerts</a>
                </nav>
            </div>
          </aside>

          {/* Center Content - Guidelines */}
          <main className="center-content">
            <div className="content-box" id="guidelines">
              <h2 className="content-title">🛡️ Disaster Preparedness Guidelines</h2>
              
              <div className="guideline-section" id="before-disaster">
                <h3 className="guideline-heading">BEFORE A DISASTER</h3>
                <ul className="guideline-list">
                  <li>Prepare an emergency kit with essential supplies (water, food, first aid)</li>
                  <li>Know your evacuation routes and assembly points</li>
                  <li>Keep important documents in waterproof containers</li>
                  <li>Maintain a list of emergency contacts</li>
                  <li>Have a family emergency communication plan</li>
                </ul>
              </div>

              <div className="guideline-section" id="during-emergency">
                <h3 className="guideline-heading">DURING AN EMERGENCY</h3>
                <ul className="guideline-list">
                  <li>Stay calm and assess the situation</li>
                  <li>Follow instructions from local authorities</li>
                  <li>Use the SOS button above to report emergencies immediately</li>
                  <li>Move to safe locations as directed</li>
                  <li>Help others if it's safe to do so</li>
                  <li>Avoid using phone lines unless absolutely necessary</li>
                </ul>
              </div>

              <div className="guideline-section" id="after-disaster">
                <h3 className="guideline-heading">AFTER A DISASTER</h3>
                <ul className="guideline-list">
                  <li>Check for injuries and provide first aid</li>
                  <li>Inspect your home for damage before entering</li>
                  <li>Listen to emergency broadcasts for updates</li>
                  <li>Document damage for insurance claims</li>
                  <li>Avoid disaster areas unless requested by authorities</li>
                  <li>Report incidents using our emergency reporting system</li>
                </ul>
              </div>

              {/* My Incident Reports */}
              {myIncidents.length > 0 && (
                <div className="guideline-section" id="my-reports">
                  <h3 className="guideline-heading">📝 My Recent Reports</h3>
                  <div className="incidents-list">
                    {myIncidents.slice(0, 3).map((incident) => (
                      <div key={incident.id} className="incident-card">
                        <div className="incident-header">
                          <span className="incident-type">{incident.disasterType}</span>
                          <span className={`incident-severity severity-${incident.severity}`}>
                            {incident.severity}
                          </span>
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
                          <span className="incident-time">
                            {new Date(incident.timestamp || '').toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Right Sidebar - Additional Resources */}
          <aside className="right-sidebar">
            <div className="sidebar-box resources-box">
              <h3 className="sidebar-title">📞 Emergency Contacts</h3>
              <div className="contact-list">
                <div className="contact-item">
                  <span className="contact-label">National Emergency</span>
                  <span className="contact-number">112</span>
                </div>
                <div className="contact-item">
                  <span className="contact-label">Police</span>
                  <span className="contact-number">100</span>
                </div>
                <div className="contact-item">
                  <span className="contact-label">Fire</span>
                  <span className="contact-number">101</span>
                </div>
                <div className="contact-item">
                  <span className="contact-label">Ambulance</span>
                  <span className="contact-number">102</span>
                </div>
                <div className="contact-item">
                  <span className="contact-label">Disaster Helpline</span>
                  <span className="contact-number">1070</span>
                </div>
              </div>
            </div>

            {/* Resources box removed as requested */}

            {/* User info box removed: profile page now holds user details */}
          </aside>
        </div>
      </div>

      {/* Emergency Report Modal */}
      {showEmergencyForm && (
        <EmergencyReportForm
          onClose={() => setShowEmergencyForm(false)}
          onSuccess={handleEmergencyReportSuccess}
        />
      )}
    </div>
  );
}
