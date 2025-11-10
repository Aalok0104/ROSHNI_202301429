// src/dashboards/ResponderDashboard.tsx
import type { FC } from 'react';
import type { SessionUser } from '../types';

type Props = {
  user: SessionUser;
};

const ResponderDashboard: FC<Props> = ({ user }) => {
  return (
    <section className="dashboard dashboard--responder">
      <h2>Responder Dashboard</h2>
      <p className="dashboard-greeting">Welcome, {user.name?.trim() || user.email}.</p>
      <p>This area will show triage queues, incident reports assigned to you, and resource status.</p>
    </section>
  );
};

export default ResponderDashboard;
