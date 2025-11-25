import type { FC } from 'react';
import { useState, useEffect } from 'react';
import CommanderLogsSidebar, { type FiltersState } from '../components/commanderLogs/CommanderLogsSidebar';
import CommanderLogsTimeline from '../components/commanderLogs/CommanderLogsTimeline';
import '../components/commanderLogs/commanderLogsStyles.css';
import { useTheme } from '../contexts/ThemeContext';

const CommanderLogs: FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    sortBy: 'newest',
    disasterTypes: {},
    resourceNeeds: {},
    damageMin: 0,
    damageMax: 10000000,
    resourceMin: 0,
    resourceMax: 10000000,
  });
  const { theme } = useTheme();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`flex flex-col h-full w-full font-display ${theme === 'light' ? 'bg-slate-50 text-gray-800' : 'bg-[#0f172a] text-gray-200'}`}>
      <div
        className="flex flex-1 overflow-hidden relative"
        style={{ paddingLeft: isSidebarOpen ? '20rem' : '0', transition: 'padding-left 300ms ease' }}
      >
        <CommanderLogsSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((prev) => !prev)} filters={filters} onFiltersChange={setFilters} />
        <CommanderLogsTimeline filters={filters} />
      </div>
    </div>
  );
};

export default CommanderLogs;
