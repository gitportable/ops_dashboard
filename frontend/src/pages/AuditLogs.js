import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { getTriggeredAlerts } from '../api/inventoryAlertApi';

const fetchHealth = () => api.get('/admin/system-health').then(r => r.data);
const fetchLogs   = (page, limit) => api.get(`/admin/audit-logs?page=${page}&limit=${limit}`).then(r => r.data);
const fetchWorkOrders = () => api.get('/work-orders').then(r => Array.isArray(r.data) ? r.data : r.data.data || []);
const fetchBatches = () => api.get('/batches').then(r => Array.isArray(r.data) ? r.data : r.data.data || []);
const fetchMachines = () => api.get('/machines').then(r => Array.isArray(r.data) ? r.data : r.data.data || []);
const fetchFieldTickets = () => api.get('/field-tickets').then(r => Array.isArray(r.data) ? r.data : r.data.data || []);

const MetricCard = ({ label, value, color = '#1d4ed8', sub }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', flex: 1, minWidth: 200, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${color}` }}>
    <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 6 }}>{sub}</div>}
  </div>
);

const SolarKpiCard = ({ icon, label, count, alert }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, minWidth: 220, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
    <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        {count ?? '—'}
        {alert && <div className="pulse-dot" />}
      </div>
    </div>
  </div>
);

const Dot = ({ ok }) => (
  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: ok ? '#16a34a' : '#dc2626', marginRight: 8 }} />
);

