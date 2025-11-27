import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { jsPDF } from 'jspdf';

type Props = {
  disasterId: string;
  onClose: () => void;
  onGenerated?: (report: any) => void;
};

const GenerateReportModal: React.FC<Props> = ({ disasterId, onClose, onGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [reportContent, setReportContent] = useState<string>('Key points: incident reported, responders dispatched.');
  const editorRef = useRef<HTMLDivElement | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/disasters/${encodeURIComponent(disasterId)}/generate`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Generate report failed', res.status, txt);
        alert(`Failed to generate report: ${txt || res.status}`);
        return;
      }
      let report = await res.json();
      // If the user edited the report content, update the draft on the server
      try {
        const plainText = reportContent ? reportContent.replace(/<[^>]+>/g, '') : '';
        const patchRes = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(report.report_id)}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ damage_summary: plainText })
        });
        if (patchRes.ok) {
          report = await patchRes.json();
        } else {
          console.warn('Failed to patch report with edited content', patchRes.status);
        }
      } catch (e) {
        console.error('Error patching report', e);
      }

      if (onGenerated) onGenerated(report);

      // Attempt to download PDF for the generated report from backend
      try {
        const pdfRes = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(report.report_id)}/pdf`, {
          method: 'GET',
          credentials: 'include'
        });

        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const filename = `report_${report.report_id || report.version_number || 'draft'}.pdf`;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } else {
          // Backend PDF not available — fall back to client-side PDF export like dashboard
          console.warn('PDF export returned', pdfRes.status);
          exportPdf(reportContent, `report_${report.report_id || 'draft'}.pdf`);
          alert('Report draft generated — saved locally as PDF.');
        }
      } catch (err) {
        console.error('Failed to fetch PDF', err);
        // Fallback to client-side export so user still gets a PDF
        exportPdf(reportContent, `report_${report.report_id || 'draft'}.pdf`);
        alert('Report draft generated — saved locally as PDF.');
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to generate report. See console.');
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = (htmlContent: string, filename = 'incident-report.pdf') => {
    try {
      const doc = new jsPDF();
      const dateTime = new Date().toLocaleString();

      doc.setFontSize(16);
      doc.text('ROSHNI Incident Report', 14, 20);
      doc.setFontSize(11);
      doc.text(`Date: ${dateTime}`, 14, 30);

      doc.setFontSize(12);
      doc.text('Summary', 14, 46);

      const plainText = htmlContent ? htmlContent.replace(/<[^>]+>/g, '') : '';
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(plainText, 180), 14, 56);

      doc.save(filename);
    } catch (e) {
      console.error('Failed to export PDF client-side', e);
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = reportContent;
      // move caret to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  const execEditorCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
  };

  return (
    <div style={backdropStyle}>
      <div style={modalStyle} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Generate Disaster Report</h3>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">✕</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="title">Disaster Report Draft</p>
              <p className="meta" style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>{new Date().toLocaleString()}</p>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>×</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button type="button" onClick={() => execEditorCommand('bold')} className="commander-button">B</button>
              <button type="button" onClick={() => execEditorCommand('italic')} className="commander-button">I</button>
              <button type="button" onClick={() => execEditorCommand('underline')} className="commander-button">U</button>
              <button type="button" onClick={() => execEditorCommand('insertUnorderedList')} className="commander-button">• List</button>
            </div>

            <div
              className="report-editor"
              contentEditable
              ref={editorRef}
              onInput={(event) => setReportContent((event.target as HTMLDivElement).innerHTML)}
              style={{ minHeight: 160, borderRadius: 8, padding: 12 }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setReportContent('Key points: incident reported, responders dispatched.');
                  if (editorRef.current) editorRef.current.innerHTML = 'Key points: incident reported, responders dispatched.';
                }}
              >
                Reset to AI Summary
              </button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="discard-btn"
                    onClick={onClose}
                    disabled={loading}
                    style={{ padding: '6px 10px', fontSize: 13, height: 34 }}
                  >
                    Cancel
                  </button>

                  <button
                    className="commander-button emergency"
                    onClick={handleGenerate}
                    disabled={loading}
                    style={{ padding: '6px 10px', fontSize: 13, height: 34, display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M6 9h12M6 13h12M6 17h8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 5h8l2 4H6l2-4Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {loading ? 'Generating…' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 };
const modalStyle: React.CSSProperties = { width: 520, maxWidth: '94%', background: 'var(--panel-bg, #071024)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 18 };
const closeButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' };

export default GenerateReportModal;
