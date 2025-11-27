import type { FC } from "react";
import type { SessionUser } from "../types";
import ChatGroups from "../components/ChatGroups";

type Props = {
  user: SessionUser;
};

const ResponderDashboard: FC<Props> = ({ user }) => {
  return (
    <section className="dashboard dashboard--responder">
      <h2>Responder Dashboard</h2>
      <p className="dashboard-greeting">Welcome, {user.email}.</p>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>My Assigned Groups</h3>
          <p style={{ color: '#718096', fontSize: '0.95rem', marginBottom: '1rem' }}>
            You can view and participate in groups you've been assigned to by your commander.
          </p>
          <ChatGroups userId={user.user_id} />
        </div>

        <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f7fafc', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Triage & Assignments</h3>
          <p style={{ color: '#718096', fontSize: '0.9rem' }}>
            This area will show triage queues, incident reports assigned to you, and resource status.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ResponderDashboard;