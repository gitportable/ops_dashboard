// import { useEffect, useState ,useContext} from "react";
// import { getIssues } from "../api/issueApi";
// import IssueTable from "../components/IssueTable";
// import { AuthContext } from "../auth/AuthContext";

// const Issues = () => {
//   const { role } = useContext(AuthContext);  // ← get role from context
//   const currentRole = (role || '').toLowerCase();
//   const [issues, setIssues] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     getIssues()
//       .then((res) => {
//         setIssues(res.data || []);
//         setLoading(false);
//       })
//       .catch((err) => {
//         console.error(err);
//         setLoading(false);
//       });
//   }, []);

//   if (loading) return <div>Loading issues...</div>;

//   return (
//     <div style={{ padding: "20px" }}>
//     <h2>{currentRole === 'tester' ? 'QA Issues' : 'Issues'}</h2>
//     <IssueTable issues={issues} />
//     </div>
//     // <div style={{ padding: "20px" }}>
//     //   <h2>Issues</h2>
//     //   <IssueTable issues={issues} />
//     // </div>
//   );
// };

// export default Issues;


import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../auth/AuthContext";
import { getIssues, getMyTasks, getMyIssues } from "../api/issueApi";
import IssueTableDeveloper from "../components/IssueTableDeveloper";
import IssueTableTester from "../components/IssueTableTester";
import LogIssueModal from "../components/LogIssueModal";
import { useLocation } from "react-router-dom";

