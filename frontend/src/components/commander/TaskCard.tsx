import type { FC, ReactElement } from 'react';

export type TaskType = 'medic' | 'fire' | 'police' | 'logistics' | 'search_rescue' | 'evacuation';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'assigned' | 'en_route' | 'on_scene' | 'completed' | 'cancelled';

export type TaskAssignment = {
  teamId: string;
  teamName: string;
  status: TaskStatus;
  eta?: string;
  arrivedAt?: string;
};

export type Task = {
  taskId: string;
  disasterId: string;
  taskType: TaskType;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  latitude: number;
  longitude: number;
  createdAt: string;
  assignments: TaskAssignment[];
};

type TaskCardProps = {
  task: Task;
};

const priorityLabelMap: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const priorityClassMap: Record<TaskPriority, string> = {
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
};

const statusConfigMap: Record<
  TaskStatus,
  {
    label: string;
    className: string;
    icon: ReactElement;
  }
> = {
  pending: {
    label: 'Pending',
    className: 'status-assigned',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  assigned: {
    label: 'Assigned',
    className: 'status-assigned',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M8 4h13v13" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 18h12V6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  en_route: {
    label: 'En Route',
    className: 'status-in-progress',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  on_scene: {
    label: 'On Scene',
    className: 'status-in-progress',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  completed: {
    label: 'Completed',
    className: 'status-completed',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  cancelled: {
    label: 'Cancelled',
    className: 'status-completed',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

const formatTaskTypeLabel = (taskType: TaskType) => {
  const spaced = taskType.replace('_', ' ');
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

const TaskCard: FC<TaskCardProps> = ({ task }) => {
  const { taskType, description, status, priority, latitude, longitude } = task;

  const statusConfig = statusConfigMap[status];
  const priorityLabel = priorityLabelMap[priority];
  const priorityClass = `task-priority ${priorityClassMap[priority]}`;
  const statusClass = `task-status ${statusConfig.className}`;
  const statusIcon = statusConfig.icon;
  const taskTypeLabel = formatTaskTypeLabel(taskType);

  return (
    <div className="task-card">
      <div className="task-card-header">
        <div>
          <h3>{description}</h3>
          <p>{taskTypeLabel}</p>
          <p>
            Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
          </p>
        </div>
        {statusIcon}
      </div>

      <div className="task-card-footer">
        <span className={priorityClass}>{priorityLabel}</span>
        <span className={statusClass}>{statusConfig.label}</span>
      </div>
    </div>
  );
};

export default TaskCard;

