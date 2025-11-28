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
    let disasterId = getDisasterIdFromLocation();
    // If missing, try last used from localStorage (minimal, no backend change)
    if (!disasterId) {
      const last = typeof window !== 'undefined' ? window.localStorage.getItem('lastDisasterId') : null;
      if (last) {
        const params = new URLSearchParams(window.location.search);
        params.set('disasterId', last);
        window.history.replaceState(null, '', `/?${params.toString()}${window.location.hash}`);
        disasterId = last;
      }
    }
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
      // Persist the active disasterId for next visits
      if (typeof window !== 'undefined' && disasterId) {
        window.localStorage.setItem('lastDisasterId', disasterId);
      }
      const mappedTasks: Task[] = (data || []).map((item) => {
        const assignment = item.assignments[0];
        const assignmentStatus = assignment?.status || item.status;
        return {
          id: item.task_id,
          title: `${item.task_type} - ${item.priority.toUpperCase()}`,
          description: item.description,
          status: mapBackendStatus(assignmentStatus),
          priority: mapBackendPriority(item.priority),
          completed: assignmentStatus === 'completed',
          assignmentTeamId: assignment?.team_id,
          backendStatus: assignmentStatus,
        };
      });

      setTasks(mappedTasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const intervalId = setInterval(fetchTasks, 5000); // Refresh every 5 seconds for real-time sync
    return () => clearInterval(intervalId);
  }, [fetchTasks]);

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.assignmentTeamId) return;

    const disasterId = getDisasterIdFromLocation();
    if (!disasterId) return;

    try {
      // Map checkbox state to proper backend status
      const newStatus = completed ? 'completed' : 'on_scene';
      const url = `${API_BASE_URL}/tasks/${taskId}/assignments/${task.assignmentTeamId}/status`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Immediately fetch updated tasks to reflect changes
        await fetchTasks();
      } else {
        // Revert on failure
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert on error
      await fetchTasks();
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
      case 'en_route':
      case 'arrived':
      case 'on_scene':
        return 'In Progress';
      case 'pending':
      case 'assigned':
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

  const disasterId = getDisasterIdFromLocation();

  return (
    <>
      {(!disasterId) && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e3a8a',
          color: 'white',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          zIndex: 10000,
          fontSize: '0.9rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
        }}>
          <strong>Missing disasterId.</strong> Append <code>?disasterId=ac698de1-ad6c-435e-b3c2-b8343ed83463</code> to the URL to load tasks.
        </div>
      )}
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
        <LeftSidebar userId={userId} responders={[]} disasterId={disasterId} />
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