const Issues = () => {
  const { role, user } = useContext(AuthContext) || {};
  const currentRole = (role || user?.role || "").toLowerCase();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(queryParams.get("status") || "all");
  const [filterSprint, setFilterSprint] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState(queryParams.get("severity") || "all");
  const [filterType, setFilterType] = useState(queryParams.get("issuetype") || "all");
  const [showLogModal, setShowLogModal] = useState(false);

  const fetchIssues = () => {
    setLoading(true);
    setError(null);
    // Each role fetches only what it should see:
    // - developer  → /issues/my-tasks  (own assigned project issues)
    // - tester     → /issues/my-issues (own assigned project issues)
    // - admin/superadmin → /issues     (all issues)
    const fetchFn =
      currentRole === "developer"
        ? getMyTasks
        : currentRole === "tester"
        ? getMyIssues
        : getIssues;

    fetchFn()
      .then((data) => setIssues(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load issues. Please try again."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentRole) fetchIssues();
  }, [currentRole]);

  const getStatus = (i) => i.status ? i.status : (i.closeddate ? "Done" : "Open");

  const sprints = [...new Set(issues.map((i) => i.sprint || "Sprint 1"))].sort();
  const statuses = [...new Set(issues.map(getStatus))];

  const filtered = issues.filter((i) => {
    const sTerm = search.toLowerCase();
    const matchSearch =
      !search ||
      String(i.issueid || i.issue_id || i.IssueID).toLowerCase().includes(sTerm) ||
      (i.description || "").toLowerCase().includes(sTerm) ||
      (i.assigneeteam || "").toLowerCase().includes(sTerm) ||
      (i.team || "").toLowerCase().includes(sTerm);
    
    const iStatus = getStatus(i);
    const matchStatus = filterStatus === "all" || iStatus.toLowerCase() === filterStatus.toLowerCase();
    
    const iSprint = i.sprint || "Sprint 1";
    const matchSprint = filterSprint === "all" || iSprint === filterSprint;
    
    const matchSeverity = filterSeverity === "all" || (i.severity || "Medium").toLowerCase() === filterSeverity.toLowerCase();
    const matchType = filterType === "all" || (filterType === "Defect" ? i.defect_type != null : (i.issuetype || "").toLowerCase() === filterType.toLowerCase());

    return matchSearch && matchStatus && matchSprint && matchSeverity && matchType;
  });

  const pageTitle =
    currentRole === "developer"
      ? "My Tasks"
      : currentRole === "tester"
      ? "QA Queue"
      : "All Issues";

  const pageSubtitle =
    currentRole === "developer"
      ? "Issues from your assigned projects"
      : currentRole === "tester"
      ? "Issues from your assigned projects — verify fixes and triage bugs"
      : "All issues across every project";

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>{pageTitle}</h1>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4 }}>{pageSubtitle}</p>
        </div>
        {["admin", "superadmin", "developer", "tester"].includes(currentRole) && (
          <button
            onClick={() => setShowLogModal(true)}
            style={{
              padding: "8px 18px", background: "#1e40af", color: "#fff",
              borderRadius: 8, border: "none", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer"
            }}
          >
            + New Issue
          </button>
        )}
      </div>

      <LogIssueModal isOpen={showLogModal} onClose={() => setShowLogModal(false)} onRefresh={fetchIssues} />

      {/* Stats row */}
      {!loading && !error && (
        <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {[
            { label: "Total", value: filtered.length, bg: "#eff6ff", color: "#1d4ed8" },
            { label: "Open", value: filtered.filter((i) => getStatus(i).toLowerCase() === "open").length, bg: "#f3f4f6", color: "#374151" },
            { label: "In Progress", value: filtered.filter((i) => getStatus(i).toLowerCase() === "in progress").length, bg: "#dbeafe", color: "#1d4ed8" },
            { label: "Done", value: filtered.filter((i) => getStatus(i).toLowerCase() === "done").length, bg: "#dcfce7", color: "#16a34a" },
            { label: "Blocked", value: filtered.filter((i) => getStatus(i).toLowerCase() === "blocked").length, bg: "#fef2f2", color: "#dc2626" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: "8px 16px", borderRadius: 99, background: s.bg,
              color: s.color, fontWeight: 700, fontSize: "0.82rem",
            }}>
              {s.label}: {s.value}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by ID, description, team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: "7px 12px", borderRadius: 8,
            border: "1px solid #e5e7eb", fontSize: "0.88rem", outline: "none",
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.88rem", outline: "none" }}
        >
          <option value="all">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterSprint}
          onChange={(e) => setFilterSprint(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.88rem", outline: "none" }}
        >
          <option value="all">All Sprints</option>
          {sprints.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {filterSeverity !== "all" && (
           <div style={{ padding: "7px 12px", borderRadius: 8, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
              Severity: <b>{filterSeverity}</b>
              <button onClick={() => setFilterSeverity("all")} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#ea580c" }}>✕</button>
           </div>
        )}
        {filterType !== "all" && (
           <div style={{ padding: "7px 12px", borderRadius: 8, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
              Type: <b>{filterType}</b>
              <button onClick={() => setFilterType("all")} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#475569" }}>✕</button>
           </div>
        )}
        <button
          onClick={fetchIssues}
          style={{
            padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb",
            background: "#f8fafc", fontSize: "0.88rem", cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>Loading issues…</div>
      )}
      {error && (
        <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>{error}</div>
      )}
      {!loading && !error && (
        <>
          {currentRole === "developer" && (
            <IssueTableDeveloper issues={filtered} onRefresh={fetchIssues} />
          )}
          {currentRole === "tester" && (
            <IssueTableTester issues={filtered} onRefresh={fetchIssues} />
          )}
          {["admin", "superadmin"].includes(currentRole) && (
            // Admin sees a combined view — can use IssueTableDeveloper as generic table
            <IssueTableDeveloper issues={filtered} onRefresh={fetchIssues} />
          )}
          {filtered.length === 0 && !loading && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
              No issues match your filters.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Issues;
























// import { useEffect, useState, useContext } from "react";
// import { getIssues } from "../api/issueApi";
// import { AuthContext } from "../auth/AuthContext";
// import IssueTableDeveloper from "../components/IssueTableDeveloper";
// import IssueTableTester from "../components/IssueTableTester";

// /* ── Stat Pill ── */
// const StatPill = ({ label, value, color }) => (
//   <div style={{ background: '#fff', borderRadius: 10, padding: '0.75rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: `2px solid ${color}22`, textAlign: 'center', minWidth: 110 }}>
//     <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
//     <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginTop: 2 }}>{label}</div>
//   </div>
// );

// const Issues = () => {
//   const { role } = useContext(AuthContext);
//   const currentRole = (role || '').toLowerCase();
//   const [issues, setIssues] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState('all');
//   const [search, setSearch] = useState('');

//   const reload = () => {
//     setLoading(true);
//     getIssues()
//       .then((res) => { setIssues(res.data || []); setLoading(false); })
//       .catch(() => setLoading(false));
//   };

//   useEffect(() => { reload(); }, []);

//   /* ── Derived stats ── */
//   const bugs    = issues.filter(i => (i.issuetype || i.issue_type || '').toLowerCase() === 'bug');
//   const tasks   = issues.filter(i => (i.issuetype || i.issue_type || '').toLowerCase() !== 'bug');
//   const open    = issues.filter(i => (i.status || '').toLowerCase() !== 'done');
//   const done    = issues.filter(i => (i.status || '').toLowerCase() === 'done');

//   /* ── Filter logic ── */
//   const filtered = issues.filter(i => {
//     const type = (i.issuetype || i.issue_type || '').toLowerCase();
//     const status = (i.status || '').toLowerCase();
//     const q = search.toLowerCase();
//     const matchSearch = !q || JSON.stringify(i).toLowerCase().includes(q);
//     if (filter === 'bugs')   return type === 'bug' && matchSearch;
//     if (filter === 'tasks')  return type !== 'bug' && matchSearch;
//     if (filter === 'open')   return status !== 'done' && matchSearch;
//     if (filter === 'done')   return status === 'done' && matchSearch;
//     return matchSearch;
//   });

//   if (loading) return (
//     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10 }}>
//       <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
//       <span style={{ color: '#6b7280' }}>Loading {currentRole === 'tester' ? 'QA Queue' : 'tasks'}…</span>
//       <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//     </div>
//   );

//   const isTester = currentRole === 'tester';

//   return (
//     <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>

//       {/* ── Header ── */}
//       <div style={{ marginBottom: '1.5rem' }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
//           <span style={{ fontSize: '1.5rem' }}>{isTester ? '🧪' : '⚡'}</span>
//           <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
//             {isTester ? 'QA Queue' : 'My Tasks'}
//           </h1>
//           <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
//             background: isTester ? '#f0fdf4' : '#eff6ff',
//             color: isTester ? '#16a34a' : '#2563eb',
//             border: isTester ? '1px solid #bbf7d0' : '1px solid #bfdbfe' }}>
//             {isTester ? 'TESTER VIEW' : 'DEVELOPER VIEW'}
//           </span>
//         </div>
//         <p style={{ margin: 0, color: '#6b7280', fontSize: '0.87rem' }}>
//           {isTester
//             ? 'Review, prioritize and validate bugs. Mark issues as verified or request more info.'
//             : 'Your assigned tasks and bugs. Update progress, log effort, and close completed items.'}
//         </p>
//       </div>

//       {/* ── Stats Row ── */}
//       <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
//         <StatPill label="Total"    value={issues.length} color="#6b7280" />
//         <StatPill label="Open"     value={open.length}   color="#f59e0b" />
//         <StatPill label="Done"     value={done.length}   color="#10b981" />
//         <StatPill label="Bugs"     value={bugs.length}   color="#ef4444" />
//         <StatPill label="Tasks"    value={tasks.length}  color="#3b82f6" />
//       </div>

//       {/* ── Role-specific guidance banner ── */}
//       {isTester ? (
//         <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.85rem 1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
//           <span style={{ fontSize: '1.2rem' }}>🔍</span>
//           <div>
//             <strong style={{ color: '#15803d', fontSize: '0.87rem' }}>QA Workflow:</strong>
//             <span style={{ color: '#166534', fontSize: '0.83rem', marginLeft: 8 }}>
//               Review bugs → Set severity (Critical/High/Medium/Low) → Mark as Verified or Needs More Info → Escalate critical issues
//             </span>
//           </div>
//         </div>
//       ) : (
//         <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.85rem 1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
//           <span style={{ fontSize: '1.2rem' }}>💡</span>
//           <div>
//             <strong style={{ color: '#1d4ed8', fontSize: '0.87rem' }}>Dev Workflow:</strong>
//             <span style={{ color: '#1e40af', fontSize: '0.83rem', marginLeft: 8 }}>
//               Pick up tasks → Mark In Progress → Log PR link → Mark Done when merged and tested
//             </span>
//           </div>
//         </div>
//       )}

//       {/* ── Filters + Search ── */}
//       <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
//         {['all', 'open', 'bugs', 'tasks', 'done'].map(f => (
//           <button key={f} onClick={() => setFilter(f)}
//             style={{ padding: '6px 14px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
//               background: filter === f ? (isTester ? '#16a34a' : '#2563eb') : '#f1f5f9',
//               color: filter === f ? '#fff' : '#6b7280' }}>
//             {f.charAt(0).toUpperCase() + f.slice(1)}
//             <span style={{ marginLeft: 5, fontSize: '0.7rem', opacity: 0.8 }}>
//               ({f === 'all' ? issues.length : f === 'bugs' ? bugs.length : f === 'tasks' ? tasks.length : f === 'open' ? open.length : done.length})
//             </span>
//           </button>
//         ))}
//         <input
//           placeholder="🔍  Search issues..."
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//           style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 99, border: '1px solid #e5e7eb', fontSize: '0.83rem', outline: 'none', minWidth: 200, background: '#fff' }}
//         />
//       </div>

//       {/* ── Table: role-split ── */}
//       {filtered.length === 0 ? (
//         <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', background: '#fff', borderRadius: 12, border: '1px dashed #e5e7eb' }}>
//           <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
//           <p style={{ margin: 0, fontWeight: 600 }}>No issues match this filter.</p>
//           <p style={{ margin: '4px 0 0', fontSize: '0.83rem' }}>Try a different filter or search term.</p>
//         </div>
//       ) : isTester ? (
//         <IssueTableTester issues={filtered} onRefresh={reload} />
//       ) : (
//         <IssueTableDeveloper issues={filtered} onRefresh={reload} />
//       )}
//     </div>
//   );
// };

//export default Issues;