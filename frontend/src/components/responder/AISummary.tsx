import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { API_BASE_URL } from '../../config';

type AISummaryProps = {
  summary?: string;
  disasterId?: string | null;
};

type DisasterStats = {
  total_deaths: number;
  total_injured: number;
  personnel_deployed: number;
  resources_cost_estimate: number;
  affected_population_count: number;
};

const AISummary: FC<AISummaryProps> = ({
  summary,
  disasterId,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [stats, setStats] = useState<DisasterStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!disasterId) {
      setError('No disaster selected');
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/disasters/${disasterId}/stats`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Disaster not found');
          }
          throw new Error('Failed to fetch disaster stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching disaster stats:', err);
        setError(err instanceof Error ? err.message : 'Unable to load disaster summary');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [disasterId]);

  const generateSummary = () => {
    if (summary) return summary;
    if (loading) return 'Loading disaster summary...';
    if (error) return error;
    if (!stats) return 'No disaster data available.';

    const parts = [];
    if (stats.total_deaths > 0) parts.push(`${stats.total_deaths} casualties reported`);
    if (stats.total_injured > 0) parts.push(`${stats.total_injured} injured`);
    if (stats.affected_population_count > 0) parts.push(`${stats.affected_population_count} people affected`);
    if (stats.personnel_deployed > 0) parts.push(`${stats.personnel_deployed} personnel deployed`);
    if (stats.resources_cost_estimate > 0) parts.push(`estimated cost: $${stats.resources_cost_estimate.toLocaleString()}`);

    return parts.length > 0 
      ? `Disaster Summary: ${parts.join(', ')}.`
      : 'Monitoring situation. No critical incidents reported yet.';
  };

  return (
    <div className="ai-summary">
      <header onClick={() => setIsExpanded((prev) => !prev)}>
        <span>AI Summary</span>
        <svg
          className={`ai-summary-caret ${isExpanded ? 'open' : ''}`}
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </header>

      {isExpanded && (
        <p className="ai-summary-body">
          {generateSummary()}
        </p>
      )}
    </div>
  );
};

export default AISummary;
