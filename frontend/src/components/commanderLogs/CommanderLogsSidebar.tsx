import type { FC } from 'react';

export type CommanderLogsSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
};

const CommanderLogsSidebar: FC<CommanderLogsSidebarProps> = ({ isOpen, onToggle }) => {
  const sidebarClassName =
    'w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-600 flex-shrink-0 flex flex-col transition-transform duration-300 ease-in-out z-10 relative' +
    (isOpen ? '' : ' -translate-x-full');

  const toggleIcon = isOpen ? 'chevron_left' : 'chevron_right';

  return (
    <aside className={sidebarClassName} aria-label="Commander log filters">
      <div className="flex-grow p-6 overflow-y-auto pt-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="logs-search">
              Search
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                search
              </span>
              <input
                id="logs-search"
                type="text"
                placeholder="Search by title, ID..."
                className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-500 bg-white dark:bg-gray-700 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="logs-sort">
              Sort by
            </label>
            <select
              id="logs-sort"
              className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-500 bg-white dark:bg-gray-700 pl-3 pr-8 text-sm focus:border-blue-500 focus:ring-blue-500"
              defaultValue="Newest first"
            >
              <option>Newest first</option>
              <option>Oldest first</option>
              <option>Highest severity</option>
              <option>Lowest severity</option>
            </select>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Disaster Type</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="logs-type-fire"
                  type="checkbox"
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="logs-type-fire" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Fire
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="logs-type-flood"
                  type="checkbox"
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="logs-type-flood" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Flood
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="logs-type-infra"
                  type="checkbox"
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="logs-type-infra" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Infrastructure
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resource Needs</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="logs-res-firefighters"
                  type="checkbox"
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="logs-res-firefighters" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Firefighters
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="logs-res-medics"
                  type="checkbox"
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="logs-res-medics" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Medics
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="logs-res-police"
                  type="checkbox"
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="logs-res-police" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Police
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="logs-res-food"
                  type="checkbox"
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="logs-res-food" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Food Aid
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          type="button"
          className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
        >
          Apply Filters
        </button>
      </div>

      <button
        type="button"
        aria-label="Toggle sidebar"
        className="absolute top-1/2 -translate-y-1/2 left-full -translate-x-px z-20 w-6 h-12 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-r-lg shadow-md cursor-pointer group"
        onClick={onToggle}
      >
        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 group-hover:text-blue-600 transition-colors duration-200">
          {toggleIcon}
        </span>
      </button>
    </aside>
  );
};

export default CommanderLogsSidebar;
