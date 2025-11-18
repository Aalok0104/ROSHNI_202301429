// NotificationPanel Component
import { type FC, useEffect, useState } from 'react';
import { getNotifications, clearNotifications, type Notification, escapeHtml } from '../utils/civilianPortal';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  refresh: number;
}

const NotificationPanel: FC<NotificationPanelProps> = ({ isOpen, onClose : _onClose, refresh }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (isOpen) {
      setNotifications(getNotifications());
    }
  }, [isOpen, refresh]);

  const handleClear = () => {
    clearNotifications();
    setNotifications([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-20 w-80 bg-card-dark border border-border-dark rounded-md p-3 z-40">
      <h4 className="font-semibold mb-2">Notifications</h4>
      <ul className="space-y-2 text-sm text-text-secondary-dark">
        {notifications.length === 0 ? (
          <li className="text-sm text-text-secondary-dark">No notifications</li>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <li key={n.id} className="p-2 rounded-md hover:bg-gray-800">
              <div className="font-medium text-sm" dangerouslySetInnerHTML={{ __html: escapeHtml(n.text) }} />
              <div className="text-xs text-text-secondary-dark" dangerouslySetInnerHTML={{ __html: escapeHtml(n.time) }} />
            </li>
          ))
        )}
      </ul>
      <div className="mt-3 text-right">
        <button onClick={handleClear} className="text-sm px-2 py-1 rounded-md bg-gray-800 hover:bg-gray-700">
          Clear
        </button>
      </div>
    </div>
  );
};

export default NotificationPanel;
