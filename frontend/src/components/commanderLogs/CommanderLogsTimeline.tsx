import type { FC } from 'react';

const CommanderLogsTimeline: FC = () => {
  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      <main className="flex-grow overflow-y-auto" aria-label="Disaster logs timeline">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="relative timeline-container">
            <div className="space-y-12">
              <div className="relative flex items-start">
                <div className="absolute w-3 h-3 bg-purple-500 rounded-full top-1 left-1/2 -translate-x-1/2 ring-4 ring-slate-50 dark:ring-gray-900" />
                <div className="w-1/2 pr-8 text-right">
                  <time className="inline-block bg-purple-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
                    14:35 UTC, Jul 21
                  </time>
                </div>
                <div className="w-1/2 pl-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Downtown Chemical Plant Fire</h3>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 relative">
                    <div className="absolute -left-2 top-4 w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45 border-l border-b border-gray-200 dark:border-gray-700" />
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-900/50 px-2.5 py-1 font-medium text-red-700 dark:text-red-300">
                        Firefighters: <span className="font-bold">50</span>
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-900/50 px-2.5 py-1 font-medium text-orange-700 dark:text-orange-300">
                        Medics: <span className="font-bold">20</span>
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-gray-200 dark:bg-gray-700 px-2.5 py-1 font-medium text-gray-700 dark:text-gray-300">
                        Police: <span className="font-bold">30</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-start">
                <div className="absolute w-3 h-3 bg-purple-500 rounded-full top-1 left-1/2 -translate-x-1/2 ring-4 ring-slate-50 dark:ring-gray-900" />
                <div className="w-1/2 pr-8 text-right">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Riverdale District Flooding</h3>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 relative">
                    <div className="absolute -right-2 top-4 w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45 border-r border-t border-gray-200 dark:border-gray-700" />
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/50 px-2.5 py-1 font-medium text-green-700 dark:text-green-300">
                        Help Required: <span className="font-bold">Yes</span>
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/50 px-2.5 py-1 font-medium text-yellow-700 dark:text-yellow-300">
                        Food for People: <span className="font-bold">500</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-1/2 pl-8 text-left">
                  <time className="inline-block bg-purple-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
                    11:15 UTC, Jul 21
                  </time>
                </div>
              </div>

              <div className="relative flex items-start">
                <div className="absolute w-3 h-3 bg-purple-500 rounded-full top-1 left-1/2 -translate-x-1/2 ring-4 ring-slate-50 dark:ring-gray-900" />
                <div className="w-1/2 pr-8 text-right">
                  <time className="inline-block bg-purple-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
                    09:02 UTC, Jul 21
                  </time>
                </div>
                <div className="w-1/2 pl-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Highway 8 Collapse</h3>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 relative">
                    <div className="absolute -left-2 top-4 w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45 border-l border-b border-gray-200 dark:border-gray-700" />
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="flex items-center gap-1.5 rounded-full bg-gray-200 dark:bg-gray-700 px-2.5 py-1 font-medium text-gray-700 dark:text-gray-300">
                        Police: <span className="font-bold">10</span>
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-900/50 px-2.5 py-1 font-medium text-orange-700 dark:text-orange-300">
                        Engineers: <span className="font-bold">5</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-start">
                <div className="absolute w-3 h-3 bg-purple-500 rounded-full top-1 left-1/2 -translate-x-1/2 ring-4 ring-slate-50 dark:ring-gray-900" />
                <div className="w-1/2 pr-8 text-right">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Wildfire near Oak Ridge</h3>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 relative">
                    <div className="absolute -right-2 top-4 w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45 border-r border-t border-gray-200 dark:border-gray-700" />
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-900/50 px-2.5 py-1 font-medium text-red-700 dark:text-red-300">
                        Firefighters: <span className="font-bold">150</span>
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/50 px-2.5 py-1 font-medium text-green-700 dark:text-green-300">
                        Evacuations: <span className="font-bold">250</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-1/2 pl-8 text-left">
                  <time className="inline-block bg-purple-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
                    05:45 UTC, Jul 21
                  </time>
                </div>
              </div>

              <div className="relative flex items-start">
                <div className="absolute w-3 h-3 bg-purple-500 rounded-full top-1 left-1/2 -translate-x-1/2 ring-4 ring-slate-50 dark:ring-gray-900" />
                <div className="w-1/2 pr-8 text-right">
                  <time className="inline-block bg-purple-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md">
                    02:30 UTC, Jul 21
                  </time>
                </div>
                <div className="w-1/2 pl-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Power Outage Sector 4</h3>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 relative">
                    <div className="absolute -left-2 top-4 w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45 border-l border-b border-gray-200 dark:border-gray-700" />
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-900/50 px-2.5 py-1 font-medium text-orange-700 dark:text-orange-300">
                        Technicians: <span className="font-bold">12</span>
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-gray-200 dark:bg-gray-700 px-2.5 py-1 font-medium text-gray-700 dark:text-gray-300">
                        Police: <span className="font-bold">5</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CommanderLogsTimeline;
