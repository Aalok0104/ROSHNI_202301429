// src/dashboards/CommanderDashboard.tsx
import type { FC } from 'react';
import type { SessionUser } from '../types';

type Props = {
  user: SessionUser;
};

const CommanderDashboard: FC<Props> = ({ user }) => {
  return (
    <section className="dashboard dashboard--commander">
      <h2>Commander Dashboard</h2>
      <p className="dashboard-greeting">Welcome, {user.name?.trim() || user.email}.</p>
      <p>This area will show a map of incidents, team deployments, and alerts being drafted or sent.</p>
    </section>
  );
};

export default CommanderDashboard;
