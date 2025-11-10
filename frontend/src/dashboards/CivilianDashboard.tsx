// src/dashboards/CivilianDashboard.tsx
import type { FC } from 'react';
import type { SessionUser } from '../types';

type Props = {
  user: SessionUser;
};

const CivilianDashboard: FC<Props> = ({ user }) => {
  return (
    <section className="dashboard dashboard--civilian">
      <h2>Civilian Dashboard</h2>
      <p className="dashboard-greeting">Welcome, {user.name?.trim() || user.email}.</p>
      <p>This area will show alerts, safe zones, and family status.</p>
    </section>
  );
};

export default CivilianDashboard;
