import React, { useState, useEffect } from 'react';
import LogModal from './LogModal';
import { useTheme } from '../../contexts/ThemeContext';
import './commanderLogsStyles.css';

export type FiltersState = {
  search: string;
  sortBy: 'newest' | 'oldest';
  disasterTypes: Record<string, boolean>;
  resourceNeeds: Record<string, boolean>;
  damageMin: number;
  damageMax: number;
  resourceMin: number;
  resourceMax: number;
};

export type CommanderLogsSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onLogCreated?: () => void;
};

const disasterTypes = [
  { id: 'help_required', label: 'Help Required' },
  { id: 'num_injuries', label: 'Injuries' },
  { id: 'num_deaths', label: 'Deaths' },
];

const resourceNeeds = [
  { id: 'firefighters', label: 'Firefighters' },
  { id: 'medics', label: 'Medics' },
  { id: 'police', label: 'Police' },
  { id: 'food', label: 'Food Aid' },
];

function CommanderLogsSidebar({ isOpen, onToggle, filters, onFiltersChange, onLogCreated }: CommanderLogsSidebarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [checkboxBg, setCheckboxBg] = useState('#0f172a');

  useEffect(() => {
    try {
      const el = document.querySelector('.timeline-container') as HTMLElement | null;
      if (el) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') {
          setCheckboxBg(bg);
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    setCheckboxBg('#0f172a');
  }, []);

  const updateFilters = (partial: Partial<FiltersState>) => {
    onFiltersChange({ ...filters, ...partial });
  };
  const sidebarClassName = `w-80 flex flex-col transition-transform duration-300 ease-in-out z-10 absolute left-0 top-0 ${
    isDark ? 'bg-[#1e293b] border-r border-b border-gray-700 rounded-br-xl' : 'bg-white border-r border-b border-gray-200 rounded-br-xl'
  } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`;

  const toggleIcon = isOpen ? 'chevron_left' : 'chevron_right';
  const controlBaseClass =
    'w-full h-10 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 border-[1.5px] border-[#47b5ff] transition-colors duration-200';
  const controlThemeClass = isDark
    ? 'bg-[#0f172a] text-gray-100 placeholder:text-gray-400'
    : 'bg-[var(--color-slate-50)] text-gray-900 placeholder:text-gray-500';

  type ResourceItem = { id: string; label: string };

  type ResourceCheckboxProps = {
    id: string;
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };

  function ResourceCheckbox({ id, label, checked, onChange }: ResourceCheckboxProps) {
    const { theme: localTheme } = useTheme();
    const localDark = localTheme === 'dark';

    return (
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />

        <div className="relative w-6 h-6 flex items-center justify-center">
          {(() => {
            const circleClass = checked
              ? localDark
                ? 'bg-[var(--checkbox-bg)] border-[var(--checkbox-bg)]'
                : 'bg-[var(--color-slate-50)] border-gray-900'
              : localDark
                ? 'bg-[#0f172a] border-gray-600'
                : 'bg-[var(--color-slate-50)] border-gray-300';
            return (
              <span
                aria-hidden
                className={`absolute inset-0 rounded-full transition-colors duration-150 ease-out transform ${circleClass}`}
              />
            );
          })()}

          <span
            aria-hidden
            className={`absolute rounded-full transition-opacity duration-150 ${checked ? 'opacity-100' : 'opacity-0'}`}
            style={{ boxShadow: checked ? '0 6px 18px rgba(71,181,255,0.18)' : undefined }}
          />

          <svg
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            } ${localDark ? 'text-white' : 'text-black'}`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span className="sr-only">{label}</span>
        </div>

        <label htmlFor={id} className={`text-sm ${localDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {label}
        </label>
      </div>
    );
  }

  function ResourceList({ items, namePrefix, filters, onFiltersChange }: { items: ResourceItem[]; namePrefix: string; filters: FiltersState; onFiltersChange: (partial: Partial<FiltersState>) => void }) {
    const filterKey = namePrefix === 'disaster' ? 'disasterTypes' : 'resourceNeeds';
    const currentValues = filters[filterKey as keyof FiltersState] as Record<string, boolean>;

    const handleChange = (id: string, checked: boolean) => {
      const updated = { ...currentValues, [id]: checked };
      onFiltersChange({ [filterKey]: updated } as Partial<FiltersState>);
    };

    return (
      <div className="space-y-2">
        {items.map((it) => (
          <ResourceCheckbox
            key={it.id}
            id={`${namePrefix}-${it.id}`}
            label={it.label}
            checked={!!currentValues[it.id]}
            onChange={(v) => handleChange(it.id, v)}
          />
        ))}
      </div>
    );
  }

  // Add Log modal state (using shared LogModal)
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const openAddLog = () => setIsAddLogOpen(true);
  const closeAddLog = () => setIsAddLogOpen(false);

  const notifyParent = () => {
    if (typeof onLogCreated === 'function') {
      try { onLogCreated(); } catch { /* ignore */ }
    } else {
      window.location.reload();
    }
  };

  return (
    <aside className={sidebarClassName} aria-label="Commander log filters">
      <div className="p-6 pt-6" style={{ ['--checkbox-bg' as any]: checkboxBg } as React.CSSProperties}>
        <div className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="logs-search">
              Search
            </label>
            <div className="relative">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                search
              </span>
              <input
                id="logs-search"
                type="text"
                placeholder="Search by title..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className={`${controlBaseClass} pl-10 pr-4 ${controlThemeClass}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} htmlFor="logs-sort">
              Sort by
            </label>
            <div className="relative">
              <select
                id="logs-sort"
                value={filters.sortBy}
                onChange={(e) => updateFilters({ sortBy: e.target.value as 'newest' | 'oldest' })}
                className={`${controlBaseClass} appearance-none pl-3 pr-10 ${controlThemeClass}`}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <span
                className={`material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                expand_more
              </span>
            </div>
          </div>

          <div>
            <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Civilians</h3>
            <ResourceList items={disasterTypes} namePrefix="disaster" filters={filters} onFiltersChange={updateFilters} />
          </div>

          <div>
            <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Resource Needs</h3>
            <ResourceList items={resourceNeeds} namePrefix="resource" filters={filters} onFiltersChange={updateFilters} />
          </div>

          <div>
            <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Estimated Damage Cost (₹)</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.damageMin}
                  onChange={(e) => updateFilters({ damageMin: parseInt(e.target.value) || 0 })}
                  className={`${controlBaseClass} flex-1 px-3 text-sm ${controlThemeClass}`}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.damageMax}
                  onChange={(e) => updateFilters({ damageMax: parseInt(e.target.value) || 10000000 })}
                  className={`${controlBaseClass} flex-1 px-3 text-sm ${controlThemeClass}`}
                />
              </div>
              
            </div>
          </div>

          <div>
            <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Estimated Resource Cost (₹)</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.resourceMin}
                  onChange={(e) => updateFilters({ resourceMin: parseInt(e.target.value) || 0 })}
                  className={`${controlBaseClass} flex-1 px-3 text-sm ${controlThemeClass}`}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.resourceMax}
                  onChange={(e) => updateFilters({ resourceMax: parseInt(e.target.value) || 10000000 })}
                  className={`${controlBaseClass} flex-1 px-3 text-sm ${controlThemeClass}`}
                />
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* Add Log button (opens modal) */}
      <div style={{ padding: '0 1.5rem 1.5rem' }}>
        <button type="button" className="commander-button emergency w-full" onClick={openAddLog} title="Add Log">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Add Log
        </button>
      </div>
      {isAddLogOpen && (
        <LogModal
          open={isAddLogOpen}
          mode="add"
          disasterId={new URLSearchParams(window.location.search).get('disasterId') || undefined}
          onClose={closeAddLog}
          onSuccess={notifyParent}
        />
      )}

      <button
        type="button"
        aria-label="Toggle sidebar"
        className={`absolute top-1/2 -translate-y-1/2 left-full -translate-x-px z-20 w-6 h-12 flex items-center justify-center border rounded-r-lg cursor-pointer group ${
          isDark 
            ? 'bg-gray-800 border-gray-600  shadow-md' 
            : 'bg-white border-gray-200 border-l-0  shadow-none'
        }`}
        onClick={onToggle}
      >
        <span className={`material-symbols-outlined group-hover:text-blue-600 transition-colors duration-200 ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {toggleIcon}
        </span>
      </button>
    </aside>
  );
};

export default CommanderLogsSidebar;
