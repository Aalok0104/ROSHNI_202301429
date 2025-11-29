import type { FC } from 'react';
import AISummary from './AISummary';
import ChatWindow from './ChatWindow';

type LeftSidebarProps = {
  userId: string;
  responders: string[];
  disasterId?: string | null;
};

const LeftSidebar: FC<LeftSidebarProps> = ({ disasterId }) => {
  return (
    <div className="commander-panel left">
      <div className="live-feed">
        <h2 className="live-feed-title">Live Feed</h2>
        <AISummary disasterId={disasterId} />
        <ChatWindow />
      </div>
    </div>
  );
};

export default LeftSidebar;
