import type { FC } from "react";
import type { SessionUser } from "../types";
import LeftSidebar from "../components/commander/LeftSidebar";
import MapView from "../components/commander/MapView";
import TaskList from "../components/commander/TaskList";
import "../components/commander/commanderStyles.css";
import { API_BASE_URL } from '../config';

type Props = {
  user: SessionUser;
};

const CommanderDashboard: FC<Props> = ({ user }) => {
  const userId = user.id || user.email || "commander-user";
  const responders = [
    "Responder-07",
    "Responder-12",
    "Responder-19",
    "Medical Team",
    "Supply Convoy",
    "Recon Scout",
  ];

  const handleGenerateReport = () => {
    console.log("Generate report clicked");
  };

  // handleAddTask was removed; use handleAddTaskSubmit for actual submission.

  const handleAddTaskSubmit = async (task: any) => {
    // Convenience integration point: attempt to POST the task to the API.
    // The backend may not expose this endpoint yet — this is where server wiring
    // should be added. We keep the UI optimistic regardless.
    try {
      const url = `${API_BASE_URL}/api/tasks`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(task),
      });
    } catch (err) {
      // swallow errors for now; backend integration point
    }
  };

  return (
    <>
      <div className="commander-main">
        <LeftSidebar userId={userId} responders={responders} onGenerateReport={handleGenerateReport} />
        <MapView />
        <TaskList onAddTaskSubmit={handleAddTaskSubmit} />
      </div>
    </>
  );
};

export default CommanderDashboard;