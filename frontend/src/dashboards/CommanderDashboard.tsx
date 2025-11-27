import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import type { SessionUser } from "../types";
import LeftSidebar from "../components/commander/LeftSidebar";
import MapView from "../components/commander/MapView";
import TaskList from "../components/commander/TaskList";
import type { Task } from "../components/commander/TaskCard";
import "../components/commander/commanderStyles.css";
import { API_BASE_URL } from '../config';

type Props = {
  user: SessionUser;
};

const CommanderDashboard: FC<Props> = ({ user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [mapClickCallback, setMapClickCallback] = useState<((lat: number, lng: number) => void) | null>(null);
  const userId = user.user_id || user.email || "commander-user";

  const responders = [
    "Responder-07",
    "Responder-12",
    "Responder-19",
    "Medical Team",
    "Supply Convoy",
    "Recon Scout",
  ];

  const getDisasterIdFromLocation = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('disasterId');
    } catch {
      return null;
    }
  };

  const handleGenerateReport = () => {
    console.log("Generate report clicked");
  };

  // handleAddTask was removed; use handleAddTaskSubmit for actual submission.
  const fetchTasks = useCallback(async () => {
    const disasterId = getDisasterIdFromLocation();
    if (!disasterId) {
      return;
    }

    try {
      const url = `${API_BASE_URL}/disasters/${encodeURIComponent(disasterId)}/tasks`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const mappedTasks: Task[] = (data || []).map((item: any) => ({
        taskId: item.task_id,
        disasterId: item.disaster_id,
        taskType: item.task_type,
        description: item.description,
        priority: item.priority,
        status: item.status,
        latitude: item.latitude,
        longitude: item.longitude,
        createdAt: item.created_at,
        assignments: (item.assignments || []).map((a: any) => ({
          teamId: a.team_id,
          teamName: a.team_name,
          status: a.status,
          eta: a.eta,
          arrivedAt: a.arrived_at,
        })),
      }));

      setTasks(mappedTasks);
    } catch (err) {
      // swallow errors for now; backend integration point
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    fetchTasks();
    const intervalId = window.setInterval(fetchTasks, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchTasks]);

  const handleAddTaskSubmit = async (task: Task) => {
    // Convenience integration point: attempt to POST the task to the API.
    // The backend may not expose this endpoint yet — this is where server wiring
    // should be added. We keep the UI optimistic regardless.
    try {
      const disasterId = getDisasterIdFromLocation();
      if (!disasterId) {
        console.warn('No disasterId specified in URL; skipping backend task creation');
        return;
      }

      const url = `${API_BASE_URL}/disasters/${encodeURIComponent(disasterId)}/tasks`;
      const payload = {
        task_type: task.taskType,
        description: task.description,
        priority: task.priority,
        latitude: task.latitude,
        longitude: task.longitude,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return;
      }

      await fetchTasks();
    } catch (err) {
      // swallow errors for now; backend integration point
    }
  };

  const handleRequestMapClick = (callback: (lat: number, lng: number) => void) => {
    setMapClickCallback(() => callback);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (mapClickCallback) {
      mapClickCallback(lat, lng);
      setMapClickCallback(null); // Clear after one use
    }
  };

  return (
    <>
      <div className="commander-main">
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: '100%', zIndex: 10 }}
        >
          <LeftSidebar userId={userId} responders={responders} onGenerateReport={handleGenerateReport} />
        </motion.div>
        <MapView
          tasks={tasks}
          showAllTasks={showAllTasks}
          onMapClick={handleMapClick}
          isListeningForClick={mapClickCallback !== null}
        />
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: '100%', zIndex: 10 }}
        >
          <TaskList
            tasks={tasks}
            onAddTaskSubmit={handleAddTaskSubmit}
            onTasksUpdated={fetchTasks}
            showAllTasks={showAllTasks}
            onShowAllTasksChange={setShowAllTasks}
            onRequestMapClick={handleRequestMapClick}
          />
        </motion.div>
      </div>
    </>
  );
};

export default CommanderDashboard;