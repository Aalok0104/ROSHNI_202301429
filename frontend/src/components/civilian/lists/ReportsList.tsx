// ReportsList Component
import { type FC, useEffect, useState } from 'react';
import { getReports, type EmergencyReport, escapeHtml } from '../utils/civilianPortal';

interface ReportsListProps {
  refresh: number;
}

const ReportsList: FC<ReportsListProps> = ({ refresh }) => {
  const [reports, setReports] = useState<EmergencyReport[]>([]);

  useEffect(() => {
    setReports(getReports());
  }, [refresh]);

  if (reports.length === 0) {
    return (
      <div className="text-sm text-text-secondary-dark">
        No reports yet. Use the SOS button to create one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="bg-gray-900/40 p-3 rounded-md border border-border-dark">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-semibold">
                <span dangerouslySetInnerHTML={{ __html: escapeHtml(r.name) }} />
                {r.urgent && <span className="text-red-400 text-xs font-medium"> • URGENT</span>}
              </div>
              <div className="text-xs text-text-secondary-dark mt-1" dangerouslySetInnerHTML={{ __html: escapeHtml(r.description || 'No description') }} />
              <div className="text-xs text-text-secondary-dark mt-2">
                📍 <span dangerouslySetInnerHTML={{ __html: escapeHtml(r.location) }} /> • ☎️ <span dangerouslySetInnerHTML={{ __html: escapeHtml(r.phone) }} />
              </div>
            </div>
            <div className="text-xs text-text-secondary-dark">
              {new Date(r.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReportsList;
