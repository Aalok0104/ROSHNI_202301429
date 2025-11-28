import type { FC } from 'react';

export type TaskStatus = 'Assigned' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

type TaskCardProps = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  completed: boolean;
  onToggle?: (taskId: string, completed: boolean) => void;
};

const TaskCard: FC<TaskCardProps> = ({ id, title, description, status, priority, completed, onToggle }) => {
  const priorityClass = `task-priority priority-${priority.toLowerCase()}`;
  const statusClass = `task-status status-${status.toLowerCase().replace(' ', '-')}`;

  const statusIcon = {
    'In Progress': (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
    Completed: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    Assigned: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M8 4h13v13" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 18h12V6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  }[status];

  return (
    <div className="task-card">
      <div className="task-card-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => onToggle?.(id, e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              marginTop: '0.2rem',
              cursor: 'pointer',
              accentColor: '#00bbff'
            }}
          />
          <div style={{ flex: 1 }}>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        {statusIcon}
      </div>

      <div className="task-card-footer">
        <span className={priorityClass}>{priority}</span>
        <span className={statusClass}>{status}</span>
      </div>
    </div>
  );
};

export default TaskCard;
