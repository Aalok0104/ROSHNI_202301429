import { useState, useEffect } from 'react';
import type { FC } from 'react';
import TaskCard from './TaskCard';
import type { TaskStatus, TaskPriority } from './TaskCard';

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  completed?: boolean;
  assignmentTeamId?: string;
  backendStatus?: string; 
};

type TaskListProps = {
  tasks?: Task[];
  onTaskToggle?: (taskId: string, completed: boolean) => Promise<void> | void;
};

const TaskList: FC<TaskListProps> = ({
  tasks: initialTasks,
  onTaskToggle,
}) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks ?? []);

  // Keep local state in sync when parent updates the tasks prop
  useEffect(() => {
    setTasks(initialTasks ?? []);
  }, [initialTasks]);

  const handleToggle = async (taskId: string, completed: boolean) => {
    if (onTaskToggle) {
      await onTaskToggle(taskId, completed);
    }
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed } : task
      )
    );
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
              id={task.id}
              title={task.title}
              description={task.description}
              status={task.status}
              priority={task.priority}
              completed={task.completed ?? false}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskList;
