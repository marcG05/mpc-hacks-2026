import { useState } from 'react';
import { Icon } from '../../../components';
import type { Transaction } from '../../../types';

interface EscalationModalProps {
  activeTx: Transaction;
  onClose: () => void;
  onConfirm: (notes: string, unableToDetermine: boolean, department: string, assignee: string, hasRecording: boolean) => void;
}

export function EscalationModal({ activeTx, onClose, onConfirm }: EscalationModalProps) {
  const [escalationNotes, setEscalationNotes] = useState('');
  const [unableToDetermine, setUnableToDetermine] = useState(true);
  const [escalationDept, setEscalationDept] = useState('Payments Compliance');
  const [escalationAssignee, setEscalationAssignee] = useState('Marcus Aurelius (L2 Lead)');
  
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);

  const handleToggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecording(true);
    } else {
      setIsRecording(true);
      setHasRecording(false);
    }
  };

  const handleSubmit = () => {
    onConfirm(escalationNotes, unableToDetermine, escalationDept, escalationAssignee, hasRecording);
  };

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
        maxWidth: 500,
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
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              Escalate Transaction Triage Package
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
          <div style={{ padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="mono" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{activeTx.id}</span>
              <span style={{ fontWeight: 600, color: 'var(--critical)' }}>${activeTx.amount.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
              Merchant: {activeTx.merchant} · Category: {activeTx.category}
            </div>
          </div>
 
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' }}>Triage Assessment Notes</label>
            <textarea 
              value={escalationNotes}
              onChange={(e) => setEscalationNotes(e.target.value)}
              placeholder="Describe what you found sketchy or suspicious about this transaction..."
              style={{
                width: '100%',
                height: 90,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 10,
                color: 'var(--text)',
                fontSize: 12.5,
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
 
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox"
              checked={unableToDetermine}
              onChange={(e) => setUnableToDetermine(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              Unable to determine final solution (Requires L2 senior review)
            </span>
          </label>
 
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' }}>Assign Department</label>
              <select
                value={escalationDept}
                onChange={(e) => setEscalationDept(e.target.value)}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px',
                  color: 'var(--text)',
                  fontSize: 12,
                  outline: 'none'
                }}
              >
                <option value="Payments Compliance">Payments Compliance</option>
                <option value="Chargeback Operations">Chargeback Operations</option>
                <option value="Identity Verification Desk">Identity Verification Desk</option>
                <option value="Security Engineering">Security Engineering</option>
              </select>
            </div>
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)' }}>Assign Team Lead</label>
              <select
                value={escalationAssignee}
                onChange={(e) => setEscalationAssignee(e.target.value)}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px',
                  color: 'var(--text)',
                  fontSize: 12,
                  outline: 'none'
                }}
              >
                <option value="Marcus Aurelius (L2 Lead)">Marcus Aurelius (L2 Lead)</option>
                <option value="Sarah Jenkins (Senior Compliance)">Sarah Jenkins (Senior Compliance)</option>
                <option value="David Vance (Risk Operations Manager)">David Vance (Risk Operations Manager)</option>
                <option value="Ellen Ripley (Fraud Lead)">Ellen Ripley (Fraud Lead)</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          background: 'var(--surface-2)'
        }}>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="btn btn-primary btn-sm"
            style={{ background: 'var(--accent)', borderColor: 'var(--accent-line)', color: '#fff' }}
          >
            Submit & Dispatch Report
          </button>
        </div>
      </div>
    </div>
  );
}
