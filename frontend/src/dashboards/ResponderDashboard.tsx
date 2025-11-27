import { type FC, useState, useEffect, useCallback } from "react";
import type { SessionUser } from "../types";
import LeftSidebar from "../components/responder/LeftSidebar";
import MapView from "../components/responder/MapView";
import TaskList from "../components/responder/TaskList";
import type { Task } from "../components/responder/TaskList";
import "../components/responder/responderStyles.css";
import { API_BASE_URL } from "../config";

type Props = {
  user: SessionUser;
};

type BackendTask = {
  task_id: string;
  disaster_id: string;
  task_type: string;
  description: string;
  priority: string;
  status: string;
  latitude: number;
  longitude: number;
  created_at: string;
  assignments: Array<{
    team_id: string;
    team_name: string;
    status: string;
    eta: string | null;
    arrived_at: string | null;
  }>;
};

const ResponderDashboard: FC<Props> = ({ user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = user.user_id || user.email || "responder-user";

  const getDisasterIdFromLocation = () => {
    if (typeof window === 'undefined') return null;
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('disasterId');
    } catch {
      return null;
    }
  };

  const fetchTasks = useCallback(async () => {
    const disasterId = getDisasterIdFromLocation();
    if (!disasterId) {
      setLoading(false);
      return;
    }

    try {
      const url = `${API_BASE_URL}/disasters/${encodeURIComponent(disasterId)}/tasks`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        setLoading(false);
        return;
      }

      const data: BackendTask[] = await response.json();
      const mappedTasks: Task[] = (data || []).map((item) => ({
        id: item.task_id,
        title: `${item.task_type} - ${item.priority.toUpperCase()}`,
        description: item.description,
        status: mapBackendStatus(item.status),
        priority: mapBackendPriority(item.priority),
        completed: item.status === 'completed',
        assignmentTeamId: item.assignments[0]?.team_id,
        backendStatus: item.status,
      }));

      setTasks(mappedTasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const intervalId = setInterval(fetchTasks, 15000); // Refresh every 15 seconds
    return () => clearInterval(intervalId);
  }, [fetchTasks]);

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.assignmentTeamId) return;

    const disasterId = getDisasterIdFromLocation();
    if (!disasterId) return;

    try {
      const newStatus = completed ? 'arrived' : 'dispatched';
      const url = `${API_BASE_URL}/tasks/${taskId}/assignments/${task.assignmentTeamId}/status`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const mapBackendStatus = (status: string): "Assigned" | "In Progress" | "Completed" => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'resolved':
        return 'Completed';
      case 'in_progress':
      case 'active':
      case 'dispatched':
      case 'arrived':
        return 'In Progress';
      default:
        return 'Assigned';
    }
  };

  const mapBackendPriority = (priority: string): "Low" | "Medium" | "High" => {
    switch (priority.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      default:
        return 'Low';
    }
  };

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.85)',
          color: 'white',
          padding: '1.5rem 3rem',
          borderRadius: '12px',
          zIndex: 9999,
          fontSize: '1.1rem',
          fontWeight: '500',
        }}>
          Loading tasks...
        </div>
      )}
      <div className="commander-main">
        <LeftSidebar userId={userId} responders={[]} disasterId={getDisasterIdFromLocation()} />
        <MapView />
        <TaskList 
          tasks={tasks} 
          onTaskToggle={handleTaskToggle}
        />
      </div>
    </>
  );
};

export default ResponderDashboard;