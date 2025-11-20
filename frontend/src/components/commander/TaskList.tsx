import { useState } from 'react';
import type { FC } from 'react';
import TaskCard from './TaskCard';
import type { Task, TaskPriority, TaskType } from './TaskCard';

type TaskListProps = {
  tasks?: Task[];
  onAddTaskSubmit?: (task: Task) => Promise<void> | void;
};

const TaskList: FC<TaskListProps> = ({
  tasks: initialTasks,
  onAddTaskSubmit,
}) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks ?? []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('logistics');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

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
      if (onAddTaskSubmit) {
        await onAddTaskSubmit(newTask);
      }
      setTasks((prev) => [newTask, ...prev]);
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

  return (
    <div className="commander-panel right">
      <div className="task-panel">
        <div className="task-panel-header">
          <h2 className="task-title">Assigned Tasks</h2>
          <span className="task-count">{tasks.length} Active</span>
        </div>

        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard key={task.taskId} task={task} />
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
                      style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
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
                      style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' , marginTop: '1rem'}}>
                  <label style={{ flex: 1 }}>
                    Latitude
                    <input
                      type="number"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
                    />
                  </label>

                  <label style={{ flex: 1 }}>
                    Longitude
                    <input
                      type="number"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
                    />
                  </label>
                </div>
              </div>

              <div className="report-modal__actions">
                <button
                  type="button"
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
      </div>
    </div>
  );
};

export default TaskList;

