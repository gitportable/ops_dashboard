import React from 'react';

const IssueDetailModal = ({ isOpen, onClose, issue }) => {
  React.useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !issue) return null;

  const history = Array.isArray(issue.workflow_history) 
    ? issue.workflow_history 
    : typeof issue.workflow_history === 'string' 
      ? JSON.parse(issue.workflow_history) 
      : [];

  return (
    <div 
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 20000, display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div 
        style={{ width: '500px', background: '#fff', height: '100%', padding: '2rem', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Issue Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          <span style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>#{issue.issueid}</span>
          <span style={{ padding: '4px 12px', background: issue.issuetype === 'Bug' ? '#fee2e2' : '#eff6ff', color: issue.issuetype === 'Bug' ? '#ef4444' : '#3b82f6', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700 }}>{issue.issuetype}</span>
        </div>

        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Description</h3>
          <p style={{ margin: 0, color: '#1e293b', lineHeight: 1.6, fontSize: '0.95rem' }}>{issue.description || "No description provided."}</p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Project</h3>
            <p style={{ margin: 0, fontWeight: 700 }}>{issue.projectid}</p>
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Assignee</h3>
            <p style={{ margin: 0, fontWeight: 700 }}>{issue.assignee || "Unassigned"}</p>
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Priority</h3>
            <span style={{ 
                padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700,
                background: issue.priority === 'Critical' || issue.priority === 'High' ? '#fee2e2' : '#f1f5f9',
                color: issue.priority === 'Critical' || issue.priority === 'High' ? '#ef4444' : '#64748b'
            }}>
                {issue.priority || "Medium"}
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Status</h3>
            <p style={{ margin: 0, fontWeight: 700 }}>{issue.status}</p>
          </div>
        </div>

        {(issue.batch_lot || issue.production_stage) && (
          <section style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Manufacturing Info</h3>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Batch / Lot</span>
                <p style={{ margin: 0, fontWeight: 600 }}>{issue.batch_lot || '-'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Production Stage</span>
                <p style={{ margin: 0, fontWeight: 600 }}>{issue.production_stage || '-'}</p>
              </div>
            </div>
          </section>
        )}

        {issue.subtasks?.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}>Subtasks / Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {issue.subtasks.map((st, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <input type="checkbox" checked={st.done} readOnly style={{ cursor: 'not-allowed' }} />
                  <span style={{ fontSize: '0.9rem', color: st.done ? '#94a3b8' : '#1e293b', textDecoration: st.done ? 'line-through' : 'none' }}>{st.text}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}>Workflow History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1rem', borderLeft: '2px solid #f1f5f9' }}>
            {history.length > 0 ? history.map((h, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: -21, top: 2, width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', border: '2px solid #fff' }} />
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{h.to}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {new Date(h.date).toLocaleString()} by {h.user}
                  {h.from && ` (from ${h.from})`}
                </div>
              </div>
            )) : <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No history records yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default IssueDetailModal;
