import React, { useContext, useState } from 'react';
import api from '../api/axios';
import { useQuery } from '@tanstack/react-query';
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

const MyRoadmap = () => {
  const { role } = useContext(AuthContext);
  const currentRole = (role || '').toLowerCase();
  const { isLoading: chartsLoading } = useDashboardCharts();
  const { data: myIssues = [], isLoading: issuesLoading } = useQuery({
    queryKey: ['myTasks'],
    queryFn: () => api.get('/issues/my-tasks').then(r => r.data)
  });
  const isLoading = chartsLoading || issuesLoading;
  const [view, setView] = useState('timeline');
  const isAdminLevel = role === 'admin' || role === 'superadmin';

  const { data: ganttIssues = [] } = useQuery({
    queryKey: ['roadmapIssues', role],
    queryFn: () => isAdminLevel
      ? api.get('/issues').then(r => r.data)
      : api.get('/issues/my-tasks').then(r => r.data),
    enabled: view === 'gantt'
  });

  const allSprints = [...new Set(ganttIssues
    .map(i => i.sprint)
    .filter(Boolean)
  )].sort();

  const allProjects = [...new Set(ganttIssues
    .map(i => i.projectid)
    .filter(Boolean)
  )];

  const ganttMatrix = allProjects.map(pid => {
    const projectIssues = ganttIssues.filter(i => i.projectid === pid);
    const projectName = projectIssues[0]?.projectname || pid;
    const sprintMap = {};
    allSprints.forEach(s => {
      sprintMap[s] = projectIssues.filter(i => i.sprint === s);
    });
    return { pid, projectName, sprintMap };
  });

  const [ganttProjectFilter, setGanttProjectFilter] = useState('all');
  const [expandedCell, setExpandedCell] = useState(null);

  const filteredGanttMatrix = ganttProjectFilter === 'all'
    ? ganttMatrix
    : ganttMatrix.filter(r => r.pid === ganttProjectFilter);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#6b7280' }}>Building roadmap…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Group real issues assigned to this developer by sprint
  const sprintMap = {};
  myIssues.forEach(issue => {
    const sprint = issue.sprint || 'No Sprint';
    if (!sprintMap[sprint]) sprintMap[sprint] = [];
    sprintMap[sprint].push(issue);
  });
  const sprintData = Object.entries(sprintMap).map(([sprint, issues]) => ({
    sprint,
    count: issues.length,
    issues,
  }));

  const totalIssues    = sprintData.reduce((a, s) => a + s.count, 0);
  const completedSprints = sprintData.filter(s => s.issues.every(i => i.status === 'Done')).length;
  const currentSprintIdx = sprintData.findIndex(s => s.issues.some(i => i.status !== 'Done'));
  const overallPct = totalIssues > 0
    ? Math.round(sprintData.reduce((a, s) => a + s.issues.filter(i => i.status === 'Done').length, 0) / totalIssues * 100)
    : 0;

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: '1.5rem' }}>🗺️</span>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
            Planning Board
          </h1>
          <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
            background: currentRole === 'tester' ? '#f0fdf4' : '#eff6ff',
            color: currentRole === 'tester' ? '#16a34a' : '#2563eb',
            border: currentRole === 'tester' ? '1px solid #bbf7d0' : '1px solid #bfdbfe' }}>
            {currentRole.toUpperCase()}
          </span>
        </div>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.87rem' }}>
          Cross-project sprint execution, Gantt timeline, and delivery tracking
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
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ padding: '4px 12px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 600, background: isAdminLevel ? '#eff6ff' : '#faf5ff', color: isAdminLevel ? '#1d4ed8' : '#7e22ce' }}>
              Viewing: {isAdminLevel ? 'All Projects' : 'Your Assigned Projects'}
            </div>
            <select
              value={ganttProjectFilter}
              onChange={e => { setGanttProjectFilter(e.target.value); setExpandedCell(null); }}
              style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="all">All Projects</option>
              {ganttMatrix.map(p => (
                <option key={p.pid} value={p.pid}>{p.projectName}</option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 200, flexShrink: 0, background: '#0f172a', color: 'white', padding: 12, fontSize: '0.78rem', fontWeight: 700 }}>
                Project
              </div>
              {allSprints.map(s => (
                <div key={s} style={{ width: 140, flexShrink: 0, background: '#1e3a8a', color: 'white', textAlign: 'center', padding: 12, fontSize: '0.78rem', fontWeight: 700, borderLeft: '1px solid #2d4a8a' }}>
                  {s}
                </div>
              ))}
            </div>

            {ganttIssues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</div>
                <p>No project data available.</p>
              </div>
            ) : (
              <div>
                {filteredGanttMatrix.map((row, i) => (
                  <React.Fragment key={row.pid}>
                    <div style={{ display: 'flex', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <div style={{ width: 200, flexShrink: 0, background: '#f8fafc', borderRight: '2px solid #e5e7eb', padding: '0 12px', display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#111827', height: 64 }}>
                        {row.projectName}
                      </div>
                      {allSprints.map(s => {
                        const cellIssues = row.sprintMap[s] || [];
                        const hasIssues = cellIssues.length > 0;
                        let content = null;
                        
                        if (hasIssues) {
                          const done = cellIssues.filter(iss => (iss.status || '').toLowerCase() === 'done' || (iss.status || '').toLowerCase() === 'verified').length;
                          const total = cellIssues.length;
                          const pct = (done / total) * 100;
                          const barColor = pct === 100 ? '#16a34a' : pct > 60 ? '#2563eb' : pct > 30 ? '#d97706' : '#dc2626';
                          
                          content = (
                            <>
                              <div style={{ height: 24, borderRadius: 6, width: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.72rem', fontWeight: 700, background: barColor }}>
                                {done}/{total}
                              </div>
                              <div style={{ height: 4, background: '#e5e7eb', borderRadius: 99, width: '90%', marginTop: 4 }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 99 }} />
                              </div>
                            </>
                          );
                        } else {
                          content = <span style={{ color: '#d1d5db', fontSize: '0.85rem' }}>—</span>;
                        }

                        return (
                          <div 
                            key={s} 
                            onClick={() => { if(hasIssues) setExpandedCell(expandedCell === `${row.pid}-${s}` ? null : `${row.pid}-${s}`); }}
                            style={{ width: 140, flexShrink: 0, height: 64, border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 6, cursor: hasIssues ? 'pointer' : 'default' }}
                          >
                            {content}
                          </div>
                        );
                      })}
                    </div>
                    
                    {allSprints.some(s => expandedCell === `${row.pid}-${s}`) && (
                      (() => {
                        const expandedSprint = allSprints.find(s => expandedCell === `${row.pid}-${s}`);
                        const issues = row.sprintMap[expandedSprint] || [];
                        return (
                          <div style={{ background: '#eff6ff', borderLeft: '3px solid #2563eb', padding: '1rem', borderRadius: '0 0 8px 8px', marginLeft: 200 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <strong style={{ color: '#1e3a8a', fontSize: '0.9rem' }}>{expandedSprint} Details</strong>
                              <button onClick={() => setExpandedCell(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: '#6b7280' }}>×</button>
                            </div>
                            {issues.length === 0 ? (
                              <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No issues for this sprint</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {issues.map(iss => {
                                  const typeLower = (iss.issuetype || '').toLowerCase();
                                  const typeBg = typeLower === 'bug' ? '#ef4444' : typeLower === 'task' ? '#3b82f6' : typeLower === 'story' ? '#10b981' : '#6b7280';
                                  const statusDone = (iss.status || '').toLowerCase() === 'done';
                                  const statusBg = statusDone ? '#16a34a' : '#6b7280';
                                  
                                  return (
                                    <div key={iss.issueid || iss.issue_id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', background: '#fff', padding: '6px 12px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                                      <span style={{ color: '#94a3b8', width: 40 }}>#{iss.issueid || iss.issue_id}</span>
                                      <span style={{ background: typeBg, color: 'white', borderRadius: 99, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>{iss.issuetype || 'Issue'}</span>
                                      <span style={{ flex: 1, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {iss.description ? (iss.description.length > 50 ? iss.description.substring(0,50)+'...' : iss.description) : 'No description'}
                                      </span>
                                      <span style={{ background: statusBg, color: 'white', borderRadius: 99, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>{iss.status || 'Open'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: '1rem', flexWrap: 'wrap' }}>
            {[
              { color: '#16a34a', label: 'Completed' },
              { color: '#2563eb', label: 'On Track' },
              { color: '#d97706', label: 'At Risk' },
              { color: '#dc2626', label: 'Behind' },
            ].map(lg => (
              <div key={lg.color} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, background: lg.color, borderRadius: 2 }} />
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{lg.label}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 8 }}>
            Bar color reflects sprint completion rate · Click any cell to see issues
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
