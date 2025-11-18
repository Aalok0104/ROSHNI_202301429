import { useState } from 'react';
import type { FC } from 'react';
import TaskCard from './TaskCard';
import type { TaskStatus, TaskPriority } from './TaskCard';

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
};

type TaskListProps = {
  tasks?: Task[];
  onAddTaskSubmit?: (task: Task) => Promise<void> | void;
};

const TaskList: FC<TaskListProps> = ({
  tasks: initialTasks,
  onAddTaskSubmit,
}) => {
  const [tasks, setTasks] = useState<Task[]>(
    initialTasks ?? []
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('Assigned');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [submitting, setSubmitting] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: String(Date.now()),
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
    };

    try {
      setSubmitting(true);
      if (onAddTaskSubmit) {
        await onAddTaskSubmit(newTask);
      }
      // optimistic add locally so UI updates even without backend
      setTasks((prev) => [newTask, ...prev]);
      // reset form
      setTitle('');
      setDescription('');
      setStatus('Assigned');
      setPriority('Medium');
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
            <TaskCard
              key={task.id}
              title={task.title}
              description={task.description}
              status={task.status}
              priority={task.priority}
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
                  Title
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
                  />
                </label>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <label style={{ flex: 1 }}>
                    Priority
                    <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </label>

                  <label style={{ flex: 1 }}>
                    Status
                    <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="report-modal__actions">
                <button type="button" onClick={() => {
                  // reset
                  setTitle('');
                  setDescription('');
                  setStatus('Assigned');
                  setPriority('Medium');
                }}>
                  Reset
                </button>
                <button type="button" className="commander-button emergency" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Adding…' : 'Add Task'}
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

