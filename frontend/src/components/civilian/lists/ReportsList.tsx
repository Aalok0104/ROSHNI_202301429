// ReportsList Component
import { type FC, useEffect, useState, useRef } from 'react';
import { API_BASE_URL } from '../../../config';

interface Incident {
  incident_id: string;
  title: string;
  description: string | null;
  incident_type: string | null;
  status: string;
  reported_at: string;
  latitude: number;
  longitude: number;
}

interface ReportsListProps {
  refresh: number;
}

type FilterType = 'All Types' | 'Flood' | 'Earthquake' | 'Fire' | 'Cyclone' | 'Landslide' | 'Tsunami' | 'Drought' | 'Industrial Accident' | 'Terrorist Attack' | 'Epidemic' | 'Nuclear/Chemical Hazard' | 'SOS' | 'Medical' | 'Other';
type SortType = 'Latest First' | 'Urgent First';

const disasterTypes: FilterType[] = [
  'All Types',
  'Flood',
  'Earthquake',
  'Fire',
  'Cyclone',
  'Landslide',
  'Tsunami',
  'Drought',
  'Industrial Accident',
  'Terrorist Attack',
  'Epidemic',
  'Nuclear/Chemical Hazard',
  'SOS',
  'Medical',
  'Other'
];

const sortOptions: SortType[] = ['Latest First', 'Urgent First'];

const ReportsList: FC<ReportsListProps> = ({ refresh }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('All Types');
  const [sortType, setSortType] = useState<SortType>('Latest First');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [refresh]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/incidents/mine`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }

      const data = await response.json();
      setIncidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSortedIncidents = () => {
    let filtered = [...incidents];

    // Filter by type
    if (filterType !== 'All Types') {
      filtered = filtered.filter(incident => {
        const type = incident.incident_type?.toLowerCase() || 'other';
        const selectedType = filterType.toLowerCase().replace(/\//g, '_').replace(/ /g, '_');
        return type === selectedType || 
               (filterType === 'SOS' && type === 'sos') ||
               (filterType === 'Medical' && type === 'medical') ||
               (filterType === 'Other' && (!incident.incident_type || type === 'other'));
      });
    }

    // Sort
    if (sortType === 'Latest First') {
      filtered.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());
    } else if (sortType === 'Urgent First') {
      // Sort by severity: High > Medium > Low, then by date
      filtered.sort((a, b) => {
        // Extract severity from title (format: "Type Emergency - Severity Severity")
        const getSeverity = (incident: Incident) => {
          const title = incident.title?.toLowerCase() || '';
          // Check for exact severity patterns
          if (title.includes('- high severity')) return 3;
          if (title.includes('- medium severity')) return 2;
          if (title.includes('- low severity')) return 1;
          return 0; // No severity specified
        };
        
        const aSeverity = getSeverity(a);
        const bSeverity = getSeverity(b);
        
        console.log('Sorting:', a.title, 'severity:', aSeverity, 'vs', b.title, 'severity:', bSeverity);
        
        // Sort by severity (higher first), then by date (recent first)
        if (bSeverity !== aSeverity) {
          return bSeverity - aSeverity;
        }
        return new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime();
      });
    }

    return filtered;
  };

  const filteredIncidents = getFilteredAndSortedIncidents();

  const getIncidentTypeLabel = (type: string | null) => {
    if (!type) return 'Other';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      open: 'bg-blue-500/20 text-blue-400 border-blue-500',
      converted: 'bg-green-500/20 text-green-400 border-green-500',
      discarded: 'bg-gray-500/20 text-gray-400 border-gray-500',
    };
    return statusColors[status] || statusColors.open;
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        Loading reports...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        {/* Type Filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors flex items-center gap-2"
          >
            {filterType}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showFilterDropdown && (
            <div className="absolute top-full mt-2 w-64 bg-[#1a1f3a] border-2 border-blue-600 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
              {disasterTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-600 transition-colors ${
                    filterType === type ? 'bg-blue-600 text-white' : 'text-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort Filter */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors flex items-center gap-2"
          >
            {sortType}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showSortDropdown && (
            <div className="absolute top-full mt-2 w-48 bg-[#1a1f3a] border-2 border-blue-600 rounded-lg shadow-xl z-50">
              {sortOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSortType(option);
                    setShowSortDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-600 transition-colors ${
                    sortType === option ? 'bg-blue-600 text-white' : 'text-gray-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto text-sm text-gray-400">
          {filteredIncidents.length} report{filteredIncidents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Reports List */}
      {filteredIncidents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filterType !== 'All Types' || sortType !== 'Latest First' 
            ? 'No reports match your filters.' 
            : 'No reports yet. Use the Emergency SOS button to create one.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => (
            <div key={incident.incident_id} className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/60 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white">
                      {incident.title || 'Emergency Report'}
                    </h3>
                    <span className="text-xs text-gray-400">
                      ({getIncidentTypeLabel(incident.incident_type)})
                    </span>
                  </div>
                  <span className={`inline-block px-2 py-1 rounded text-xs border ${getStatusBadge(incident.status)}`}>
                    {incident.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(incident.reported_at).toLocaleString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
              </div>
              
              {incident.description && (
                <p className="text-sm text-gray-300 mb-3">
                  {incident.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  📍 {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsList;