function timeAgo(dateString) {
  if (!dateString) return 'Just now';
  const diff = Math.max(0, Date.now() - new Date(dateString).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const AuditLogs = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState('all');
  const [search, setSearch]           = useState('');
  const LIMIT = 30;

  const { data: health, isError: hE, refetch: refetchHealth } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: fetchHealth,
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: logs = [], isLoading: lL, isError: lE } = useQuery({
    queryKey: ['auditLogs', currentPage],
    queryFn: () => fetchLogs(currentPage, LIMIT),
    staleTime: 60 * 1000,
  });

  const { data: workOrders = [] } = useQuery({ queryKey: ['workOrders'], queryFn: fetchWorkOrders, refetchInterval: 30000 });
  const { data: batches = [] } = useQuery({ queryKey: ['batches'], queryFn: fetchBatches, refetchInterval: 30000 });
  const { data: machines = [] } = useQuery({ queryKey: ['machines'], queryFn: fetchMachines, refetchInterval: 30000 });
  const { data: fieldTickets = [] } = useQuery({ queryKey: ['fieldTickets'], queryFn: fetchFieldTickets, refetchInterval: 30000 });

  const { data: triggeredAlerts = [] } = useQuery({ queryKey: ['triggeredAlerts'], queryFn: getTriggeredAlerts });

  const issuesByStatus = health?.issuesByStatus || [];
  const totalIssues    = issuesByStatus.reduce((s, r) => s + parseInt(r.count || 0), 0);
  const doneCount      = issuesByStatus.find(r => r.status?.toLowerCase() === 'done')?.count || 0;

  // Computed health score
  const issueScore = totalIssues > 0 ? (doneCount / totalIssues) * 40 : 40;
  const activeServices = (health?.dbStatus === 'connected' ? 1 : 0) + 2; // DB + API + Auth
  const serviceScore = (activeServices / 3) * 40;
  const totalMachines = machines.length;
  const downMachines = machines.filter(m => m.status === 'Down' || m.status === 'Maintenance').length;
  const onlineMachines = totalMachines - downMachines;
  const machineScore = totalMachines > 0 ? (onlineMachines / totalMachines) * 20 : 20;

  const healthScore = Math.round(issueScore + serviceScore + machineScore);
  const healthColor = healthScore >= 80 ? '#16a34a' : healthScore >= 50 ? '#f97316' : '#dc2626';
  const overallStatusText = healthScore >= 80 ? 'Operational' : healthScore >= 50 ? 'Degraded' : 'Critical';

  // KPIs
  const activeWorkOrders = workOrders.filter(w => w.status === 'Open' || w.status === 'In Progress').length;
  const batchesInQC = batches.filter(b => b.qc_status === 'Pending').length;
  const openFieldTickets = fieldTickets.filter(f => f.status === 'Open').length;
  const openIssues = totalIssues - doneCount;

  // Alerts
  const alerts = [];
  if (downMachines > 0) {
    alerts.push({ severity: 'High', color: '#dc2626', icon: '🚨', message: `${downMachines} machine(s) currently Down or Under Maintenance` });
  }
  if (batchesInQC > 3) {
    alerts.push({ severity: 'Medium', color: '#f97316', icon: '⏳', message: `${batchesInQC} batches awaiting QC clearance` });
  }
  if (openFieldTickets > 2) {
    alerts.push({ severity: 'Medium', color: '#f97316', icon: '🔧', message: `${openFieldTickets} field service tickets unresolved` });
  }
  if (openIssues > 5) {
    alerts.push({ severity: 'Low', color: '#eab308', icon: '📋', message: `${openIssues} open issues across all projects` });
  }
  triggeredAlerts.forEach(a => {
    alerts.push({
      severity: a.alert_level === 'Critical' ? 'High' : 'Medium',
      color: a.alert_level === 'Critical' ? '#dc2626' : '#f97316',
      icon: '📦',
      message: `${a.material_type} stock below threshold — ${a.current_quantity} units remaining`
    });
  });

  // Live Activity Feed
  const feedItems = [
    ...workOrders.map(w => ({ type: 'Work Order', title: w.title || `Work Order #${w.id}`, status: w.status, time: w.created_at || w.updated_at, color: '#3b82f6' })),
    ...batches.map(b => ({ type: 'Batch', title: `Batch ${b.lot_number}`, status: b.qc_status, time: b.received_date || b.created_at || b.updated_at, color: '#10b981' })),
    ...fieldTickets.map(f => ({ type: 'Field Ticket', title: f.title || `Ticket #${f.id}`, status: f.status, time: f.created_at || f.updated_at, color: '#8b5cf6' }))
  ].filter(i => i.time).sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

  const filteredLogs = logs.filter(l => {
    const matchLevel  = levelFilter === 'all' || l.level === levelFilter;
    const matchSearch = !search ||
      (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.resource || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.user_name || '').toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        .pulse-dot {
          width: 14px;
          height: 14px;
          background: #dc2626;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
      `}</style>
      
      <div style={{ background: '#0f172a', padding: '2rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: 0 }}>Mission Control</h1>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: healthColor, boxShadow: `0 0 8px ${healthColor}` }} />
              {overallStatusText}
            </div>
          </div>
          <p style={{ color: '#94a3b8', margin: '8px 0 0', fontSize: '0.95rem' }}>
            Real-time operational health for OpsDash Solar MNC
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 10 }}>
            Last refreshed: {health?.serverTime ? new Date(health.serverTime).toLocaleTimeString() : new Date().toLocaleTimeString()}
          </div>
          <button onClick={refetchHealth}
            style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#fff', transition: 'background 0.2s' }}>
            ↻ Force Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '2rem 2.5rem' }}>
        {hE && (
          <div style={{ padding: '1.25rem', background: '#fef2f2', color: '#dc2626', borderRadius: 12, marginBottom: '2rem', border: '1px solid #fecaca', fontWeight: 500 }}>
            Could not fetch system health data. Check that the backend <code>/api/admin/system-health</code> endpoint is running.
          </div>
        )}

        {!hE && (
          <div style={{ display: 'flex', gap: 16, marginBottom: '2rem', flexWrap: 'wrap' }}>
            <MetricCard label="Active Users (1h)" value={health?.activeUsers ?? 0} color="#1d4ed8" />
            <MetricCard label="Total Projects"    value={health?.totalProjects ?? '—'} color="#16a34a" />
            <MetricCard label="Total Users"       value={health?.totalUsers ?? '—'} color="#a16207" />
            <MetricCard label="Total Issues"      value={totalIssues} color="#7c3aed"
              sub={totalIssues > 0 ? `${Math.round((doneCount/totalIssues)*100)}% resolved` : 'No issues tracked'}
            />
          </div>
        )}

        {/* Section 1: Production Health Score */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '2.5rem', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="60" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle cx="70" cy="70" r="60" fill="none" stroke={healthColor} strokeWidth="12" strokeDasharray={`${(healthScore/100) * 377} 377`} strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition: 'stroke-dasharray 1s ease-out' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{healthScore}%</span>
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>System Health Score</h2>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '1rem' }}>Based on issue resolution, service uptime, and machine status.</p>
          </div>
        </div>

        {/* Section 2: Solar Operations KPI row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: '2rem', flexWrap: 'wrap' }}>
          <SolarKpiCard icon="📋" label="Active Work Orders" count={activeWorkOrders} />
          <SolarKpiCard icon="🔬" label="Batches in QC" count={batchesInQC} />
          <SolarKpiCard icon="⚙️" label="Machines Down" count={downMachines} alert={downMachines > 0} />
          <SolarKpiCard icon="🔧" label="Open Field Tickets" count={openFieldTickets} alert={openFieldTickets > 0} />
        </div>

        {/* Section 3: Alert Center */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 1.25rem 0' }}>⚠️ Active Alerts</h2>
          {alerts.length === 0 ? (
            <div style={{ padding: '1.25rem', background: '#f0fdf4', color: '#16a34a', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '1rem', border: '1px solid #bbf7d0' }}>
              ✅ All systems operational
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alerts.map((al, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: '#f8fafc', borderRadius: 8, borderLeft: `4px solid ${al.color}`, border: '1px solid #e5e7eb', borderLeftWidth: '4px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{al.icon}</span>
                  <span style={{ flex: 1, color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>{al.message}</span>
                  <span style={{ padding: '4px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, background: al.severity === 'High' ? '#fef2f2' : al.severity === 'Medium' ? '#fff7ed' : '#fefce8', color: al.color }}>
                    {al.severity} Severity
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: 500 }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {!hE && health && (
            <>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.25rem', marginTop: 0 }}>Service Status</h2>
                {[
                  { name: 'PostgreSQL DB',  ok: health.dbStatus === 'connected' },
                  { name: 'API Server',     ok: true },
                  { name: 'Auth Service',   ok: true },
                ].map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', fontSize: '0.95rem', color: '#374151', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <Dot ok={s.ok} />
                    <span style={{ flex: 1 }}>{s.name}</span>
                    <strong style={{ color: s.ok ? '#16a34a' : '#dc2626' }}>{s.ok ? 'Online' : 'Offline'}</strong>
                  </div>
                ))}
              </div>

              {issuesByStatus.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.25rem', marginTop: 0 }}>Issues by Status</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {issuesByStatus.map(row => {
                      const pct = totalIssues ? Math.round((row.count / totalIssues) * 100) : 0;
                      return (
                        <div key={row.status} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>{row.count}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>{row.status}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>{pct}% of total</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Section 4: Live Activity Feed */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 1.5rem 0' }}>Live Activity Feed</h2>
          {feedItems.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: '0.95rem', padding: '1rem', background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>No recent activity to display.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {feedItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{item.title}</span>
                      <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 500 }}>{timeAgo(item.time)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: '#e2e8f0', color: '#334155', fontSize: '0.75rem', fontWeight: 700 }}>{item.type}</span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Status: <strong style={{ color: '#475569' }}>{item.status || 'Pending'}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing Audit Log Table */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#f8fafc' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Audit Log Archive</h2>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                placeholder="Search action or user…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', outline: 'none', width: 240 }}
              />
              <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', outline: 'none', background: '#fff' }}>
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          {lE && (
            <div style={{ padding: '1.5rem', color: '#dc2626', background: '#fef2f2' }}>
              Could not fetch audit logs. If you don't have an <code>audit_logs</code> table, the fallback shows recent issue activity.
            </div>
          )}
          {lL && <div style={{ padding: '2rem', color: '#6b7280', textAlign: 'center' }}>Loading logs…</div>}

          {!lL && !lE && filteredLogs.length === 0 && (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.95rem' }}>
              No log entries found. {search || levelFilter !== 'all' ? 'Try clearing your filters.' : 'Activity will appear here as the system is used.'}
            </div>
          )}

          {!lL && !lE && filteredLogs.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff' }}>
                  {['Time', 'User', 'Action', 'Resource', 'Level'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem',
                      fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => (
                  <tr key={log.id || i} style={{ borderBottom: '1px solid #f1f5f9', background: log.level === 'error' ? '#fef2f2' : '#fff' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>
                      {log.user_name || log.email || (log.user_id ? `User #${log.user_id}` : '—')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#334155', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.action || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>{log.resource || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                        background: log.level === 'error' ? '#fecaca' : log.level === 'warning' ? '#fef08a' : '#e2e8f0',
                        color:      log.level === 'error' ? '#b91c1c' : log.level === 'warning' ? '#a16207' : '#475569' }}>
                        {log.level || 'info'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!lL && (
             <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'center', background: '#f8fafc' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155', opacity: currentPage === 1 ? 0.5 : 1 }}>
                ← Prev
              </button>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Page {currentPage}</span>
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={logs.length < LIMIT}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: logs.length < LIMIT ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155', opacity: logs.length < LIMIT ? 0.5 : 1 }}>
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
