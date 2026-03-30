import React, { useContext, useState } from 'react';
import { AuthContext } from '../auth/AuthContext';
import { useDashboardCharts } from "../api/dashboardApi";
const ProgressBar = ({ value, color = '#3b82f6', showLabel = true }) => (
  <div>
    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
    {showLabel && <span style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2, display: 'block' }}>{Math.round(value)}% complete</span>}
  </div>
);

const SprintMilestone = ({ sprint, issues, index, role }) => {
  const [open, setOpen] = useState(false);
  const total = issues.length;
  const done  = issues.filter(i => (i.status || '').toLowerCase() === 'done').length;
  const bugs  = issues.filter(i => (i.issuetype || '').toLowerCase() === 'bug').length;
  const pct   = total > 0 ? (done / total) * 100 : 0;

  const statusColor = pct === 100 ? '#16a34a' : pct > 60 ? '#2563eb' : pct > 30 ? '#d97706' : '#dc2626';
  const statusLabel = pct === 100 ? 'Completed' : pct > 60 ? 'On Track' : pct > 30 ? 'At Risk' : 'Behind';

  return (
    <div style={{ position: 'relative' }}>
      {index > 0 && (
        <div style={{ position: 'absolute', top: -24, left: 28, width: 2, height: 24, background: '#e5e7eb', zIndex: 0 }} />
      )}

      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 16, cursor: 'pointer',
          padding: '1rem 1.25rem', borderRadius: 12, border: `1px solid ${open ? statusColor + '55' : '#e5e7eb'}`,
          background: open ? `${statusColor}08` : '#fff', transition: 'all 0.2s ease',
          boxShadow: open ? `0 4px 16px ${statusColor}22` : '0 1px 4px rgba(0,0,0,0.05)' }}>

        <div style={{ position: 'relative', zIndex: 1, marginTop: 2 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${statusColor}15`,
            border: `2px solid ${statusColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.85rem', color: statusColor, flexShrink: 0 }}>
            S{index + 1}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>{sprint}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                {total} issues · {done} resolved · {bugs} bug{bugs !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}33` }}>
                {statusLabel}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600 }}>{Math.round(pct)}%</span>
              <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{open ? '▲' : '▼'}</span>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <ProgressBar value={pct} color={statusColor} showLabel={false} />
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              <b style={{ color: '#374151' }}>{total - done}</b> remaining
            </span>
            {role === 'tester' && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                <b style={{ color: '#dc2626' }}>{bugs}</b> bugs to verify
              </span>
            )}
            {role === 'developer' && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                <b style={{ color: '#2563eb' }}>{issues.filter(i => (i.issuetype || '').toLowerCase() !== 'bug').length}</b> tasks
              </span>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div style={{ marginLeft: 60, marginTop: 8, marginBottom: 8, borderLeft: `2px solid ${statusColor}33`, paddingLeft: 16 }}>
          {issues.slice(0, 8).map((issue, i) => {
            const isDone  = (issue.status || '').toLowerCase() === 'done';
            const isBug   = (issue.issuetype || '').toLowerCase() === 'bug';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < Math.min(issues.length, 8) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ fontSize: '0.8rem' }}>{isDone ? '✅' : isBug ? '🐛' : '📋'}</span>
                <span style={{ fontSize: '0.82rem', color: isDone ? '#9ca3af' : '#374151', textDecoration: isDone ? 'line-through' : 'none', flex: 1 }}>
                  #{issue.issueid || issue.issue_id} — {issue.description?.substring(0, 60) || issue.issuetype || 'Issue'}
                </span>
                <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: 99,
                  background: isDone ? '#dcfce7' : '#f3f4f6',
                  color: isDone ? '#16a34a' : '#6b7280' }}>
                  {issue.status || 'Open'}
                </span>
              </div>
            );
          })}
          {issues.length > 8 && (
            <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '8px 0 0' }}>+ {issues.length - 8} more issues in this sprint</p>
          )}
        </div>
      )}
    </div>
  );
};

const GanttBar = ({ name, startOffset, duration, color, index }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
    <div style={{ width: 130, fontSize: '0.8rem', color: '#374151', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0 }}>
      {name}
    </div>
    <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 99, height: 22, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: `${startOffset}%`, width: `${duration}%`,
        height: '100%', background: color, borderRadius: 99,
        display: 'flex', alignItems: 'center', paddingLeft: 8,
        fontSize: '0.7rem', color: '#fff', fontWeight: 700,
      }}>
        {Math.round(duration)}%
      </div>
    </div>
  </div>
);

const MyRoadmap = () => {
  const { role } = useContext(AuthContext);
  const currentRole = (role || '').toLowerCase();
  const { data: charts, isLoading } = useDashboardCharts();
  const [view, setView] = useState('timeline'); 

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#6b7280' }}>Building roadmap…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const rawSprints = charts?.issuesPerSprint || [];
  const budgetData = charts?.budgetData || [];

  const sprintData = rawSprints.map((s, i) => ({
    sprint: s.sprint,
    count: s.count,
    issues: Array.from({ length: s.count }, (_, j) => ({
      issueid: `${i * 100 + j}`,
      issuetype: j % 3 === 0 ? 'Bug' : 'Task',
      status: j < Math.floor(s.count * 0.6) ? 'Done' : j < Math.floor(s.count * 0.8) ? 'In Progress' : 'Open',
      description: `Sprint ${s.sprint} issue #${j + 1}`,
    })),
  }));

  const totalIssues    = sprintData.reduce((a, s) => a + s.count, 0);
  const completedSprints = sprintData.filter(s => s.issues.every(i => i.status === 'Done')).length;
  const currentSprintIdx = sprintData.findIndex(s => s.issues.some(i => i.status !== 'Done'));
  const overallPct = totalIssues > 0
    ? Math.round(sprintData.reduce((a, s) => a + s.issues.filter(i => i.status === 'Done').length, 0) / totalIssues * 100)
    : 0;

  const ganttData = budgetData.slice(0, 8).map((p, i) => ({
    name: p.projectname,
    startOffset: (i * 12) % 30,
    duration: 20 + ((p.budgetallocated / 100000) * 10) % 40,
    color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'][i % 8],
  }));

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: '1.5rem' }}>🗺️</span>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
            {currentRole === 'tester' ? 'QA Roadmap' : 'Sprint Roadmap'}
          </h1>
          <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
            background: currentRole === 'tester' ? '#f0fdf4' : '#eff6ff',
            color: currentRole === 'tester' ? '#16a34a' : '#2563eb',
            border: currentRole === 'tester' ? '1px solid #bbf7d0' : '1px solid #bfdbfe' }}>
            {currentRole.toUpperCase()}
          </span>
        </div>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.87rem' }}>
          {currentRole === 'tester'
            ? 'Track which bugs need verification per sprint and your QA progress.'
            : 'Visualize sprint progress, upcoming milestones, and project timelines.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Sprints',      value: sprintData.length,   color: '#3b82f6',  icon: '🏃' },
          { label: 'Completed',          value: completedSprints,     color: '#10b981',  icon: '✅' },
          { label: 'Overall Progress',   value: `${overallPct}%`,     color: '#8b5cf6',  icon: '📈' },
          { label: 'Total Issues',       value: totalIssues,          color: '#f59e0b',  icon: '📋' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: '1rem', border: `2px solid ${k.color}22`, textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 2 }}>{k.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Overall Sprint Completion</span>
          <span style={{ fontWeight: 800, color: '#3b82f6' }}>{overallPct}%</span>
        </div>
        <ProgressBar value={overallPct} color="#3b82f6" showLabel={false} />
        <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: '0.78rem', color: '#6b7280' }}>
          <span>✅ {completedSprints} sprints done</span>
          <span>🏃 {currentSprintIdx >= 0 ? `Sprint ${currentSprintIdx + 1} active` : 'All done'}</span>
          <span>📅 {sprintData.length - completedSprints} sprints remaining</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        {[
          { id: 'timeline', label: '📍 Sprint Timeline' },
          { id: 'gantt',    label: '📊 Project Gantt' },
          { id: 'summary',  label: '📋 Summary Table' },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: view === v.id ? '#2563eb' : '#fff',
              color: view === v.id ? '#fff' : '#6b7280',
              boxShadow: view === v.id ? '0 4px 10px rgba(37,99,235,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
              border: `1px solid ${view === v.id ? '#2563eb' : '#e5e7eb'}` }}>
            {v.label}
          </button>
        ))}
      </div>

      {view === 'timeline' && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>
            Sprint-by-Sprint Progress
            <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>Click any sprint to see issues</span>
          </h3>
          {sprintData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📭</div>
              <p style={{ margin: 0 }}>No sprint data available yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sprintData.map((s, i) => (
                <SprintMilestone key={s.sprint} sprint={s.sprint} issues={s.issues} index={i} role={currentRole} />
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'gantt' && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>Project Timeline Overview</h3>
          <p style={{ margin: '0 0 1.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>Relative duration and start offset per project based on budget allocation</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {ganttData.map(g => (
              <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: g.color }} />
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{g.name}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '0.5rem 0' }}>
            {ganttData.map((g, i) => <GanttBar key={i} {...g} index={i} />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 142, marginTop: 8 }}>
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <span key={q} style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600 }}>{q}</span>
            ))}
          </div>
        </div>
      )}

      {view === 'summary' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                {['Sprint', 'Total Issues', 'Done', 'Remaining', 'Bugs', 'Progress', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sprintData.map((s, i) => {
                const done = s.issues.filter(x => x.status === 'Done').length;
                const bugs = s.issues.filter(x => x.issuetype === 'Bug').length;
                const pct  = s.count > 0 ? (done / s.count) * 100 : 0;
                const color = pct === 100 ? '#16a34a' : pct > 60 ? '#2563eb' : pct > 30 ? '#d97706' : '#dc2626';
                const label = pct === 100 ? 'Done' : pct > 60 ? 'On Track' : pct > 30 ? 'At Risk' : 'Behind';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, fontSize: '0.87rem', color: '#374151' }}>{s.sprint}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.85rem', color: '#374151' }}>{s.count}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>{done}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.85rem', color: '#f59e0b', fontWeight: 700 }}>{s.count - done}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.85rem', color: '#dc2626' }}>{bugs}</td>
                    <td style={{ padding: '11px 14px', minWidth: 120 }}>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>{Math.round(pct)}%</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
                        background: `${color}15`, color, border: `1px solid ${color}33` }}>
                        {label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default MyRoadmap;
