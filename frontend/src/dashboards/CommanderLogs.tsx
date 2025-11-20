import type { FC } from 'react';
import { useState, useEffect } from 'react';
import CommanderLogsSidebar from '../components/commanderLogs/CommanderLogsSidebar';
import CommanderLogsTimeline from '../components/commanderLogs/CommanderLogsTimeline';
import '../components/commanderLogs/commanderLogsStyles.css';

const CommanderLogs: FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-display">
      <div className="flex flex-1 overflow-hidden">
        <CommanderLogsSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((prev) => !prev)} />
        <CommanderLogsTimeline />
      </div>
    </div>
  );
};

export default CommanderLogs;
