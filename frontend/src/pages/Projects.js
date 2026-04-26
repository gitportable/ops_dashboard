import { useState, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../auth/AuthContext';
import { getProjects, deleteProject, updateProject } from '../api/projectApi';

// ── Safely resolve project ID regardless of field name from DB ───────────────
const pid = (p) => p?.projectid ?? p?.project_id ?? p?.id ?? p?.ProjectID;

const statusColor = (s = '') => {
  const m = {
    active:        ['#dcfce7','#16a34a'], 'in progress':['#dbeafe','#1d4ed8'],
    completed:     ['#f5f3ff','#7c3aed'], 'on hold':    ['#fef9c3','#a16207'],
    planning:      ['#f3f4f6','#6b7280'], cancelled:    ['#fef2f2','#dc2626'],
  };
  return m[s.toLowerCase()] || m['planning'];
};

const healthScore = (p) => {
  const pct = p.budget_total || p.budgetallocated
    ? ((p.budget_used || p.budgetused || 0) / (p.budget_total || p.budgetallocated)) * 100
    : 0;
  if (pct > 95) return { score:'Critical', color:'#dc2626', bg:'#fef2f2' };
  if (pct > 75) return { score:'At Risk',  color:'#f59e0b', bg:'#fef9c3' };
  return            { score:'Healthy',  color:'#16a34a', bg:'#dcfce7' };
};

const ProjectCard = ({ project, role, onDelete, onStatusChange, onClick }) => {
  const id         = pid(project);
  const [bg, textC] = statusColor(project.status);
  const health     = healthScore(project);
  const budgetTotal = project.budget_total || project.budgetallocated || 0;
  const budgetUsed  = project.budget_used  || project.budgetused      || 0;
  const budgetPct   = budgetTotal ? Math.min(100, Math.round((budgetUsed / budgetTotal) * 100)) : null;
  const budgetColor = budgetPct > 85 ? '#dc2626' : budgetPct > 65 ? '#f59e0b' : '#16a34a';
  const isSA = role === 'superadmin';

  return (
    <div
      style={{ background:'#fff', borderRadius:14, border:'1px solid #e5e7eb',
        padding:'1.25rem', display:'flex', flexDirection:'column', gap:10,
        cursor:'pointer', transition:'box-shadow 0.15s,transform 0.15s',
        boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform='none'; }}
      onClick={onClick}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ flex:1, marginRight:8 }}>
          <div style={{ fontWeight:700, fontSize:'1rem', color:'#1e293b' }}>
            {project.projectname || project.name || `Project ${id}`}
          </div>
          <div style={{ fontSize:'0.75rem', color:'#94a3b8', marginTop:2 }}>ID: {id}</div>
        </div>
        <div style={{ display:'flex', gap:5, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <span style={{ padding:'2px 9px', borderRadius:99, fontSize:'0.7rem', fontWeight:700, background:bg, color:textC }}>
            {project.status || 'Active'}
          </span>
          <span style={{ padding:'2px 9px', borderRadius:99, fontSize:'0.7rem', fontWeight:700, background:health.bg, color:health.color }}>
            {health.score}
          </span>
        </div>
      </div>

      <div style={{ display:'flex', gap:14, fontSize:'0.78rem', color:'#64748b', flexWrap:'wrap' }}>
        {project.membercount != null && <span>👥 {project.membercount} members</span>}
        {project.issuecount  != null && <span>🐛 {project.issuecount} issues</span>}
        {(project.sprint || project.current_sprint) && <span>🏃 {project.sprint || project.current_sprint}</span>}
        {project.enddate && <span>📅 {new Date(project.enddate).toLocaleDateString()}</span>}
      </div>

      {budgetPct !== null && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'#6b7280', marginBottom:4 }}>
            <span>Budget</span>
            <span style={{ fontWeight:600, color:budgetColor }}>
              ${budgetUsed.toLocaleString()} / ${budgetTotal.toLocaleString()} ({budgetPct}%)
            </span>
          </div>
          <div style={{ background:'#f1f5f9', borderRadius:4, height:6, overflow:'hidden' }}>
            <div style={{ width:`${budgetPct}%`, height:'100%', background:budgetColor, borderRadius:4 }} />
          </div>
        </div>
      )}

      {isSA && id && (
        <div style={{ display:'flex', gap:6, marginTop:4 }} onClick={e => e.stopPropagation()}>
          <select
            value={project.status || 'Active'}
            onChange={e => onStatusChange(id, e.target.value)}
            style={{ padding:'4px 8px', borderRadius:6, border:'1px solid #e5e7eb',
              fontSize:'0.75rem', outline:'none', flex:1, background:'#f8fafc' }}>
            {['Planning','Active','In Progress','On Hold','Completed','Cancelled'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => onDelete(id, project.projectname || project.name)}
            style={{ padding:'4px 10px', background:'#fef2f2', color:'#dc2626',
              border:'1px solid #fca5a5', borderRadius:6, fontSize:'0.75rem', cursor:'pointer', fontWeight:600 }}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

const Projects = () => {
  const { role, user } = useContext(AuthContext) || {};
  const currentRole    = (role || user?.role || '').toLowerCase();
  const navigate       = useNavigate();
  const queryClient    = useQueryClient();

  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterHealth, setFilterHealth] = useState('all');
  const [sortBy, setSortBy]           = useState('name');

  const { data: rawProjects = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['allProjects'],
    queryFn: () => getProjects().then(r => Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []),
    staleTime: 5 * 60 * 1000,
  });

  const handleDelete = async (id, name) => {
    if (!id) return;
    if (!window.confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(id);
      toast.success(`Project "${name}" deleted.`);
      queryClient.invalidateQueries({ queryKey: ['allProjects'] });
    } catch { toast.error('Failed to delete project.'); }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!id) return;
    try {
      await updateProject(id, { status: newStatus });
      toast.success('Status updated.');
      queryClient.invalidateQueries({ queryKey: ['allProjects'] });
    } catch { toast.error('Failed to update status.'); }
  };

  const projects = rawProjects
    .filter(p => {
      const name  = (p.projectname || p.name || '').toLowerCase();
      const id    = String(pid(p) || '');
      const matchSearch = !search || name.includes(search.toLowerCase()) || id.includes(search);
      const matchStatus = filterStatus === 'all' || (p.status || '').toLowerCase() === filterStatus;
      const health      = healthScore(p).score.toLowerCase();
      const matchHealth = filterHealth === 'all' || health === filterHealth;
      return matchSearch && matchStatus && matchHealth;
    })
    .sort((a, b) => {
      if (sortBy === 'name')   return (a.projectname || a.name || '').localeCompare(b.projectname || b.name || '');
      if (sortBy === 'budget') return ((b.budgetused || b.budget_used || 0) - (a.budgetused || a.budget_used || 0));
      if (sortBy === 'issues') return ((b.issuecount || 0) - (a.issuecount || 0));
      return 0;
    });

  const statusGroups = [...new Set(rawProjects.map(p => p.status).filter(Boolean))];

  return (
    <div style={{ padding:'1.5rem 2rem', fontFamily:"'Inter',sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:'1.6rem', fontWeight:700, color:'#1e293b', margin:0 }}>All Projects</h1>
          <p style={{ color:'#6b7280', margin:'4px 0 0', fontSize:'0.87rem' }}>
            {rawProjects.length} total projects
          </p>
        </div>
        {currentRole === 'superadmin' && (
          <button onClick={() => navigate('/projects/new')}
            style={{ padding:'10px 20px', background:'#1e40af', color:'#fff',
              border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:'0.9rem' }}>
            + New Project
          </button>
        )}
      </div>

      {!isLoading && (
        <div style={{ display:'flex', gap:8, marginBottom:'1.25rem', flexWrap:'wrap' }}>
          {[
            { label:'Total',    value:rawProjects.length,    bg:'#eff6ff', color:'#1d4ed8' },
            { label:'Active',   value:rawProjects.filter(p => ['active','in progress'].includes((p.status||'').toLowerCase())).length, bg:'#dcfce7', color:'#16a34a' },
            { label:'At Risk',  value:rawProjects.filter(p => healthScore(p).score==='At Risk').length,   bg:'#fef9c3', color:'#a16207' },
            { label:'Critical', value:rawProjects.filter(p => healthScore(p).score==='Critical').length, bg:'#fef2f2', color:'#dc2626' },
          ].map(s => (
            <span key={s.label} style={{ padding:'6px 14px', borderRadius:99, fontSize:'0.78rem', fontWeight:600, background:s.bg, color:s.color }}>
              {s.label}: {s.value}
            </span>
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:10, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <input placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:220, padding:'8px 14px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.87rem', outline:'none' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.87rem', outline:'none', background:'#fff' }}>
          <option value="all">All Statuses</option>
          {statusGroups.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
        </select>
        <select value={filterHealth} onChange={e => setFilterHealth(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.87rem', outline:'none', background:'#fff' }}>
          <option value="all">All Health</option>
          <option value="healthy">Healthy</option>
          <option value="at risk">At Risk</option>
          <option value="critical">Critical</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.87rem', outline:'none', background:'#fff' }}>
          <option value="name">Sort: Name</option>
          <option value="budget">Sort: Budget Used</option>
          <option value="issues">Sort: Most Issues</option>
        </select>
      </div>

      {isLoading && <div style={{ padding:'2rem', color:'#6b7280' }}>Loading projects…</div>}
      {isError   && (
        <div style={{ padding:'1.5rem', background:'#fef2f2', color:'#dc2626', borderRadius:8 }}>
          Failed to load projects.{' '}
          <button onClick={refetch} style={{ color:'#1d4ed8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Retry</button>
        </div>
      )}
      {!isLoading && !isError && projects.length === 0 && (
        <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af', background:'#f8fafc', borderRadius:12 }}>
          No projects match your filters.
        </div>
      )}
      {!isLoading && !isError && projects.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
          {projects.map(p => {
            const id = pid(p);
            return (
              <ProjectCard
                key={id ?? `proj-idx-${projects.indexOf(p)}`}
                project={p}
                role={currentRole}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onClick={() => id && navigate(`/projects/${id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Projects;




// import { useContext, useState, useEffect, useCallback } from "react";
// import { AuthContext } from "../auth/AuthContext";
// import { getProjects, deleteProject, updateProject } from "../api/projectApi";
// import { useNavigate } from "react-router-dom";
// import { toast } from "react-hot-toast";

// const statusColors = {
//   active:    { bg: "#dcfce7", color: "#16a34a" },
//   completed: { bg: "#eff6ff", color: "#1d4ed8" },
//   "on hold": { bg: "#fff7ed", color: "#c2410c" },
//   planning:  { bg: "#f5f3ff", color: "#7c3aed" },
//   cancelled: { bg: "#fef2f2", color: "#dc2626" },
// };

// const statusDot = (s) => {
//   const m = statusColors[(s || "").toLowerCase()] || { color: "#6b7280" };
//   return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: m.color, marginRight: 5 }} />;
// };

// const BudgetBar = ({ used, total }) => {
//   if (!total) return <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>—</span>;
//   const pct = Math.min(100, Math.round((used / total) * 100));
//   const barColor = pct > 90 ? "#dc2626" : pct > 70 ? "#f59e0b" : "#16a34a";
//   return (
//     <div>
//       <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#6b7280", marginBottom: 3 }}>
//         <span>${Number(used || 0).toLocaleString()}</span>
//         <span>{pct}%</span>
//       </div>
//       <div style={{ height: 5, borderRadius: 99, background: "#e5e7eb" }}>
//         <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: barColor, transition: "width 0.4s ease" }} />
//       </div>
//       <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: 2 }}>of ${Number(total).toLocaleString()}</div>
//     </div>
//   );
// };

// const Projects = () => {
//   const { role, user } = useContext(AuthContext) || {};
//   const currentRole = (role || user?.role || "").toLowerCase();
//   const isSuperAdmin = currentRole === "superadmin";
//   const navigate = useNavigate();

//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [search, setSearch] = useState("");
//   const [filterStatus, setFilterStatus] = useState("all");
//   const [sortBy, setSortBy] = useState("name");
//   const [deletingId, setDeletingId] = useState(null);
//   const [editingId, setEditingId] = useState(null);
//   const [editStatus, setEditStatus] = useState("");

//   const fetchProjects = useCallback(() => {
//     setLoading(true);
//     setError(null);
//     getProjects()
//       .then((data) => setProjects(Array.isArray(data) ? data : data?.data || []))
//       .catch(() => setError("Failed to load projects."))
//       .finally(() => setLoading(false));
//   }, []);

//   useEffect(() => { fetchProjects(); }, [fetchProjects]);

//   const handleDelete = async (projectId, projectName) => {
//     if (!window.confirm(`Delete "${projectName}"? This cannot be undone.`)) return;
//     setDeletingId(projectId);
//     try {
//       await deleteProject(projectId);
//       toast.success(`Project "${projectName}" deleted.`);
//       fetchProjects();
//     } catch (err) {
//       toast.error(err?.response?.data?.error || "Failed to delete project.");
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   const handleStatusUpdate = async (project) => {
//     try {
//       await updateProject(project.project_id, { status: editStatus });
//       toast.success("Project status updated.");
//       setEditingId(null);
//       fetchProjects();
//     } catch {
//       toast.error("Failed to update project status.");
//     }
//   };

//   const allStatuses = [...new Set(projects.map((p) => p.status).filter(Boolean))];

//   const filtered = projects
//     .filter((p) => {
//       const name = (p.name || p.project_name || "").toLowerCase();
//       const matchSearch = !search || name.includes(search.toLowerCase()) || String(p.project_id).includes(search);
//       const matchStatus = filterStatus === "all" || (p.status || "").toLowerCase() === filterStatus;
//       return matchSearch && matchStatus;
//     })
//     .sort((a, b) => {
//       if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
//       if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
//       if (sortBy === "budget") return (b.budget_total || 0) - (a.budget_total || 0);
//       if (sortBy === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
//       return 0;
//     });

//   return (
//     <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter',sans-serif" }}>
//       {/* Page header */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
//         <div>
//           <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>All Projects</h1>
//           <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4 }}>
//             {loading ? "Loading…" : `${projects.length} projects total`}
//           </p>
//         </div>
//         {isSuperAdmin && (
//           <button
//             onClick={() => navigate("/projects/new")}
//             style={{
//               padding: "8px 18px", background: "#1e40af", color: "#fff",
//               borderRadius: 8, border: "none", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
//             }}
//           >
//             + New Project
//           </button>
//         )}
//       </div>

//       {/* Summary stats */}
//       {!loading && !error && (
//         <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
//           {[
//             { label: "Total", val: projects.length },
//             { label: "Active", val: projects.filter((p) => (p.status || "").toLowerCase() === "active").length },
//             { label: "Completed", val: projects.filter((p) => (p.status || "").toLowerCase() === "completed").length },
//             { label: "On Hold", val: projects.filter((p) => (p.status || "").toLowerCase() === "on hold").length },
//           ].map((s) => (
//             <div key={s.label} style={{
//               padding: "8px 16px", borderRadius: 10, background: "#fff",
//               border: "1px solid #e5e7eb", fontSize: "0.82rem", color: "#374151", fontWeight: 600,
//             }}>
//               {s.label}: {s.val}
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Filters */}
//       <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
//         <input
//           type="text"
//           placeholder="Search projects by name or ID…"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           style={{
//             flex: 1, minWidth: 200, padding: "7px 12px", borderRadius: 8,
//             border: "1px solid #e5e7eb", fontSize: "0.88rem", outline: "none",
//           }}
//         />
//         <select
//           value={filterStatus}
//           onChange={(e) => setFilterStatus(e.target.value)}
//           style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.88rem", outline: "none" }}
//         >
//           <option value="all">All Statuses</option>
//           {allStatuses.map((s) => <option key={s} value={s.toLowerCase()}>{s}</option>)}
//         </select>
//         <select
//           value={sortBy}
//           onChange={(e) => setSortBy(e.target.value)}
//           style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.88rem", outline: "none" }}
//         >
//           <option value="name">Sort: Name</option>
//           <option value="newest">Sort: Newest</option>
//           <option value="status">Sort: Status</option>
//           <option value="budget">Sort: Budget</option>
//         </select>
//       </div>

//       {loading && <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>Loading projects…</div>}
//       {error && <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>{error}</div>}

//       {!loading && !error && (
//         filtered.length === 0 ? (
//           <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>No projects match your filters.</div>
//         ) : (
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
//             {filtered.map((project) => {
//               const pid = project.project_id;
//               const name = project.name || project.project_name || `Project ${pid}`;
//               const sc = statusColors[(project.status || "").toLowerCase()] || { bg: "#f3f4f6", color: "#374151" };
//               const memberCount = project.member_count || project.members?.length || 0;

//               return (
//                 <div
//                   key={pid}
//                   style={{
//                     background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb",
//                     boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden",
//                     transition: "box-shadow 0.2s",
//                   }}
//                   onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"}
//                   onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"}
//                 >
//                   {/* Card top */}
//                   <div
//                     style={{ padding: "16px 18px", cursor: "pointer" }}
//                     onClick={() => navigate(`/projects/${pid}`)}
//                   >
//                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
//                       <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>{name}</div>
//                       {editingId === pid ? (
//                         <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
//                           <select
//                             value={editStatus}
//                             onChange={(e) => setEditStatus(e.target.value)}
//                             style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: 6, border: "1px solid #e5e7eb" }}
//                           >
//                             {["Active", "On Hold", "Completed", "Planning", "Cancelled"].map((s) => (
//                               <option key={s} value={s}>{s}</option>
//                             ))}
//                           </select>
//                           <button onClick={() => handleStatusUpdate(project)}
//                             style={{ fontSize: "0.72rem", padding: "2px 7px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" }}>
//                             Save
//                           </button>
//                           <button onClick={() => setEditingId(null)}
//                             style={{ fontSize: "0.72rem", padding: "2px 7px", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 5, cursor: "pointer" }}>
//                             Cancel
//                           </button>
//                         </div>
//                       ) : (
//                         <span
//                           style={{
//                             padding: "2px 10px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
//                             background: sc.bg, color: sc.color,
//                             cursor: isSuperAdmin ? "pointer" : "default",
//                           }}
//                           onClick={isSuperAdmin ? (e) => { e.stopPropagation(); setEditingId(pid); setEditStatus(project.status || "Active"); } : undefined}
//                           title={isSuperAdmin ? "Click to change status" : undefined}
//                         >
//                           {statusDot(project.status)}
//                           {project.status || "Active"}
//                         </span>
//                       )}
//                     </div>

//                     {project.description && (
//                       <p style={{
//                         fontSize: "0.8rem", color: "#6b7280", marginTop: 6,
//                         overflow: "hidden", display: "-webkit-box",
//                         WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
//                       }}>
//                         {project.description}
//                       </p>
//                     )}

//                     {/* Budget bar */}
//                     <div style={{ marginTop: 12 }}>
//                       <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 4, fontWeight: 600 }}>
//                         BUDGET
//                       </div>
//                       <BudgetBar used={project.budget_used} total={project.budget_total} />
//                     </div>
//                   </div>

//                   {/* Card footer */}
//                   <div style={{
//                     padding: "10px 18px", background: "#f8fafc",
//                     borderTop: "1px solid #e5e7eb",
//                     display: "flex", justifyContent: "space-between", alignItems: "center",
//                   }}>
//                     <div style={{ display: "flex", gap: 12 }}>
//                       <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
//                         <strong style={{ color: "#374151" }}>{memberCount}</strong> members
//                       </span>
//                       {project.created_at && (
//                         <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
//                           Created {new Date(project.created_at).toLocaleDateString()}
//                         </span>
//                       )}
//                     </div>
//                     <div style={{ display: "flex", gap: 6 }}>
//                       <button
//                         onClick={() => navigate(`/projects/${pid}`)}
//                         style={{
//                           padding: "4px 10px", fontSize: "0.75rem", fontWeight: 600,
//                           background: "#eff6ff", color: "#1d4ed8",
//                           border: "none", borderRadius: 6, cursor: "pointer",
//                         }}
//                       >
//                         View
//                       </button>
//                       {isSuperAdmin && (
//                         <button
//                           onClick={() => handleDelete(pid, name)}
//                           disabled={deletingId === pid}
//                           style={{
//                             padding: "4px 10px", fontSize: "0.75rem", fontWeight: 600,
//                             background: "#fef2f2", color: "#dc2626",
//                             border: "none", borderRadius: 6, cursor: "pointer",
//                             opacity: deletingId === pid ? 0.5 : 1,
//                           }}
//                         >
//                           {deletingId === pid ? "…" : "Delete"}
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )
//       )}
//     </div>
//   );
// };

// export default Projects;






// import { useEffect, useState, useContext } from "react";
// import { getProjects, updateProject, assignMemberToProject } from "../api/projectApi";
// import { getUsers } from "../api/userApi"; 
// import { AuthContext } from "../auth/AuthContext";
// import {
//   Box, Typography, Card, CardContent, TextField, Switch,
//   FormControlLabel, Button, CircularProgress, Alert,
//   Stack, Chip, LinearProgress, FormControl, Select, MenuItem, InputLabel, Grid
// } from "@mui/material";
// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { toast } from 'react-hot-toast';
// import { motion } from "framer-motion";
// import dayjs from "dayjs";

// const Projects = () => {
//   const [projects, setProjects] = useState([]);
//   const [allUsers, setAllUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const { user, role } = useContext(AuthContext);
//   const currentRole = (role || user?.role || localStorage.getItem("role") || "").toLowerCase();

//   const fetchData = async () => {
//     try {
//       setLoading(true);
      
//       // Using separate try/catches so one failure doesn't break both
//       try {
//         const projRes = await getProjects();
//         setProjects(projRes.data || []);
//       } catch (e) {
//         console.error("Projects load failed", e);
//         toast.error("Could not load projects");
//       }

//       try {
//         const userRes = await getUsers();
//         setAllUsers(userRes.data || []);
//       } catch (e) {
//         console.error("Users load failed (404)", e);
//         // We don't toast here to avoid annoying the user if they aren't adding members
//         setAllUsers([]); 
//       }

//     } catch (err) {
//       setError("Critical data load error.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (currentRole) fetchData();
//   }, [currentRole]);

//   // Logic to handle updates (Restored with validation)
//   const handleUpdate = async (project, field, value) => {
//     const projectId = project.projectid || project.project_id;
//     if (project[field] === value) return;

//     const updatedProject = { ...project, [field]: value };
    
//     try {
//       await updateProject(projectId, updatedProject);
//       setProjects(prev => prev.map(p => 
//         (p.projectid || p.project_id) === projectId ? updatedProject : p
//       ));
//       toast.success(`${field.replace('_', ' ')} saved!`);
//     } catch (err) {
//       toast.error("Save failed. Check console.");
//     }
//   };

//   const handleAddMember = async (projectId, userId) => {
//     if (!userId) return;
//     try {
//       await assignMemberToProject(projectId, userId);
//       toast.success("Member assigned!");
//       fetchData(); 
//     } catch (err) {
//       toast.error("Assignment failed");
//     }
//   };

//   const handleApproval = async (projectId) => {
//     try {
//       const project = projects.find(p => (p.projectid || p.project_id) === projectId);
//       const newStatus = !project.isApproved;
//       await updateProject(projectId, { ...project, isApproved: newStatus });
//       setProjects(prev => prev.map(p => 
//         (p.projectid || p.project_id) === projectId ? { ...p, isApproved: newStatus } : p
//       ));
//       toast.success(newStatus ? "Project Approved" : "Approval Revoked");
//     } catch (err) {
//       toast.error("Status update failed");
//     }
//   };

//   const canEdit = (field) => {
//     if (currentRole === "superadmin") return true;
//     if (currentRole === "admin") {
//       return ["project_name", "status", "startdate", "enddate", "budget_allocated", "budget_used"].includes(field);
//     }
//     return false;
//   };

//   if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
//   if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;

//   return (
//     <LocalizationProvider dateAdapter={AdapterDayjs}>
//       <Box sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
//         <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 4 }}>
//           Projects Overview
//         </Typography>

//         {projects.length === 0 ? (
//           <Alert severity="info">No projects found.</Alert>
//         ) : (
//           projects.map((p) => {
//             const id = p.projectid || p.project_id;
//             const progressPercent = p.totalIssues > 0 ? (p.solvedIssues / p.totalIssues) * 100 : 0;

//             return (
//               <motion.div key={id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
//                 <Card sx={{ mb: 4, boxShadow: 3, borderRadius: 2, borderLeft: p.isApproved ? '6px solid #4caf50' : '6px solid #ff9800' }}>
//                   <CardContent>
//                     {/* Header Row */}
//                     <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
//                       <Typography 
//                         variant="h5" 
//                         onClick={() => window.location.href = `/projects/${id}`}
//                         sx={{ color: '#1e3a8a', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
//                       >
//                         {p.project_name || "Unnamed Project"}
//                       </Typography>
                      
//                       {currentRole === 'superadmin' && (
//                         <Button 
//                           variant="contained" 
//                           size="small" 
//                           color={p.isApproved ? "error" : "success"}
//                           onClick={() => handleApproval(id)}
//                         >
//                           {p.isApproved ? "Revoke Approval" : "Approve Project"}
//                         </Button>
//                       )}
//                     </Stack>

//                     <Grid container spacing={4}>
//                       {/* Left: Team & Progress */}
//                       <Grid item xs={12} md={6}>
//                         <Typography variant="subtitle2" color="textSecondary">Active Team Members:</Typography>
//                         <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2, flexWrap: 'wrap', gap: 1 }}>
//                           {p.members?.length > 0 ? p.members.map(m => (
//                             <Chip key={m.id} label={`${m.name} (${m.role})`} size="small" variant="outlined" />
//                           )) : <Typography variant="caption">No members assigned</Typography>}
//                         </Stack>

//                         {["admin", "superadmin"].includes(currentRole) && (
//                           <FormControl fullWidth size="small" sx={{ mb: 3 }}>
//                             <InputLabel>Assign Member</InputLabel>
//                             <Select value="" label="Assign Member" onChange={(e) => handleAddMember(id, e.target.value)}>
//                               {allUsers.map(u => (
//                                 <MenuItem key={u.id} value={u.id}>{u.name} ({u.role})</MenuItem>
//                               ))}
//                             </Select>
//                           </FormControl>
//                         )}

//                         <Typography variant="body2" sx={{ mb: 0.5 }}>Issues: {p.solvedIssues || 0} / {p.totalIssues || 0} Solved</Typography>
//                         <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 8, borderRadius: 5, mb: 2 }} />
//                       </Grid>

//                       {/* Right: Budget & Editing */}
//                       <Grid item xs={12} md={6}>
//                         <Box sx={{ mb: 2 }}>
//                           <Typography variant="body2">
//                             Budget: <b>${p.budget_used || 0}</b> / ${p.budget_allocated || 0}
//                           </Typography>
//                           {Number(p.budget_used) > Number(p.budget_allocated) && (
//                             <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>⚠️ OVER BUDGET</Typography>
//                           )}
//                         </Box>

//                         <Stack spacing={2}>
//                           <TextField
//                             fullWidth
//                             label="Project Name"
//                             defaultValue={p.project_name}
//                             onBlur={(e) => handleUpdate(p, "project_name", e.target.value)}
//                             disabled={!canEdit("project_name")}
//                             size="small"
//                           />
                          
//                           <Stack direction="row" spacing={2}>
//                             <DatePicker
//                               label="Start"
//                               value={p.startdate ? dayjs(p.startdate) : null}
//                               onChange={(val) => handleUpdate(p, "startdate", val?.format("YYYY-MM-DD"))}
//                               disabled={!canEdit("startdate")}
//                               slotProps={{ textField: { size: 'small', fullWidth: true } }}
//                             />
//                             <DatePicker
//                               label="End"
//                               value={p.enddate ? dayjs(p.enddate) : null}
//                               onChange={(val) => handleUpdate(p, "enddate", val?.format("YYYY-MM-DD"))}
//                               disabled={!canEdit("enddate")}
//                               slotProps={{ textField: { size: 'small', fullWidth: true } }}
//                             />
//                           </Stack>

//                           <FormControlLabel
//                             control={
//                               <Switch 
//                                 checked={(p.status || "").toLowerCase() === "active"} 
//                                 onChange={(e) => handleUpdate(p, "status", e.target.checked ? "Active" : "Inactive")}
//                                 disabled={!canEdit("status")}
//                               />
//                             }
//                             label={`Status: ${p.status || "N/A"}`}
//                           />
//                         </Stack>
//                       </Grid>
//                     </Grid>
//                   </CardContent>
//                 </Card>
//               </motion.div>
//             );
//           })
//         )}
//       </Box>
//     </LocalizationProvider>
//   );
// };

// export default Projects;


// import { useEffect, useState } from "react";
// import { getProjects, updateProject, assignMemberToProject } from "../api/projectApi";
// import { getUsers } from "../api/userApi";
// import { Box, Typography, Card, CardContent, TextField, Button, CircularProgress, Stack, Chip, LinearProgress, FormControl, Select, MenuItem, InputLabel, Grid, Paper } from "@mui/material";
// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { toast } from 'react-hot-toast';
// import dayjs from "dayjs";

// const Projects = () => {
//   const [projects, setProjects] = useState([]);
//   const [allUsers, setAllUsers] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const loadData = async () => {
//     try {
//       const [pRes, uRes] = await Promise.all([getProjects(), getUsers()]);
//       setProjects(pRes.data || []);
//       setAllUsers(uRes.data || []);
//     } catch (err) {
//       console.error("Load error", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { loadData(); }, []);

//   const handleUpdate = async (project, field, value) => {
//     if (project[field] === value) return;
//     try {
//       const id = project.projectid || project.project_id || project.id;
//       await updateProject(id, { ...project, [field]: value });
//       toast.success("Saved!");
//       loadData();
//     } catch (err) { toast.error("Save failed"); }
//   };

//   if (loading) return <CircularProgress sx={{ m: 10 }} />;

//   return (
//     <LocalizationProvider dateAdapter={AdapterDayjs}>
//       <Box sx={{ p: 4 }}>
//         <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#1e3a8a' }}>Projects Overview</Typography>
        
//         {projects.map((p) => {
//           const id = p.projectid || p.project_id || p.id;
//           const name = p.project_name || p.name || "Unnamed Project";
//           const prog = p.totalIssues > 0 ? (p.solvedIssues / p.totalIssues) * 100 : 0;

//           return (
//             <Card key={id} sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
//               <CardContent>
//                 <Grid container spacing={3}>
//                   {/* Info Section */}
//                   <Grid item xs={12} md={7}>
//                     <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>{name}</Typography>
//                     <Typography variant="body2" color="text.secondary">Sprint Progress</Typography>
//                     <LinearProgress variant="determinate" value={prog} sx={{ height: 10, borderRadius: 5, my: 1 }} />
//                     <Typography variant="caption">{p.solvedIssues || 0} / {p.totalIssues || 0} Issues Solved</Typography>
                    
//                     <Box sx={{ mt: 3 }}>
//                       <Typography variant="subtitle2">Team Members:</Typography>
//                       <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
//                         {p.members?.map(m => <Chip key={m.id} label={m.name} size="small" />)}
//                       </Stack>
//                       <FormControl fullWidth size="small">
//                         <InputLabel>Assign Member</InputLabel>
//                         <Select value="" label="Assign Member" onChange={(e) => assignMemberToProject(id, e.target.value).then(() => loadData())}>
//                           {allUsers.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
//                         </Select>
//                       </FormControl>
//                     </Box>
//                   </Grid>

//                   {/* Budget Section */}
//                   <Grid item xs={12} md={5}>
//                     <Paper sx={{ p: 2, bgcolor: '#f8fafc' }}>
//                       <Typography variant="subtitle2">Budget: ${p.budget_used || 0} / ${p.budget_allocated || 0}</Typography>
//                       <TextField 
//                         fullWidth label="Project Name" size="small" sx={{ mt: 2 }}
//                         defaultValue={name} 
//                         onBlur={(e) => handleUpdate(p, "project_name", e.target.value)} 
//                       />
//                       <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
//                         <DatePicker label="Start" value={dayjs(p.startdate)} onChange={(v) => handleUpdate(p, "startdate", v.format("YYYY-MM-DD"))} slotProps={{ textField: { size: 'small' } }} />
//                         <DatePicker label="End" value={dayjs(p.enddate)} onChange={(v) => handleUpdate(p, "enddate", v.format("YYYY-MM-DD"))} slotProps={{ textField: { size: 'small' } }} />
//                       </Stack>
//                     </Paper>
//                   </Grid>
//                 </Grid>
//               </CardContent>
//             </Card>
//           );
//         })}
//       </Box>
//     </LocalizationProvider>
//   );
// };

// export default Projects;















































































// import { useEffect, useState, useContext } from "react";
// import { getProjects, updateProject } from "../api/projectApi";
// import { AuthContext } from "../auth/AuthContext";
// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { toast } from 'react-hot-toast'; // Correct library matching App.js
// import { motion } from "framer-motion";
// import dayjs from "dayjs";
// import { getUsers } from "../api/userApi";
// import {
//   Box, Typography, Card, CardContent, TextField, Switch,
//   FormControlLabel, Button, CircularProgress, Alert,
//   Stack, Chip, LinearProgress // <--- Add these three here
// } from "@mui/material";
// const Projects = () => {
//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [allUsers, setAllUsers] = useState([]);
  
//   const { user, role } = useContext(AuthContext); 
//   const currentRole = (role || user?.role || localStorage.getItem("role") || "").toLowerCase();
//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       const [projRes, userRes] = await Promise.all([getProjects(), getUsers()]);
//       setProjects(projRes.data || []);
//       setAllUsers(userRes.data || []);
//     } catch (err) {
//       console.error("API Error:", err);
//       setError("Failed to load data from server.");
//     } finally {
//       setLoading(false);
//     }
//   };
//   useEffect(() => {
//     console.log("Projects Page Loaded. Role:", currentRole); // This will now show up!
//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         const [projRes, userRes] = await Promise.all([getProjects(), getUsers()]);
//         setProjects(projRes.data || []);
//         setAllUsers(userRes.data || []);
//       } catch (err) {
//         toast.error("Failed to load data");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   const handleAddMember = async (projectId, userId) => {
//     try {
//       await assignMemberToProject(projectId, userId);
//       toast.success("Member assigned successfully!");
//       // Refresh projects to show new member chips
//       const res = await getProjects();
//       setProjects(res.data);
//     } catch (err) {
//       toast.error("Assignment failed");
//     }
//   };
//     const fetchProjects = async () => {
//       try {
//         setLoading(true);
//         const res = await getProjects();
//         setProjects(res.data || []);
//       } catch (err) {
//         console.error("API Error:", err);
//         setError("Failed to load projects from server.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (currentRole) fetchProjects();
//   }, [currentRole]);

//   const canEdit = (field) => {
//     if (currentRole === "superadmin") return true;
//     if (currentRole === "admin") {
//       return ["project_name", "status", "startdate", "enddate", "budget_allocated", "budget_used"].includes(field);
//     }
//     return false;
//   };

//   const handleChange = async (project, field, value) => {
//     if (!canEdit(field)) return;
    
//     const updatedProject = { ...project, [field]: value };
    
//     // Using react-hot-toast confirm pattern
//     toast((t) => (
//       <span>
//         Save changes to <b>{project.project_name}</b>?
//         <button 
//           onClick={async () => {
//             toast.dismiss(t.id);
//             try {
//               await updateProject(project.projectid || project.project_id, updatedProject);
//               setProjects(prev => prev.map(p => 
//                 (p.projectid || p.project_id) === (project.projectid || project.project_id) ? updatedProject : p
//               ));
//               toast.success("Saved!");
//             } catch (err) {
//               toast.error("Save failed");
//             }
//           }}
//           style={{ marginLeft: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
//         >
//           Confirm
//         </button>
//       </span>
//     ));
//   };
  
//   // --- RENDER LOGIC ---
//   if (!currentRole) return <Box sx={{ p: 4 }}><Alert severity="error">Access Denied: No Role Found</Alert></Box>;
//   if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
//   if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;
//   // 1. Add this function inside your Projects component (before the return)
// const handleApproval = async (projectId) => {
//   try {
//     // Find the current project to toggle its status
//       const projectToUpdate = projects.find(proj => (proj.projectid || proj.project_id) === projectId);
//       const newApprovalStatus = !projectToUpdate.isApproved;

//       await updateProject(projectId, { ...projectToUpdate, isApproved: newApprovalStatus });
      
//       // Update local state so UI refreshes immediately
//       setProjects(prev => prev.map(proj => 
//         (proj.projectid || proj.project_id) === projectId 
//           ? { ...proj, isApproved: newApprovalStatus } 
//           : proj
//       ));
      
//       toast.success(newApprovalStatus ? "Project Approved!" : "Approval Revoked");
//     } catch (err) {
//       toast.error("Failed to update approval status.");
//     }
//   };


//     return (
//       <LocalizationProvider dateAdapter={AdapterDayjs}>
//         <Box sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
//           <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>
//             Projects Overview
//           </Typography>

//           {projects.length === 0 ? (
//             <Alert severity="info">No projects found in the database.</Alert>
//           ) : (
//             projects.map((p) => {
//               const id = p.projectid || p.project_id;
              
//               // Calculate Progress Safely
//               const total = p.totalIssues || 0;
//               const solved = p.solvedIssues || 0;
//               const progressPercent = total > 0 ? (solved / total) * 100 : 0;

//               return (
//                 <Box sx={{ p: 4 }}>
//       {projects.map((p) => (
//         <Card key={p.projectid} sx={{ mb: 4, cursor: 'pointer', "&:hover": { boxShadow: 6 } }}>
//           <CardContent>
//             {/* Header: Click name to go to detailed tools */}
//             <Typography 
//               variant="h5" 
//               onClick={() => window.location.href = `/projects/${p.projectid}`}
//               sx={{ color: '#1e3a8a', cursor: 'pointer', textDecoration: 'underline' }}
//             >
//               {p.project_name}
//             </Typography>

//             {/* Admin Member Assignment Tool */}
//             {["admin", "superadmin"].includes(currentRole) && (
//               <Box sx={{ mt: 2, p: 2, border: '1px dashed #ccc' }}>
//                 <Typography variant="subtitle2">Add Team Member:</Typography>
//                 <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
//                   <FormControl size="small" sx={{ minWidth: 200 }}>
//                     <Select
//                       onChange={(e) => handleAddMember(p.projectid, e.target.value)}
//                       displayEmpty
//                     >
//                       <MenuItem value="" disabled>Select User</MenuItem>
//                       {allUsers.map(u => (
//                         <MenuItem key={u.id} value={u.id}>{u.name} ({u.role})</MenuItem>
//                       ))}
//                     </Select>
//                   </FormControl>
//                 </Stack>
//               </Box>
//             )}
//                 <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
//                   <Card sx={{ mb: 4, boxShadow: 3, borderRadius: 2 }}>
//                     <CardContent>
//                       <Typography variant="h6" color="primary" gutterBottom>
//                         {p.project_name || "Unnamed Project"}
//                       </Typography>
                      
//                       <div className="project-card-details" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fcfcfc', borderRadius: '8px' }}>
                        
//                         {/* 1. Team Members */}
//                         <div className="team-section">
//                           <Typography variant="subtitle2">Active Team:</Typography>
//                           <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
//                             {p.members?.length > 0 ? p.members.map(m => (
//                               <Chip key={m.id} label={`${m.name} (${m.role})`} size="small" variant="outlined" />
//                             )) : <Typography variant="caption" color="text.secondary">No members assigned</Typography>}
//                           </Stack>
//                         </div>

//                         {/* 2. Issue Progress */}
//                         <div className="progress-container" style={{ margin: '15px 0' }}>
//                           <Typography variant="body2">Issues: {solved} / {total} Solved</Typography>
//                           <LinearProgress 
//                             variant="determinate" 
//                             value={progressPercent} 
//                             sx={{ height: 8, borderRadius: 5, mt: 1 }} 
//                           />
//                         </div>

//                         {/* 3. Budget Status */}
//                         <div className="budget-status" style={{ margin: '15px 0' }}>
//                           <Typography variant="body2">
//                             Budget Used: <strong>${p.budget_used || 0}</strong> / ${p.budget_allocated || 0}
//                           </Typography>
//                           {Number(p.budget_used) > Number(p.budget_allocated) && (
//                             <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>⚠️ OVER BUDGET</Typography>
//                           )}
//                         </div>

//                         {/* 4. Superadmin Approval Toggle */}
//                         {currentRole === 'superadmin' && (
//                           <div className="approval-actions" style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '10px' }}>
//                             <Typography variant="body2" sx={{ mb: 1 }}>
//                               Approval Status: {p.isApproved ? "✅ Approved" : "⏳ Pending"}
//                             </Typography>
//                             <Button 
//                               variant="contained" 
//                               size="small"
//                               color={p.isApproved ? "error" : "success"}
//                               onClick={() => handleApproval(id)}
//                             >
//                               {p.isApproved ? "Revoke Access" : "Approve Project"}
//                             </Button>
//                           </div>
//                         )}
//                       </div>
//                     <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mt: 2 }}>
//                       <TextField
//                         label="Project Name"
//                         value={p.project_name || ""}
//                         onChange={(e) => handleChange(p, "project_name", e.target.value)}
//                         disabled={!canEdit("project_name")}
//                         fullWidth
//                       />

//                       <FormControlLabel
//                         control={
//                           <Switch
//                             checked={(p.status || "").toLowerCase() === "active"}
//                             onChange={(e) => handleChange(p, "status", e.target.checked ? "Active" : "Inactive")}
//                             disabled={!canEdit("status")}
//                           />
//                         }
//                         label={`Status: ${p.status || "N/A"}`}
//                       />

//                       <DatePicker
//                         label="Start Date"
//                         value={p.startdate ? dayjs(p.startdate) : null}
//                         onChange={(val) => handleChange(p, "startdate", val?.format("YYYY-MM-DD"))}
//                         disabled={!canEdit("startdate")}
//                         slotProps={{ textField: { fullWidth: true } }}
//                       />

//                       <DatePicker
//                         label="End Date"
//                         value={p.enddate ? dayjs(p.enddate) : null}
//                         onChange={(val) => handleChange(p, "enddate", val?.format("YYYY-MM-DD"))}
//                         disabled={!canEdit("enddate")}
//                         slotProps={{ textField: { fullWidth: true } }}
//                       />
//                     </Box>
//                   </CardContent>
//                 </Card>
//               </motion.div>
//             );
//           })
//         )}
//       </Box>
//     </LocalizationProvider>
//   );
// };

// export default Projects;










































































































































{/* // import dayjs from "dayjs";
// import { motion } from "framer-motion";
// import { toast } from "react-toastify";
// import { useEffect, useState, useContext } from "react";
// import { getProjects, updateProject } from "../api/projectApi"; // Make sure updateProject exists
// import { AuthContext } from "../auth/AuthContext";
// import { */}
//   Box,
//   Typography,
//   Card,
//   CardContent,
//   TextField,
//   Switch,
//   FormControlLabel,
//   Button,
//   CircularProgress,
//   Alert,
// } from "@mui/material";
// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { toast } from "react-toastify";
// import { motion } from "framer-motion";
// import dayjs from "dayjs";

// const Projects = () => {
//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const { user } = useContext(AuthContext);

//   useEffect(() => {
//     if (!user) return;

//     const fetchProjects = async () => {
//       try {
//         const res = await getProjects();
//         setProjects(res.data || []);
//       } catch (err) {
//         console.error("Failed to load projects:", err);
//         setError("Failed to load projects. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProjects();
//   }, [user]);

//   const canEdit = (field) => {
//     if (!user) return false;
//     const role = user.role?.toLowerCase();

//     if (role === "superadmin") return true;

//     if (role === "admin") {
//       return ["project_name", "status", "startdate", "enddate", "budget_allocated", "budget_used"].includes(field);
//     }

//     // Developer / Tester / others: read-only
//     return false;
//   };

//   const handleChange = async (project, field, value) => {
//     if (!canEdit(field)) return;

//     const updatedProject = { ...project, [field]: value };

//     toast.info("Save this change?", {
//       position: "top-center",
//       autoClose: false,
//       closeOnClick: true,
//       onClick: async () => {
//         try {
//           await updateProject(project.projectid || project.project_id, updatedProject);
//           setProjects((prev) =>
//             prev.map((p) =>
//               (p.projectid || p.project_id) === (project.projectid || project.project_id) ? updatedProject : p
//             )
//           );
//           toast.success("Changes saved successfully!");
//         } catch (err) {
//           console.error("Update failed:", err);
//           toast.error("Failed to save changes");
//         }
//       },
//     });
//   };

//   if (!user) return <Alert severity="warning">Please log in to view projects.</Alert>;

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 10 }} />;

//   if (error) return <Alert severity="error">{error}</Alert>;

//   return (
//     <LocalizationProvider dateAdapter={AdapterDayjs}>
//       <Box sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
//         <Typography variant="h4" gutterBottom align="center">
//           Projects Overview
//         </Typography>

//         {projects.length === 0 ? (
//           <Alert severity="info">No projects found or still loading...</Alert>
//         ) : (
//           projects.map((p) => {
//             const id = p.projectid || p.project_id;
//             const canEditAll = canEdit("all"); // for simplicity in some checks

//             return (
//               <motion.div
//                 key={id}
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.5 }}
//               >
//                 <Card sx={{ mb: 4, boxShadow: 6, borderRadius: 3 }}>
//                   <CardContent>
//                     <Typography variant="h6" gutterBottom>
//                       {p.project_name || p.projectname || "Unnamed Project"}
//                     </Typography>

//                     <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
//                       {/* Project Name */}
//                       <TextField
//                         label="Project Name"
//                         value={p.project_name || p.projectname || ""}
//                         onChange={(e) => handleChange(p, "project_name", e.target.value)}
//                         disabled={!canEdit("project_name")}
//                         fullWidth
//                       />

//                       {/* Status Toggle */}
//                       <FormControlLabel
//                         control={
//                           <Switch
//                             checked={(p.status || "").toLowerCase() === "active"}
//                             onChange={(e) =>
//                               handleChange(p, "status", e.target.checked ? "Active" : "Inactive")
//                             }
//                             disabled={!canEdit("status")}
//                           />
//                         }
//                         label={`Status: ${p.status || "N/A"}`}
//                       />

//                       {/* Start Date */}
//                       <DatePicker
//                         label="Start Date"
//                         value={p.startdate ? dayjs(p.startdate) : null}
//                         onChange={(newValue) => handleChange(p, "startdate", newValue?.format("YYYY-MM-DD"))}
//                         disabled={!canEdit("startdate")}
//                         slotProps={{ textField: { fullWidth: true } }}
//                       />

//                       {/* End Date */}
//                       <DatePicker
//                         label="End Date"
//                         value={p.enddate ? dayjs(p.enddate) : null}
//                         onChange={(newValue) => handleChange(p, "enddate", newValue?.format("YYYY-MM-DD"))}
//                         disabled={!canEdit("enddate")}
//                         slotProps={{ textField: { fullWidth: true } }}
//                       />

//                       {/* Budget Allocated */}
//                       <TextField
//                         label="Budget Allocated (₹)"
//                         type="number"
//                         value={p.budget_allocated || p.budgetallocated || 0}
//                         onChange={(e) => handleChange(p, "budget_allocated", Number(e.target.value))}
//                         disabled={!canEdit("budget_allocated")}
//                         fullWidth
//                         InputProps={{ startAdornment: "₹" }}
//                       />

//                       {/* Budget Used */}
//                       <TextField
//                         label="Budget Used (₹)"
//                         type="number"
//                         value={p.budget_used || p.budgetspent || 0}
//                         onChange={(e) => handleChange(p, "budget_used", Number(e.target.value))}
//                         disabled={!canEdit("budget_used")}
//                         fullWidth
//                         InputProps={{ startAdornment: "₹" }}
//                       />
//                     </Box>

//                     {/* Quick actions for SuperAdmin */}
//                     {canEditAll && (
//                       <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
//                         <Button
//                           variant="outlined"
//                           color="primary"
//                           onClick={() => handleChange(p, "budget_allocated", (p.budget_allocated || 0) + 10000)}
//                         >
//                           +₹10,000 Allocated
//                         </Button>
//                         <Button variant="contained" color="success">
//                           Save All Changes
//                         </Button>
//                       </Box>
//                     )}
//                   </CardContent>
//                 </Card>
//               </motion.div>
//             );
//           })
//         )}
//       </Box>
//     </LocalizationProvider>
//   );
// };

// export default Projects;