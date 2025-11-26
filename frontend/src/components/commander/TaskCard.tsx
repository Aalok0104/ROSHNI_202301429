import { useState } from 'react';
import type { FC, ReactElement } from 'react';
import { Flame, DoorOpen, Stethoscope, ShieldHalf, FileText, UserRoundSearch } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export type TaskType = 'medic' | 'fire' | 'police' | 'logistics' | 'search_rescue' | 'evacuation';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'assigned'
  | 'en_route'
  | 'on_scene'
  | 'completed'
  | 'cancelled';

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
  onClick?: () => void;
  onDelete?: () => Promise<void> | void;
};

const priorityDotMap: Record<TaskPriority, ReactElement> = {
  high: (
    <span className="priority-dots">
      <span style={{ color: '#ef4444', fontSize: '1.1em', marginRight: '2px' }}>●</span>
      <span style={{ color: '#ef4444', fontSize: '1.1em', marginRight: '2px' }}>●</span>
      <span style={{ color: '#ef4444', fontSize: '1.1em' }}>●</span>
    </span>
  ),
  medium: (
    <span className="priority-dots">
      <span style={{ color: '#facc15', fontSize: '1.1em', marginRight: '2px' }}>●</span>
      <span style={{ color: '#facc15', fontSize: '1.1em' }}>●</span>
    </span>
  ),
  low: (
    <span className="priority-dots">
      <span style={{ color: '#22c55e', fontSize: '1.1em' }}>●</span>
    </span>
  ),
};

const statusConfigMap: Record<
  TaskStatus,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: 'Pending',
    className: 'status-assigned',
  },
  assigned: {
    label: 'Assigned',
    className: 'status-assigned',
  },
  in_progress: {
    label: 'In Progress',
    className: 'status-in-progress',  
  },
  en_route: {
    label: 'En Route',
    className: 'status-in-progress',
  },
  on_scene: {
    label: 'On Scene',
    className: 'status-in-progress',
  },
  completed: {
    label: 'Completed',
    className: 'status-completed',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'status-cancelled',
  },
};

const taskTypeIconMap: Record<
  TaskType,
  {
    className: string;
    icon: ReactElement;
  }
> = {
  medic: {
    className: 'task-type-icon--medic',
    icon: (
      <Stethoscope className="w-5 h-5 text-green-400" />
    ),
  },
  fire: {
    className: 'task-type-icon--fire',
    icon: (
      <Flame className="w-5 h-5 text-red-400" />
    ),
  },
  police: {
    className: 'task-type-icon--police',
    icon: (
      <ShieldHalf className="w-5 h-5 text-blue-400" />
    ),
  },
  logistics: {
    className: 'task-type-icon--logistics',
    icon: (
      <FileText className="w-5 h-5 text-yellow-400" />
    ),
  },
  search_rescue: {
    className: 'task-type-icon--search_rescue',
    icon: (
      <UserRoundSearch className="w-5 h-5 text-purple-400" />
    ),
  },
  evacuation: {
    className: 'task-type-icon--evacuation',
    icon: (
      <DoorOpen className="w-5 h-5 text-orange-400" />
    ),
  },
};

const formatTaskTypeLabel = (taskType: TaskType) => {
  if (taskType === 'search_rescue') {
    return 'Search & Rescue';
  }
  const spaced = taskType.replace('_', ' ');
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

const TaskCard: FC<TaskCardProps> = ({ task, onClick, onDelete }) => {
  const { taskType, description, status, priority } = task;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const statusConfig = statusConfigMap[status];
  const typeConfig = taskTypeIconMap[taskType];
  const priorityDots = priorityDotMap[priority];
  const statusClass = `task-status ${statusConfig.className}`;
  const typeIcon = typeConfig.icon;
  const typeIconClass = `task-type-icon ${typeConfig.className}`;
  const taskTypeLabel = formatTaskTypeLabel(taskType);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setDeleteError(null);
      const url = `${API_BASE_URL}/tasks/${encodeURIComponent(task.taskId)}`;
      const resp = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!resp.ok) {
        setDeleteError('Unable to delete task');
        return;
      }

      if (onDelete) {
        await onDelete();
      }

      setIsDeleteModalOpen(false);
    } catch (err) {
      setDeleteError('Unable to delete task');
    } finally {
      setDeleting(false);
    }
  };
  const handleCardClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (status === 'completed' || status === 'cancelled') {
      setIsDeleteModalOpen(true);
    }
  };

  return (
    <>
      <div
        className="task-card"
        onClick={handleCardClick}
        style={onClick || status === 'completed' || status === 'cancelled' ? { cursor: 'pointer' } : undefined}
      >
        <div className="task-card-header">
          <div>
            <h3 style={{ marginBottom: '0rem' }}>{description}</h3>
            <p style={{ marginBottom: '0rem' }}>{taskTypeLabel}</p>
          </div>
          <div className={typeIconClass}>{typeIcon}</div>
        </div>

        <div className="task-card-footer">
          <span>{priorityDots}</span>
          <span className={statusClass}>{statusConfig.label}</span>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="report-modal" role="dialog" aria-modal="true">
          <div className="report-modal__content">
            <header className="report-modal__header">
              <div>
                <p className="title">{description}</p>
                <p className="meta">{taskTypeLabel}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setIsDeleteModalOpen(false)}>
                ×
              </button>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ margin: 0, color: '#374151' }}>This task is {status}. You can delete it permanently.</p>
              {deleteError && <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>{deleteError}</p>}
            </div>

            <div className="report-modal__actions">
              <button
                type="button"
                style={{ backgroundColor: '#f87171', color: '#ffffff', borderRadius: '0.85rem', padding: '0.75rem 1rem' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskCard;

