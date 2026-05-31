import { Icon } from '../../../components';
import type { Transaction } from '../../../types';
import type { EscalatedReport } from '../types';

interface ReportViewerModalProps {
  viewingReport: EscalatedReport;
  associatedTx: Transaction | null;
  onClose: () => void;
  onDownloadPDF: (report: EscalatedReport) => void;
}

export function ReportViewerModal({
  viewingReport,
  associatedTx,
  onClose,
  onDownloadPDF
}: ReportViewerModalProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        width: '100%',
        maxWidth: 550,
        background: 'var(--surface)',
        border: '1px solid var(--border-hi)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="escalate" size={16} style={{ color: 'var(--accent-hi)' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#000' }}>
              Escalation Dispatch Triage Package
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 0, color: 'var(--text-3)', cursor: 'pointer' }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 150px)' }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="mono" style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>{viewingReport.txId}</span>
              <span style={{ fontWeight: 700, color: 'var(--critical)', fontSize: 14 }}>${viewingReport.amount.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              Merchant: {associatedTx?.merchant || 'Associated Merchant'} · Category: {associatedTx?.category || 'Category'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Dispatched: {viewingReport.timestamp}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Assigned Department</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{viewingReport.department}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Assigned Owner</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-hi)' }}>{viewingReport.assignee}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(233,138,69,0.05)', border: '1px solid rgba(233,138,69,0.15)', borderRadius: 'var(--radius-sm)' }}>
            <Icon name="info" size={14} style={{ color: 'var(--medium)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {viewingReport.unableToDetermine ? (
                <strong>L2 Action Required: Analyst unable to determine final solution.</strong>
              ) : (
                'Analyst Escalated for Standard Review.'
              )}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)' }}>Analyst Insight Notes:</div>
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: 12,
              color: 'var(--text-2)',
              fontSize: 12.5,
              lineHeight: 1.5,
              whiteSpace: 'pre-line',
              minHeight: 60
            }}>
              {viewingReport.notes || '(No notes attached)'}
            </div>
          </div>
        </div>

        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--surface-2)',
          gap: 10
        }}>
          <button 
            onClick={() => onDownloadPDF(viewingReport)}
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-hi)', cursor: 'pointer' }}
          >
            <Icon name="note" size={14} /> Download PDF
          </button>
          <button 
            onClick={onClose}
            className="btn btn-primary btn-sm"
            style={{ background: 'var(--accent)', borderColor: 'var(--accent-line)', color: '#fff', cursor: 'pointer' }}
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
