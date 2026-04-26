import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const fetchHealth = () => api.get('/admin/system-health').then(r => r.data);
const fetchLogs   = (page, limit) => api.get(`/admin/audit-logs?page=${page}&limit=${limit}`).then(r => r.data);

const MetricCard = ({ label, value, color = '#1d4ed8', bg = '#eff6ff', sub }) => (
  <div style={{ background: bg, borderRadius: 12, padding: '1.25rem 1.5rem', flex: 1, minWidth: 150 }}>
    <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color, lineHeight: 1 }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
  </div>
);

const Dot = ({ ok }) => (
  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: ok ? '#16a34a' : '#dc2626', marginRight: 6 }} />
);

const AuditLogs = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState('all');
  const [search, setSearch]           = useState('');
  const LIMIT = 30;

  const { data: health, isLoading: hL, isError: hE, refetch: refetchHealth } = useQuery({
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

  const issuesByStatus = health?.issuesByStatus || [];
  const totalIssues    = issuesByStatus.reduce((s, r) => s + parseInt(r.count || 0), 0);
  const doneCount      = issuesByStatus.find(r => r.status?.toLowerCase() === 'done')?.count || 0;
  const usersByRole    = health?.usersByRole || [];

  // Filter logs client-side
  const filteredLogs = logs.filter(l => {
    const matchLevel  = levelFilter === 'all' || l.level === levelFilter;
    const matchSearch = !search ||
      (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.resource || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.user_name || '').toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  return (
    <div style={{ padding: '1.5rem 2rem', fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>System Health</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '0.87rem' }}>
            Live system metrics and audit trail · refreshes every 30s
          </p>
        </div>
        <button onClick={refetchHealth}
          style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: '0.87rem', fontWeight: 500, color: '#374151' }}>
          Refresh
        </button>
      </div>

      {/* Health error */}
      {hE && (
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: '1.5rem' }}>
          Could not fetch system health data. Check that the backend <code>/api/admin/system-health</code> endpoint is running.
        </div>
      )}

      {/* Metrics row */}
      {!hE && (
        <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <MetricCard label="Active Users (1h)" value={health?.activeUsers ?? 0} bg="#eff6ff" color="#1d4ed8" />
          <MetricCard label="Total Projects"    value={health?.totalProjects ?? '—'} bg="#f0fdf4" color="#16a34a" />
          <MetricCard label="Total Users"       value={health?.totalUsers ?? '—'}    bg="#fef9c3" color="#a16207" />
          <MetricCard label="Total Issues"      value={totalIssues}                  bg="#f5f3ff" color="#7c3aed"
            sub={totalIssues > 0 ? `${Math.round((doneCount/totalIssues)*100)}% resolved` : ''}
          />
        </div>
      )}

      {/* Two-column row: Service status + Issues by status + Users by role */}
      {!hE && health && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

          {/* Service status */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Service Status</h2>
            {[
              { name: 'PostgreSQL DB',  ok: health.dbStatus === 'connected' },
              { name: 'API Server',     ok: true },
              { name: 'Auth Service',   ok: true },
            ].map(s => (
              <div key={s.name} style={{ fontSize: '0.87rem', color: '#374151', marginBottom: 8 }}>
                <Dot ok={s.ok} />
                {s.name}: <strong style={{ color: s.ok ? '#16a34a' : '#dc2626' }}>{s.ok ? 'Online' : 'Offline'}</strong>
              </div>
            ))}
            <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#9ca3af' }}>
              Server time: {health.serverTime ? new Date(health.serverTime).toLocaleString() : '—'}
            </div>
          </div>

          {/* Issues by status */}
          {issuesByStatus.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Issues by Status</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {issuesByStatus.map(row => {
                  const pct = totalIssues ? Math.round((row.count / totalIssues) * 100) : 0;
                  return (
                    <div key={row.status} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', minWidth: 90 }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{row.count}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{row.status}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Users by role */}
          {usersByRole.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Users by Role</h2>
              {usersByRole.map(r => (
                <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.85rem', color: '#374151', textTransform: 'capitalize' }}>{r.role}</span>
                  <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.9rem' }}>{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit / Activity Log */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Audit Log</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Search action or user…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.82rem', outline: 'none', width: 200 }}
            />
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
              style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.82rem', outline: 'none', background: '#fff' }}>
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        {lE && (
          <div style={{ padding: '1rem', color: '#dc2626' }}>
            Could not fetch audit logs. If you don't have an <code>audit_logs</code> table, the fallback shows recent issue activity.
          </div>
        )}
        {lL && <div style={{ padding: '1.5rem', color: '#6b7280' }}>Loading logs…</div>}

        {!lL && !lE && filteredLogs.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
            No log entries found. {search || levelFilter !== 'all' ? 'Try clearing your filters.' : 'Activity will appear here as the system is used.'}
          </div>
        )}

        {!lL && !lE && filteredLogs.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Time', 'User', 'Action', 'Resource', 'Level'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem',
                    fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em',
                    borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => (
                <tr key={log.id || i} style={{ borderBottom: '1px solid #f1f5f9', background: log.level === 'error' ? '#fef2f2' : '#fff' }}>
                  <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.82rem', color: '#374151' }}>
                    {log.user_name || log.email || (log.user_id ? `User #${log.user_id}` : '—')}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.82rem', color: '#374151', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.action || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#6b7280' }}>{log.resource || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
                      background: log.level === 'error' ? '#fef2f2' : log.level === 'warning' ? '#fef9c3' : '#f3f4f6',
                      color:      log.level === 'error' ? '#dc2626' : log.level === 'warning' ? '#a16207' : '#6b7280' }}>
                      {log.level || 'info'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!lL && (
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.82rem', opacity: currentPage === 1 ? 0.4 : 1 }}>
              ← Prev
            </button>
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>Page {currentPage}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={logs.length < LIMIT}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: logs.length < LIMIT ? 'not-allowed' : 'pointer', fontSize: '0.82rem', opacity: logs.length < LIMIT ? 0.4 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;









// import { useEffect, useState, useCallback } from "react";
// import api from "../api/axios";

// const MetricCard = ({ label, value, sub, color = "#1e40af" }) => (
//   <div style={{
//     background: "#fff", borderRadius: 12, padding: "16px 20px",
//     border: "1px solid #e5e7eb", boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
//     borderTop: `3px solid ${color}`,
//   }}>
//     <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
//       {label}
//     </div>
//     <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1e293b" }}>{value ?? "—"}</div>
//     {sub && <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 3 }}>{sub}</div>}
//   </div>
// );

// const levelStyle = (level) => {
//   const map = {
//     error:   { bg: "#fef2f2", color: "#dc2626" },
//     warn:    { bg: "#fff7ed", color: "#c2410c" },
//     info:    { bg: "#eff6ff", color: "#1d4ed8" },
//     success: { bg: "#f0fdf4", color: "#16a34a" },
//   };
//   return map[(level || "info").toLowerCase()] || map.info;
// };

// const AuditLogs = () => {
//   const [health, setHealth] = useState(null);
//   const [logs, setLogs] = useState([]);
//   const [loadingHealth, setLoadingHealth] = useState(true);
//   const [loadingLogs, setLoadingLogs] = useState(true);
//   const [healthError, setHealthError] = useState(null);
//   const [logsError, setLogsError] = useState(null);
//   const [page, setPage] = useState(1);
//   const [filterLevel, setFilterLevel] = useState("all");
//   const [search, setSearch] = useState("");
//   const LIMIT = 50;

//   const fetchHealth = useCallback(() => {
//     setLoadingHealth(true);
//     api.get("/admin/system-health")
//       .then((r) => setHealth(r.data))
//       .catch(() => setHealthError("Could not fetch system health data."))
//       .finally(() => setLoadingHealth(false));
//   }, []);

//   const fetchLogs = useCallback(() => {
//     setLoadingLogs(true);
//     api.get("/admin/audit-logs", { params: { page, limit: LIMIT } })
//       .then((r) => setLogs(Array.isArray(r.data) ? r.data : []))
//       .catch(() => setLogsError("Could not fetch audit logs."))
//       .finally(() => setLoadingLogs(false));
//   }, [page]);

//   useEffect(() => { fetchHealth(); }, [fetchHealth]);
//   useEffect(() => { fetchLogs(); }, [fetchLogs]);

//   const filteredLogs = logs.filter((log) => {
//     const matchLevel = filterLevel === "all" || (log.level || "info").toLowerCase() === filterLevel;
//     const matchSearch = !search ||
//       (log.action || "").toLowerCase().includes(search.toLowerCase()) ||
//       (log.user_name || log.email || "").toLowerCase().includes(search.toLowerCase());
//     return matchLevel && matchSearch;
//   });

//   return (
//     <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter',sans-serif" }}>
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 10 }}>
//         <div>
//           <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>System Health</h1>
//           <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4 }}>
//             Live system metrics and audit trail
//           </p>
//         </div>
//         <button
//           onClick={() => { fetchHealth(); fetchLogs(); }}
//           style={{
//             padding: "7px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
//             background: "#f8fafc", fontSize: "0.88rem", cursor: "pointer", fontWeight: 600,
//           }}
//         >
//           Refresh
//         </button>
//       </div>

//       {/* Health metrics */}
//       {loadingHealth ? (
//         <div style={{ padding: "1.5rem", color: "#6b7280" }}>Loading system metrics…</div>
//       ) : healthError ? (
//         <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8, marginBottom: "1.5rem" }}>
//           {healthError}
//         </div>
//       ) : health && (
//         <>
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
//             <MetricCard
//               label="DB Status"
//               value={health.dbStatus === "connected" ? "Online" : "Offline"}
//               color={health.dbStatus === "connected" ? "#16a34a" : "#dc2626"}
//             />
//             <MetricCard
//               label="Active Users"
//               value={health.activeUsers}
//               sub="Last 1 hour"
//               color="#1e40af"
//             />
//             <MetricCard
//               label="Total Projects"
//               value={health.totalProjects}
//               color="#7c3aed"
//             />
//             <MetricCard
//               label="Server Time"
//               value={health.serverTime ? new Date(health.serverTime).toLocaleTimeString() : "—"}
//               color="#0891b2"
//             />
//             {health.issuesByStatus?.map((s) => (
//               <MetricCard
//                 key={s.status}
//                 label={s.status || "Unknown"}
//                 value={s.count}
//                 sub="issues"
//                 color="#f59e0b"
//               />
//             ))}
//           </div>

//           {/* Recent errors */}
//           {health.recentErrors?.length > 0 && (
//             <div style={{
//               background: "#fff", borderRadius: 12, border: "1px solid #fca5a5",
//               padding: "16px 20px", marginBottom: "1.5rem",
//             }}>
//               <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 10, fontSize: "0.9rem" }}>
//                 Recent Errors ({health.recentErrors.length})
//               </div>
//               {health.recentErrors.slice(0, 5).map((e, i) => (
//                 <div key={i} style={{
//                   padding: "8px 0", borderBottom: i < health.recentErrors.length - 1 ? "1px solid #fee2e2" : "none",
//                   fontSize: "0.82rem", color: "#374151",
//                 }}>
//                   <span style={{ color: "#dc2626", fontWeight: 600 }}>{e.action || "Error"}</span>
//                   {e.created_at && (
//                     <span style={{ color: "#9ca3af", marginLeft: 8 }}>
//                       {new Date(e.created_at).toLocaleString()}
//                     </span>
//                   )}
//                 </div>
//               ))}
//             </div>
//           )}
//         </>
//       )}

//       {/* Audit log table */}
//       <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
//         <div style={{
//           padding: "14px 18px", borderBottom: "1px solid #e5e7eb",
//           display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
//         }}>
//           <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>Audit Log</div>
//           <div style={{ display: "flex", gap: 8 }}>
//             <input
//               placeholder="Search action or user…"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               style={{
//                 padding: "5px 10px", borderRadius: 7, border: "1px solid #e5e7eb",
//                 fontSize: "0.82rem", outline: "none", width: 200,
//               }}
//             />
//             <select
//               value={filterLevel}
//               onChange={(e) => setFilterLevel(e.target.value)}
//               style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #e5e7eb", fontSize: "0.82rem", outline: "none" }}
//             >
//               <option value="all">All Levels</option>
//               <option value="error">Error</option>
//               <option value="warn">Warn</option>
//               <option value="info">Info</option>
//               <option value="success">Success</option>
//             </select>
//           </div>
//         </div>

//         {loadingLogs ? (
//           <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading logs…</div>
//         ) : logsError ? (
//           <div style={{ padding: "1rem", color: "#dc2626" }}>{logsError}</div>
//         ) : (
//           <>
//             <div style={{ overflowX: "auto" }}>
//               <table style={{ width: "100%", borderCollapse: "collapse" }}>
//                 <thead>
//                   <tr style={{ background: "#f8fafc" }}>
//                     {["Time", "Level", "User", "Action", "Details"].map((h) => (
//                       <th key={h} style={{
//                         padding: "10px 14px", textAlign: "left", fontSize: "0.73rem",
//                         fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em",
//                       }}>
//                         {h}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filteredLogs.length === 0 ? (
//                     <tr>
//                       <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
//                         No log entries found.
//                       </td>
//                     </tr>
//                   ) : filteredLogs.map((log, i) => {
//                     const ls = levelStyle(log.level);
//                     return (
//                       <tr key={log.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
//                         <td style={{ padding: "10px 14px", fontSize: "0.78rem", color: "#6b7280", whiteSpace: "nowrap" }}>
//                           {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
//                         </td>
//                         <td style={{ padding: "10px 14px" }}>
//                           <span style={{
//                             padding: "2px 8px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 700,
//                             background: ls.bg, color: ls.color,
//                           }}>
//                             {(log.level || "info").toUpperCase()}
//                           </span>
//                         </td>
//                         <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#374151" }}>
//                           {log.user_name || log.email || `User #${log.user_id}` || "System"}
//                         </td>
//                         <td style={{ padding: "10px 14px", fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
//                           {log.action || "—"}
//                         </td>
//                         <td style={{ padding: "10px 14px", fontSize: "0.78rem", color: "#6b7280", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
//                           {log.details || log.message || "—"}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>

//             {/* Pagination */}
//             <div style={{
//               padding: "12px 18px", borderTop: "1px solid #e5e7eb",
//               display: "flex", justifyContent: "space-between", alignItems: "center",
//             }}>
//               <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
//                 Page {page} — showing {filteredLogs.length} entries
//               </span>
//               <div style={{ display: "flex", gap: 6 }}>
//                 <button
//                   disabled={page === 1}
//                   onClick={() => setPage((p) => p - 1)}
//                   style={{
//                     padding: "5px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
//                     background: page === 1 ? "#f8fafc" : "#fff", cursor: page === 1 ? "not-allowed" : "pointer",
//                     fontSize: "0.82rem",
//                   }}
//                 >
//                   Prev
//                 </button>
//                 <button
//                   disabled={logs.length < LIMIT}
//                   onClick={() => setPage((p) => p + 1)}
//                   style={{
//                     padding: "5px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
//                     background: logs.length < LIMIT ? "#f8fafc" : "#fff",
//                     cursor: logs.length < LIMIT ? "not-allowed" : "pointer",
//                     fontSize: "0.82rem",
//                   }}
//                 >
//                   Next
//                 </button>
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AuditLogs;




// import React from 'react';

// const AuditLogs = () => {
//   // In a real app, you'd fetch this from a /api/logs endpoint
//   const mockLogs = [
//     { id: 1, user: "admin@company.com", action: "Updated Project_5 Status", target: "P5", time: "2024-05-20 10:30 AM", ip: "192.168.1.1" },
//     { id: 2, user: "superadmin@dev.com", action: "Created Project_22", target: "P22", time: "2024-05-19 02:15 PM", ip: "104.22.11.4" },
//     { id: 3, user: "tester_1@qa.com", action: "Resolved Issue I-99", target: "I99", time: "2024-05-19 11:00 AM", ip: "172.16.254.1" },
//   ];

//   return (
//     <div style={{ padding: '2rem' }}>
//       <h2 style={{ marginBottom: '1.5rem' }}>System Audit Logs</h2>
//       <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
//         <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
//           <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
//             <tr>
//               <th style={{ padding: '1rem' }}>Timestamp</th>
//               <th style={{ padding: '1rem' }}>User</th>
//               <th style={{ padding: '1rem' }}>Action</th>
//               <th style={{ padding: '1rem' }}>Object ID</th>
//               <th style={{ padding: '1rem' }}>IP Address</th>
//             </tr>
//           </thead>
//           <tbody>
//             {mockLogs.map(log => (
//               <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
//                 <td style={{ padding: '1rem', color: '#64748b' }}>{log.time}</td>
//                 <td style={{ padding: '1rem', fontWeight: '500' }}>{log.user}</td>
//                 <td style={{ padding: '1rem' }}>{log.action}</td>
//                 <td style={{ padding: '1rem' }}><code style={{ background: '#f1f5f9', padding: '2px 6px' }}>{log.target}</code></td>
//                 <td style={{ padding: '1rem', color: '#94a3b8' }}>{log.ip}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default AuditLogs;