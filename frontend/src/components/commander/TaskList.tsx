import { useState } from 'react';
import type { FC } from 'react';
import TaskCard from './TaskCard';
import type { Task, TaskPriority, TaskType } from './TaskCard';
import { API_BASE_URL } from '../../config';
import { useTheme } from '../../contexts/ThemeContext';

type TaskListProps = {
  tasks?: Task[];
  onAddTaskSubmit?: (task: Task) => Promise<void> | void;
  onTasksUpdated?: () => Promise<void> | void;
  showAllTasks?: boolean;
  onShowAllTasksChange?: (showAll: boolean) => void;
  onRequestMapClick?: (callback: (lat: number, lng: number) => void) => void;
};

const TaskList: FC<TaskListProps> = ({
  tasks: initialTasks,
  onAddTaskSubmit,
  onTasksUpdated,
  showAllTasks: externalShowAllTasks,
  onShowAllTasksChange,
  onRequestMapClick,
}) => {
  const { theme } = useTheme();
  const tasks = initialTasks ?? [];
  const [internalShowAllTasks, setInternalShowAllTasks] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const showAllTasks = externalShowAllTasks !== undefined ? externalShowAllTasks : internalShowAllTasks;
  const setShowAllTasks = onShowAllTasksChange || setInternalShowAllTasks;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('logistics');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [teams, setTeams] = useState<{ teamId: string; name: string; teamType?: string }[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  const handleMapLocate = () => {
    if (!onRequestMapClick) {
      return;
    }
    
    // Close modal temporarily
    setIsModalOpen(false);
    
    // Set up one-time map click listener
    onRequestMapClick((lat: number, lng: number) => {
      // Fill in the coordinates
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      
      // Reopen modal
      setTimeout(() => {
        setIsModalOpen(true);
      }, 100);
    });
  };

  const openAssignModal = async (task: Task) => {
    setSelectedTask(task);
    setIsAssignModalOpen(true);
    // If the task is not pending, show the already-assigned team(s) in the
    // modal (disabled). For pending tasks, fetch the available teams and
    // filter them according to the task type each time the modal opens so
    // lists don't interfere with each other.
    if (task.status !== 'pending') {
      setTeamError(null);
      const assigned = (task.assignments || []).map((a) => ({
        teamId: a.teamId,
        name: a.teamName,
        teamType: undefined,
      }));
      setTeams(assigned);
      // Pre-select the first assigned team if present
      setSelectedTeamId(assigned.length > 0 ? assigned[0].teamId : '');
      return;
    }

    // For pending tasks always refresh the team list (do not reuse previous
    // `teams` array) so different task types don't affect each other's lists.
    try {
      setTeamLoading(true);
      setTeamError(null);
      setTeams([]);
      setSelectedTeamId('');
      const url = `${API_BASE_URL}/commander/teams?status=available`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        setTeamError('Unable to load teams');
        return;
      }

      const data = await response.json();

      // Helper: determine compatible team types for given task type
      const compatibleFor = (tt: string) => {
        switch (tt) {
          case 'medic':
            return ['medic', 'medical', 'mixed'];
          case 'fire':
            return ['fire', 'mixed'];
          case 'police':
            return ['police', 'mixed'];
          default:
            return null; // null => all teams allowed
        }
      };

      const allowed = compatibleFor(task.taskType);

      const mappedTeams = (data || [])
        .map((item: any) => ({
          teamId: item.team_id,
          name: item.name,
          teamType: (item.team_type || item.type || '').toString().toLowerCase(),
        }))
        .filter((t: any) => {
          if (!allowed) return true;
          // allowed contains lower-case values; teamType already lower-cased
          return allowed.includes(t.teamType);
        });

      if (mappedTeams.length === 0) {
        setTeamError('No compatible teams available');
      }

      setTeams(mappedTeams);
    } catch (error) {
      setTeamError('Unable to load teams');
    } finally {
      setTeamLoading(false);
    }
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedTask(null);
    setSelectedTeamId('');
    setAssigning(false);
    setCancelling(false);
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const newTask: Task = {
      taskId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      disasterId: 'disaster-placeholder',
      taskType,
      description: description.trim(),
      priority,
      status: 'pending',
      latitude: lat,
      longitude: lng,
      createdAt: new Date().toISOString(),
      assignments: [],
    };
    try {
      setSubmitting(true);
      if (!onAddTaskSubmit) {
        return;
      }

      await onAddTaskSubmit(newTask);
      setDescription('');
      setTaskType('logistics');
      setPriority('medium');
      setLatitude('');
      setLongitude('');
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedTask || !selectedTeamId) return;

    try {
      setAssigning(true);
      const url = `${API_BASE_URL}/tasks/${encodeURIComponent(selectedTask.taskId)}/assignments`;
      const payload = {
        team_id: selectedTeamId,
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

      if (onTasksUpdated) {
        await onTasksUpdated();
      }

      closeAssignModal();
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelTask = async () => {
    if (!selectedTask) return;

    try {
      setCancelling(true);

      const assignmentPromises: Promise<Response>[] = [];
      if (selectedTask.assignments && selectedTask.assignments.length > 0) {
        for (const assignment of selectedTask.assignments) {
          const url = `${API_BASE_URL}/tasks/${encodeURIComponent(selectedTask.taskId)}/assignments/${encodeURIComponent(assignment.teamId)}/status`;
          const payload = {
            status: 'cancelled',
          };

          assignmentPromises.push(
            fetch(url, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(payload),
            })
          );
        }
      }

      if (assignmentPromises.length > 0) {
        await Promise.all(assignmentPromises);
      }

      const statusUrl = `${API_BASE_URL}/tasks/${encodeURIComponent(selectedTask.taskId)}/status`;
      await fetch(statusUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (onTasksUpdated) {
        await onTasksUpdated();
      }

      closeAssignModal();
    } finally {
      setCancelling(false);
    }
  };

  const formatTaskTypeLabel = (value: TaskType) => {
    if (value === 'search_rescue') {
      return 'Search & Rescue';
    }
    const spaced = value.replace('_', ' ');
    return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const filteredTasks = showAllTasks
    ? tasks
    : tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled');

  return (
    <div className="commander-panel right">
      <div className="task-panel">
        <div className="task-panel-header">
          <h2 className="task-title">Assigned Tasks</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showAllTasks}
              onChange={(e) => setShowAllTasks(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {showAllTasks ? 'Show All' : 'Active Only'}
            </span>
          </label>
        </div>

        <div className="task-list">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.taskId}
              task={task}
              onClick={
                task.status === 'completed' || task.status === 'cancelled'
                  ? undefined
                  : () => openAssignModal(task)
              }
                onDelete={async () => {
                  if (onTasksUpdated) {
                    await onTasksUpdated();
                  }
                }}
            />
          ))}
        </div>

        <button type="button" className="commander-button emergency" onClick={openModal}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Add Task
        </button>

        {isModalOpen && (
          <div className="report-modal" role="dialog" aria-modal="true">
            <div className="report-modal__content">
              <header className="report-modal__header">
                <div>
                  <p className="title">Add New Task</p>
                  <p className="meta">Create a task to assign to responders</p>
                </div>
                <button type="button" aria-label="Close" onClick={closeModal}>
                  ×
                </button>
              </header>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>
                  Title / Description
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
                  />
                </label>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <label style={{ flex: 1 }}>
                    Task Type
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as TaskType)}
                      style={{ width: '100%',height: '2.5rem', marginTop: '0.25rem', padding: '0.5rem' }}
                    >
                      <option value="medic">Medic</option>
                      <option value="fire">Fire</option>
                      <option value="police">Police</option>
                      <option value="logistics">Logistics</option>
                      <option value="search_rescue">Search &amp; Rescue</option>
                      <option value="evacuation">Evacuation</option>
                    </select>
                  </label>
                  
                  <label style={{ flex: 1 }}>
                    Priority
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      style={{ width: '100%',height: '2.5rem', marginTop: '0.25rem', padding: '0.5rem' }}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </label>
                  
                  <div style={{ width: '2.5rem', flexShrink: 0 }}></div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'flex-end' }}>
                  <label style={{ flex: 1 }}>
                    Latitude
                    <input
                      type="number"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      style={{ 
                        width: '100%', 
                        height: '2.5rem',
                        marginTop: '0.25rem', 
                        padding: '0.5rem',
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield',
                        backgroundColor: theme === 'light' ? 'rgba(239, 246, 255, 1)' : 'rgba(15, 23, 42, 0.9)',
                        color: theme === 'light' ? '#1e293b' : '#e2e8f0',
                        //border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '0.5rem',
                      }}
                      className="no-spinner"
                    />
                  </label>

                  <label style={{ flex: 1 }}>
                    Longitude
                    <input
                      type="number"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="no-spinner"
                      style={{ 
                        width: '100%', 
                        marginTop: '0.25rem', 
                        padding: '0.5rem', 
                        height: '2.5rem',
                        backgroundColor: theme === 'light' ? 'rgba(239, 246, 255, 1)' : 'rgba(15, 23, 42, 0.9)',
                        color: theme === 'light' ? '#1e293b' : '#e2e8f0',
                        //border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '0.5rem',
                      }}
                    />
                  </label>
                  
                  <button
                    type="button"
                    onClick={handleMapLocate}
                    disabled={!onRequestMapClick}
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      minWidth: '2.5rem',
                      minHeight: '2.5rem',
                      padding: '0',
                      borderRadius: '0.5rem',
                      border: theme === 'light'
                      ? '1px solid rgba(71, 181, 255, 0.40)'
                      : '1px solid rgba(71, 181, 255, 0.35)',
                      background: theme === 'light' ? 'rgba(239, 246, 255, 1)' : 'rgba(15, 23, 42, 0.9)',
                      color: theme === 'light' ? '#1e293b' : '#e6eefc',
                      cursor: onRequestMapClick ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '0.25rem', 
                      marginBottom: '0rem',
                      boxSizing: 'border-box',
                    }}
                    title="Click on map to set location"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="report-modal__actions">
                <button
                  type="button"
                  style={{
                    background: theme === 'light' ? 'rgba(239, 246, 255, 1)' : 'rgba(15, 23, 42, 0.9)',
                    color: theme === 'light' ? '#1e293b' : '#e2e8f0',
                    border: theme === 'light'
                      ? '1px solid rgba(71, 181, 255, 0.40)'
                      : '1px solid rgba(71, 181, 255, 0.35)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    marginRight: '0.5rem',
                    fontWeight: 500,
                  }}
                  onClick={() => {
                    setDescription('');
                    setTaskType('logistics');
                    setPriority('medium');
                    setLatitude('');
                    setLongitude('');
                  }}
                >
                  Reset
                </button>
                <button type="button" className="commander-button emergency" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isAssignModalOpen && selectedTask && (
          <div className="report-modal" role="dialog" aria-modal="true">
            <div className="report-modal__content">
              <header className="report-modal__header">
                <div>
                  <p className="title">{selectedTask.description}</p>
                  <p className="meta">{formatTaskTypeLabel(selectedTask.taskType)}</p>
                </div>
                <button type="button" aria-label="Close" onClick={closeAssignModal}>
                  ×
                </button>
              </header>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>
                  Team
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    disabled={teamLoading || teams.length === 0 || (selectedTask && selectedTask.status !== 'pending')}
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
                  >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.teamId} value={team.teamId}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>

                {teamError && (
                  <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{teamError}</p>
                )}
              </div>

              <div className="report-modal__actions">
                <button
                  type="button"
                  style={{ backgroundColor: '#f87171', color: '#ffffff', borderRadius: '0.85rem', padding: '0.75rem 1rem' }}
                  onClick={handleCancelTask}
                  disabled={cancelling || assigning}
                >
                  {cancelling ? 'Cancelling…' : 'Cancel Task'}
                </button>
                {selectedTask && selectedTask.status === 'pending' && (
                  <button
                    type="button"
                    className="commander-button emergency"
                    onClick={handleAssignTeam}
                    disabled={!selectedTeamId || assigning || cancelling}
                  >
                    {assigning ? 'Assigning…' : 'Assign'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;

