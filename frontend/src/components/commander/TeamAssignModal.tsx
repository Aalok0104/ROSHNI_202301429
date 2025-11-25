import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';

type Team = {
  team_id: string;
  name: string;
  team_type: string;
  status: string;
  member_count: number;
};

type Props = {
  incidentId: string;
  onClose: () => void;
  onAssign: (teamId: string) => Promise<void> | void;
};

const TeamAssignModal: React.FC<Props> = ({ onClose, onAssign }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchTeams = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/commander/teams`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load teams');
        const data = await res.json();
        if (!mounted) return;
        setTeams(data || []);
      } catch (err) {
        if (!mounted) return;
        setError('Unable to load teams');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTeams();
    return () => { mounted = false; };
  }, []);

  const handleAssign = async () => {
    if (!selectedTeam) {
      alert('Please select a team to assign');
      return;
    }

    try {
      await onAssign(selectedTeam);
    } catch (err) {
      console.error(err);
      alert('Failed to assign team');
      return;
    }

    onClose();
  };

  return (
    <div style={backdropStyle}>
      <div style={modalStyle} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Assign Team</h3>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">✕</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '6px 0 12px', color: 'var(--text-muted)' }}>Select an available team to assign to this incident.</p>

          {loading && <div>Loading teams…</div>}
          {error && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</div>}

          {!loading && teams.length === 0 && <div className="subtle">No teams available</div>}

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflow: 'auto' }}>
            {teams.map(t => (
              <li key={t.team_id} style={teamRowStyle} onClick={() => setSelectedTeam(t.team_id)}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 4, background: t.status === 'available' ? '#34d399' : '#9ca3af' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.team_type} • {t.member_count} members</div>
                  </div>
                </div>

                <div>
                  <input type="radio" name="assign-team" checked={selectedTeam === t.team_id} readOnly />
                </div>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button className="discard-btn" onClick={onClose}>Cancel</button>
            <button className="commander-button primary" onClick={handleAssign}>Assign</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1200,
};

const modalStyle: React.CSSProperties = {
  width: 680,
  maxWidth: '94%',
  background: 'var(--panel-bg, #071024)',
  border: '1px solid rgba(255,255,255,0.04)',
  borderRadius: 12,
  padding: 18,
  boxShadow: '0 16px 40px rgba(2,6,23,0.6)',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: 18,
  cursor: 'pointer'
};

const teamRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.01)',
  cursor: 'pointer'
};

export default TeamAssignModal;
