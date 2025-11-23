import type { FC } from 'react';
import { useEffect, useState } from 'react';
import '../components/commander/CommanderHome.css';
import type { SessionUser } from '../types';
import { API_BASE_URL } from '../config';

type Props = {
  user?: SessionUser;
};

const CommanderHome: FC<Props> = ({ user: _user }: Props) => {
  const [disasters, setDisasters] = useState<any[]>([]);
  const [selectedDisasterId, setSelectedDisasterId] = useState<string | null>(null);
  const [selectedDisaster, setSelectedDisaster] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchDisasters = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/disasters`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setDisasters(data || []);
        if (data && data.length > 0) {
          setSelectedDisasterId(data[0].disaster_id || null);
          setSelectedDisaster(data[0]);
        }
      } catch (err) {
        // ignore for now
      }
    };

    const fetchUnits = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/commander/teams`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setUnits(data || []);
      } catch (err) {
        // ignore
      }
    };

    fetchDisasters();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (!selectedDisasterId) return;

    const fetchStatsAndReports = async () => {
      try {
        const [statsRes, reportsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/disasters/${encodeURIComponent(selectedDisasterId)}/stats`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/reports/disasters/${encodeURIComponent(selectedDisasterId)}/reports`, { credentials: 'include' }),
        ]);

        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats(s);
        }

        if (reportsRes.ok) {
          const r = await reportsRes.json();
          setReports(r || []);
          // map recent activity from reports
          setActivities((r || []).slice(0, 5).map((rep: any) => ({ id: rep.report_id, text: `Report v${rep.version_number}`, ago: new Date(rep.generated_at).toLocaleString() })));
        }
      } catch (err) {
        // ignore
      }
    };

    fetchStatsAndReports();
  }, [selectedDisasterId]);

  return (
    <div className="commander-home-root">
      <div className="commander-header">
        <div>
          <h1>Commander Home</h1>
          <p className="subtitle">Overview of active incidents and unit status.</p>
        </div>
      </div>

      <div className="commander-grid">
        <main className="main-col">
          <section className="metrics-row">
            <div className="metric-card">
              <div className="metric-label">Hazard Metrics</div>
              <div className="metric-value high">{selectedDisaster?.severity_level ?? '—'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Population Impact</div>
              <div className="metric-value">{stats?.affected_population_count?.toLocaleString() ?? '—'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Personnel Deployed</div>
              <div className="metric-value">{stats?.personnel_deployed ?? 0}</div>
            </div>
          </section>

          <section className="logged-reports">
            <div className="section-title">Logged Reports</div>
            <div className="filters">
              <select className="select" value={selectedDisasterId ?? ''} onChange={(e) => {
                const id = e.target.value || null;
                setSelectedDisasterId(id);
                const found = disasters.find(d => (d.disaster_id ?? d.disasterId) === id);
                setSelectedDisaster(found || null);
              }}>
                {disasters.map(d => (
                  <option key={d.disaster_id} value={d.disaster_id}>{d.title ?? d.disaster_id}</option>
                ))}
              </select>
              <input className="search" placeholder="Search reports.." />
            </div>

            <div className="reports-list">
              {reports.map((r) => (
                <div key={r.report_id} className="report-item">
                  <div className="report-left">
                    <div className="report-icon">📄</div>
                    <div>
                      <div className="report-title">Report v{r.version_number}</div>
                      <div className="report-location">{new Date(r.generated_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="report-right">
                    <div className="report-time">{r.status}</div>
                    <div className={`status-pill ${r.status.replace(/\s+/g, '-').toLowerCase()}`}>{r.status}</div>
                  </div>
                </div>
              ))}
              {reports.length === 0 && <div className="subtle">No reports available for this disaster.</div>}
            </div>
          </section>
        </main>

        <aside className="side-col">
          <div className="panel">
            <div className="panel-title">Dispatch &amp; Unit Management</div>
            <div className="panel-body">
              <div className="subtle">Available Units</div>
              <ul className="units-list">
                {units.map((u) => (
                  <li key={u.team_id} className="unit-item">
                    <div className="unit-name">{u.name}</div>
                    <div className="unit-status">Status: <span className="status-strong">{u.status}</span></div>
                  </li>
                ))}
              </ul>

              <button className="dispatch-btn">▶ Dispatch Units</button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Recent Activity</div>
            <div className="panel-body activity-list">
              {activities.map((a) => (
                <div key={a.id} className="activity-item">
                  <div className="activity-dot" />
                  <div>
                    <div className="activity-text">{a.text}</div>
                    <div className="activity-time">{a.ago}</div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <div className="subtle">No recent activity.</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CommanderHome;
