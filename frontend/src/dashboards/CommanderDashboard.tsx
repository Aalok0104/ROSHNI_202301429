import { FC, useState } from "react";
import type { SessionUser } from "../types";
import GroupManager from "../components/GroupManager";
import ChatGroups from "../components/ChatGroups";

type Props = {
  user: SessionUser;
};

const CommanderDashboard: FC<Props> = ({ user }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleGroupCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <section className="dashboard dashboard--commander">
      <h2>Commander Dashboard</h2>
      <p className="dashboard-greeting">Welcome, {user.name?.trim() || user.email}.</p>

      <div style={{ marginTop: '2rem' }}>
        <GroupManager onGroupCreated={handleGroupCreated} />
        
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Response Team Communications</h3>
          <ChatGroups userId={user.id || ''} refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </section>
  );
};

export default CommanderDashboard;