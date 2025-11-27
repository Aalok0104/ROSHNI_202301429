import { useState } from 'react';
import type { FC } from 'react';

type AISummaryProps = {
  summary?: string;
};

const AISummary: FC<AISummaryProps> = ({
  summary = 'Key points from the conversation: water levels rising near the bridge, Team Alpha is on-site evacuating residents.',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

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
          {summary}
        </p>
      )}
    </div>
  );
};

export default AISummary;

