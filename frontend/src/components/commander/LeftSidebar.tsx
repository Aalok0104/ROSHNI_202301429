import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FC, RefObject } from 'react';
import AISummary from './AISummary';
import ChatWindow from './ChatWindow';
import { jsPDF } from 'jspdf';

type LeftSidebarProps = {
  onGenerateReport?: () => void;
};

const DEFAULT_SUMMARY =
  'Key points from the conversation: water levels are rising near the bridge, Team Alpha is on-site evacuating residents.';

const LeftSidebar: FC<LeftSidebarProps> = ({ onGenerateReport }) => {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState<string>(DEFAULT_SUMMARY);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const handleCreateGroup = () => {
    // TODO: implement commander group creation flow
  };

  useEffect(() => {
    // Populate the contentEditable editor once when the modal opens so we don't
    // re-render the innerHTML on every keystroke (which resets the caret).
    if (isReportModalOpen && editorRef.current) {
      editorRef.current.innerHTML = reportContent;
      // move caret to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isReportModalOpen]);

  return (
    <div className="commander-panel left">
      <button type="button" className="commander-button primary" onClick={handleCreateGroup}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Create New Group
      </button>

      <div className="live-feed">
        <h2 className="live-feed-title">Live Feed</h2>
        <AISummary summary={DEFAULT_SUMMARY} />
        <ChatWindow />
      </div>

      <button
        type="button"
        className="commander-button emergency"
        onClick={() => {
          setReportContent(DEFAULT_SUMMARY);
          setIsReportModalOpen(true);
          onGenerateReport?.();
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 9h12M6 13h12M6 17h8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 5h8l2 4H6l2-4Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Generate Report
      </button>

      {isReportModalOpen && createPortal(
        <div className="report-modal" role="dialog" aria-modal="true">
          <div className="report-modal__content">
            <header className="report-modal__header">
              <div>
                <p className="title">Incident Report Draft</p>
                <p className="meta">Loaded from AI Summary • {new Date().toLocaleString()}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setIsReportModalOpen(false)}>
                ×
              </button>
            </header>

            <div className="report-editor-toolbar">
              <button type="button" onClick={() => execEditorCommand('bold', editorRef)}>B</button>
              <button type="button" onClick={() => execEditorCommand('italic', editorRef)}>I</button>
              <button type="button" onClick={() => execEditorCommand('underline', editorRef)}>U</button>
              <button type="button" onClick={() => execEditorCommand('insertUnorderedList', editorRef)}>
                • List
              </button>
            </div>

            <div
              className="report-editor"
              contentEditable
              ref={editorRef}
              onInput={(event) => setReportContent((event.target as HTMLDivElement).innerHTML)}
              // We no longer use `dangerouslySetInnerHTML` on every render to avoid
              // resetting the caret position when the user types. Instead we populate
              // the editor only when the modal opens (or on explicit resets).
            />

            <div className="report-modal__actions">
              <button
                type="button"
                onClick={() => {
                  setReportContent(DEFAULT_SUMMARY);
                  if (editorRef.current) {
                    editorRef.current.innerHTML = DEFAULT_SUMMARY;
                    // move caret to end after reset
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(editorRef.current);
                    range.collapse(false);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                  }
                }}
              >
                Reset to AI Summary
              </button>
              <button type="button" className="commander-button emergency" onClick={() => exportPdf(reportContent)}>
                Export as PDF
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

const execEditorCommand = (command: string, editorRef: RefObject<HTMLDivElement | null>) => {
  // focus before executing to ensure the selection is inside the editor
  editorRef.current?.focus();
  document.execCommand(command, false);
};

const exportPdf = (htmlContent: string) => {
  const doc = new jsPDF();
  const incidentType = 'Flood Response';
  const location = 'North Bridge Sector';
  const dateTime = new Date().toLocaleString();

  doc.setFontSize(16);
  doc.text('ROSHNI Incident Report', 14, 20);
  doc.setFontSize(11);
  doc.text(`Date: ${dateTime}`, 14, 30);
  doc.text(`Incident Type: ${incidentType}`, 14, 38);
  doc.text(`Location: ${location}`, 14, 46);

  doc.setFontSize(12);
  doc.text('Summary', 14, 60);

  const plainText = htmlContent.replace(/<\/?[^>]+(>|$)/g, '');
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(plainText, 180), 14, 70);

  doc.save('incident-report.pdf');
};

export default LeftSidebar;

