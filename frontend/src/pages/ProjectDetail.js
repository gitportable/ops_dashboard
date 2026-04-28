import React, { useEffect, useState, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../auth/AuthContext";
import {
  createProject,
  getProjectById,
  getProjectStats,
  updateProject,
  updateBudget,
} from "../api/projectApi";
import { getProjectIssues } from "../api/issueApi";
import api from "../api/axios";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import toast from "react-hot-toast";
const C = {
  navy:    "#0f172a",
  blue:    "#1e40af",
  blueSoft:"#3b82f6",
  green:   "#16a34a",
  red:     "#dc2626",
  orange:  "#f97316",
  yellow:  "#eab308",
  purple:  "#7c3aed",
  slate:   "#64748b",
  bg:      "#f1f5f9",
  card:    "#ffffff",
  border:  "#e2e8f0",
};

const STATUS_COLOR = {
  done:           { bg: "#dcfce7", color: "#15803d" },
  "in progress":  { bg: "#dbeafe", color: "#1d4ed8" },
  open:           { bg: "#f3f4f6", color: "#374151" },
  verified:       { bg: "#f5f3ff", color: "#7c3aed" },
  "needs info":   { bg: "#fff7ed", color: "#c2410c" },
  escalated:      { bg: "#fef2f2", color: "#dc2626" },
};

const TEAM_COLORS = ["#3b82f6","#16a34a","#f97316","#7c3aed","#dc2626","#0891b2","#eab308"];
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());
const pct = (used, total) =>
  total ? Math.min(100, Math.round((used / total) * 100)) : 0;

const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "1.5rem", ...style,
  }}>
    {children}
  </div>
);

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: "1.25rem" }}>
    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: C.navy }}>{children}</h3>
    {sub && <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: C.slate }}>{sub}</p>}
  </div>
);

const Badge = ({ label, bg, color }) => (
  <span style={{
    padding: "3px 10px", borderRadius: 99, fontSize: "0.72rem",
    fontWeight: 700, background: bg, color,
  }}>{label}</span>
);

const StatusBadge = ({ status = "open" }) => {
  const s = STATUS_COLOR[status.toLowerCase()] || STATUS_COLOR.open;
  return <Badge label={status} bg={s.bg} color={s.color} />;
};

const BudgetBar = ({ used, total }) => {
  const p = pct(used, total);
  const barColor = p > 90 ? C.red : p > 70 ? C.orange : C.green;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
        fontSize: "0.8rem", marginBottom: 6 }}>
        <span style={{ color: C.slate }}>Used: <b style={{ color: C.navy }}>${fmt(used)}</b></span>
        <span style={{ color: C.slate }}>Total: <b style={{ color: C.navy }}>${fmt(total)}</b></span>
      </div>
      <div style={{ background: "#e2e8f0", borderRadius: 99, height: 12, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99, width: `${p}%`,
          background: barColor, transition: "width 0.6s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between",
        fontSize: "0.72rem", marginTop: 4, color: C.slate }}>
        <span style={{ color: barColor, fontWeight: 700 }}>{p}% consumed</span>
        <span>Remaining: ${fmt((total || 0) - (used || 0))}</span>
      </div>
    </div>
  );
};

const InlineBudgetEditor = ({ projectId, currentUsed, onSave }) => {
  const [val, setVal] = useState(currentUsed ?? "");
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    setSaving(true);
    try {
      await updateBudget(projectId, Number(val));
      toast.success("Budget updated");
      onSave(Number(val));
    } catch {
      toast.error("Failed to update budget");
    } finally { setSaving(false); }
  };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
      <input
        type="number" value={val}
        onChange={(e) => setVal(e.target.value)}
        style={{
          padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
          fontSize: "0.85rem", width: 140, outline: "none",
        }}
        placeholder="Budget used ($)"
      />
      <button onClick={handle} disabled={saving} style={{
        padding: "6px 14px", background: C.blue, color: "#fff",
        border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer",
        fontSize: "0.85rem", opacity: saving ? 0.7 : 1, fontWeight: 600,
      }}>
        {saving ? "Saving…" : "Update"}
      </button>
    </div>
  );
};
const SprintTimeline = ({ current, total }) => {
  const n = total || Math.max(current + 2, 6);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      {Array.from({ length: n }).map((_, i) => {
        const sprint = i + 1;
        const done   = sprint < current;
        const active = sprint === current;
        return (
          <div key={sprint} title={`Sprint ${sprint}`} style={{
            width: 32, height: 32, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.72rem", fontWeight: 700,
            background: active ? C.blue : done ? "#dbeafe" : "#f1f5f9",
            color:      active ? "#fff"  : done ? C.blue   : C.slate,
            border: `2px solid ${active ? C.blue : done ? "#bfdbfe" : C.border}`,
          }}>
            {sprint}
          </div>
        );
      })}
    </div>
  );
};
const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useContext(AuthContext);
  const isNewProject = !id || id === "new";

  const [project, setProject] = useState(null);
  const [stats,   setStats]   = useState([]);
  const [issues,  setIssues]  = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("overview");
  const [newProjectForm, setNewProjectForm] = useState({
    projectname: "", projectid: "", status: "Active",
    startdate: "", budgetallocated: "", budgetused: "",
  });
  const [creating, setCreating] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const isSuperAdmin = ["admin", "superadmin"].includes((role || "").toLowerCase());

  useEffect(() => {
    if (isNewProject) {
      setLoading(false);
      api.get('/users').then(res => setAllUsers(res.data)).catch(() => {});
      return;
    }
    const load = async () => {
      try {
        const [projRes, statsRes, issuesData] = await Promise.all([
          getProjectById(id),
          getProjectStats(id),
          getProjectIssues(id),
        ]);
        setProject(projRes.data);
        setStats(Array.isArray(statsRes.data) ? statsRes.data : []);
        setIssues(Array.isArray(issuesData) ? issuesData : []);

        // Try members endpoint (optional)
        try {
          const memRes = await api.get(`/projects/${id}/members`);
          setMembers(Array.isArray(memRes.data) ? memRes.data : []);
        } catch { setMembers([]); }
      } catch {
        toast.error("Error loading project details");
        navigate("/projects");
      } finally { setLoading(false); }
    };
    load();
  }, [id, navigate, isNewProject]);

  const handleCreateProject = async () => {
    if (!newProjectForm.projectname || !newProjectForm.projectid) {
      toast.error("Project Name and Project ID are required.");
      return;
    }
    setCreating(true);
    try {
      await createProject({
        ...newProjectForm,
        memberIds: selectedMemberIds
      });
      toast.success("Project created successfully.");
      setSelectedMemberIds([]);
      setAllUsers([]);
      queryClient.invalidateQueries({ queryKey: ["allProjects"] });
      navigate("/projects");
    } catch (err) {
      toast.error("Failed to create project.");
    } finally {
      setCreating(false);
    }
  };

  const D = useMemo(() => {
    const solved  = issues.filter((i) => (i.status||"").toLowerCase() === "done").length;
    const pending = issues.length - solved;
    const bugs    = issues.filter((i) => (i.issuetype||i.issue_type||"").toLowerCase() === "bug").length;
    const tasks   = issues.length - bugs;
    const esc     = issues.filter((i) => (i.status||"").toLowerCase() === "escalated").length;

    const teamMap = {};
    issues.forEach((i) => {
      const t = i.assigneeteam || "Unknown";
      if (!teamMap[t]) teamMap[t] = { team: t, count: 0, done: 0 };
      teamMap[t].count++;
      if ((i.status||"").toLowerCase() === "done") teamMap[t].done++;
    });

    const statusMap = {};
    issues.forEach((i) => {
      const s = i.status || "Open";
      statusMap[s] = (statusMap[s] || 0) + 1;
    });

    const sprintMap = {};
    issues.forEach((i) => {
      const s = i.sprint || "—";
      if (!sprintMap[s]) sprintMap[s] = { sprint: s, total: 0, done: 0 };
      sprintMap[s].total++;
      if ((i.status||"").toLowerCase() === "done") sprintMap[s].done++;
    });

    return {
      solved, pending, bugs, tasks, esc,
      total: issues.length,
      byTeam:   Object.values(teamMap),
      byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
      bySprint: Object.values(sprintMap).sort((a,b) =>
        String(a.sprint).localeCompare(String(b.sprint), undefined, { numeric: true })),
      teams: [...new Set(issues.map((i) => i.assigneeteam).filter(Boolean))],
    };
  }, [issues]);

  if (isNewProject) return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ padding: "2rem 2.5rem" }}>
        <h1 style={{ margin: 0, color: C.navy, fontSize: "1.8rem", fontWeight: 800 }}>
          Create Project
        </h1>
        <p style={{ marginTop: 6, color: C.slate }}>
          Fill out the project details below.
        </p>
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "1.5rem", marginTop: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <input
              placeholder="Project Name"
              value={newProjectForm.projectname}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, projectname: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}
            />
            <input
              placeholder="Project ID"
              value={newProjectForm.projectid}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, projectid: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}
            />
            <input
              placeholder="Status"
              value={newProjectForm.status}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, status: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}
            />
            <input
              type="date"
              placeholder="Start Date"
              value={newProjectForm.startdate}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, startdate: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}
            />
            <input
              type="number"
              placeholder="Budget Allocated"
              value={newProjectForm.budgetallocated}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, budgetallocated: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}
            />
            <input
              type="number"
              placeholder="Budget Used"
              value={newProjectForm.budgetused}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, budgetused: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}
            />
          </div>
          {/* Assign Team Members */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e3a8a', display: 'block', marginBottom: '8px' }}>
              Assign Team Members (optional)
            </label>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '8px',
              maxHeight: '160px', overflowY: 'auto',
              border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px'
            }}>
              {allUsers.map(user => (
                <label key={user.id} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 10px', borderRadius: '20px', cursor: 'pointer',
                  backgroundColor: selectedMemberIds.includes(user.id) ? '#1e3a8a' : '#f3f4f6',
                  color: selectedMemberIds.includes(user.id) ? '#fff' : '#374151',
                  fontSize: '13px', transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    style={{ display: 'none' }}
                    checked={selectedMemberIds.includes(user.id)}
                    onChange={() => {
                      setSelectedMemberIds(prev =>
                        prev.includes(user.id)
                          ? prev.filter(id => id !== user.id)
                          : [...prev, user.id]
                      );
                    }}
                  />
                  {user.email} — <span style={{ fontSize: '11px', opacity: 0.8 }}>{user.role}</span>
                </label>
              ))}
              {allUsers.length === 0 && (
                <span style={{ color: '#9ca3af', fontSize: '13px' }}>Loading users...</span>
              )}
            </div>
            {selectedMemberIds.length > 0 && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                {selectedMemberIds.length} member(s) selected
              </p>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button onClick={() => navigate("/projects")} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontWeight: 600 }}>
              Cancel
            </button>
            <button onClick={handleCreateProject} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", fontWeight: 700, opacity: creating ? 0.7 : 1, cursor: creating ? "progress" : "pointer" }}>
              {creating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        border: `4px solid ${C.border}`, borderTopColor: C.blue,
        animation: "spin 0.8s linear infinite",
      }} />
      <span style={{ color: C.slate, fontSize: "0.9rem" }}>Loading project…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!project) return null;

  const used        = project.budgetused ?? project.budget_used ?? 0;
  const allocated   = project.budgetallocated ?? project.budget_allocated ?? 0;
  const budgetPct   = pct(used, allocated);
  const budgetColor = budgetPct > 90 ? C.red : budgetPct > 70 ? C.orange : C.green;
  const budgetLabel = budgetPct > 90 ? "⚠ Critical" : budgetPct > 70 ? "⚡ Moderate" : "✅ Healthy";
  const startDate   = project.start_date || project.startdate || project.created_at;

  const TAB = ({ id: tid, label }) => (
    <button onClick={() => setTab(tid)} style={{
      padding: "8px 20px", borderRadius: 99, border: "none", cursor: "pointer",
      fontWeight: 700, fontSize: "0.85rem", transition: "all 0.15s",
      background: tab === tid ? C.blue : "transparent",
      color:      tab === tid ? "#fff"  : C.slate,
    }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg,
      fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a8a 100%)`,
        padding: "2rem 2.5rem 3.5rem", position: "relative", overflow: "hidden",
      }}>
        {[200,350,500].map((sz,i) => (
          <div key={i} style={{
            position:"absolute", width:sz, height:sz, borderRadius:"50%",
            border:"1px solid rgba(255,255,255,0.05)",
            top:sz===200?-60:sz===350?-80:-120,
            right:sz===200?-60:sz===350?-100:-140,
          }}/>
        ))}

        <button onClick={() => navigate("/projects")} style={{
          display:"inline-flex", alignItems:"center", gap:6,
          background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)",
          color:"#fff", borderRadius:8, padding:"6px 14px",
          fontSize:"0.82rem", fontWeight:600, cursor:"pointer", marginBottom:"1.25rem",
        }}>
          ← Back to Projects
        </button>

        <div style={{ display:"flex", alignItems:"flex-start", gap:"1.5rem", flexWrap:"wrap" }}>
          <div style={{
            width:56, height:56, borderRadius:16,
            background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"1.5rem", flexShrink:0,
          }}>📁</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <h1 style={{ margin:0, color:"#fff", fontSize:"1.75rem", fontWeight:800 }}>
                {project.project_name || project.projectname}
              </h1>
              <span style={{
                padding:"3px 12px", borderRadius:99, fontSize:"0.75rem", fontWeight:700,
                background: project.status==="Active" ? "#dcfce7" : "#f3f4f6",
                color:      project.status==="Active" ? "#15803d" : "#374151",
              }}>
                {project.status || "Active"}
              </span>
            </div>
            <div style={{ display:"flex", gap:"1.5rem", marginTop:8, flexWrap:"wrap" }}>
              {[
                ["Project ID",    `#${project.project_id || project.projectid}`],
                ["Start Date",    startDate ? new Date(startDate).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}) : "—"],
                ["Current Sprint",`Sprint ${project.current_sprint || 0}`],
                ["Active Teams",  D.teams.length || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.5)",
                    textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
                  <div style={{ fontSize:"0.95rem", fontWeight:700, color:"#fff" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              ["Total Issues", D.total,   C.blueSoft],
              ["Solved",       D.solved,  C.green   ],
              ["Pending",      D.pending, C.orange  ],
              ["Escalated",    D.esc,     C.red     ],
            ].map(([label, value, color]) => (
              <div key={label} style={{
                background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:12, padding:"10px 16px", textAlign:"center", minWidth:80,
              }}>
                <div style={{ fontSize:"1.4rem", fontWeight:800, color }}>{value}</div>
                <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.6)",
                  textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{
        background:"#fff", borderBottom:`1px solid ${C.border}`,
        padding:"0.75rem 2.5rem", display:"flex", gap:4,
        position:"sticky", top:0, zIndex:10,
      }}>
        <TAB id="overview" label="📊 Overview" />
        <TAB id="issues"   label={`🐛 Issues (${D.total})`} />
        <TAB id="members"  label="👥 Team & Members" />
      </div>
      <div style={{ padding:"2rem 2.5rem", marginTop:"-1.5rem" }}>
        {tab === "overview" && (
          <div style={{ display:"grid", gap:"1.5rem" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
              <Card>
                <SectionTitle sub="Allocation vs. consumption">💰 Budget Health</SectionTitle>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:"1rem" }}>
                  <Badge label={budgetLabel} bg={`${budgetColor}1a`} color={budgetColor} />
                  <span style={{ fontSize:"1.8rem", fontWeight:800, color:budgetColor }}>
                    {budgetPct}%
                  </span>
                </div>
                <BudgetBar used={used} total={allocated} />
                <div style={{ marginTop:"1.25rem", display:"grid",
                  gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {[
                    { label:"Allocated", val:`$${fmt(allocated)}`,   color:C.blueSoft },
                    { label:"Spent",     val:`$${fmt(used)}`,         color:budgetColor },
                    { label:"Remaining", val:`$${fmt((allocated||0)-(used||0))}`, color:C.green },
                    { label:"Burn Rate", val:`${budgetPct}%`,                        color:C.slate },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{
                      background:"#f8fafc", borderRadius:10,
                      padding:"10px 14px", borderLeft:`3px solid ${color}`,
                    }}>
                      <div style={{ fontSize:"0.7rem", color:C.slate,
                        textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:600 }}>{label}</div>
                      <div style={{ fontSize:"1.1rem", fontWeight:800, color, marginTop:2 }}>{val}</div>
                    </div>
                  ))}
                </div>
                {isSuperAdmin && (
                  <div style={{ marginTop:"1rem", borderTop:`1px solid ${C.border}`, paddingTop:"1rem" }}>
                    <div style={{ fontSize:"0.78rem", fontWeight:600, color:C.slate, marginBottom:4 }}>
                      Update Budget Used
                    </div>
                    <InlineBudgetEditor
                      projectId={project.project_id}
                      currentUsed={used}
                      onSave={(val) => setProject({ ...project, budgetused: val, budget_used: val })}
                    />
                  </div>
                )}
              </Card>
              <Card>
                <SectionTitle sub="Progress through sprints">🚀 Sprint Progress</SectionTitle>
                <div style={{ display:"flex", gap:"2rem", marginBottom:"1rem" }}>
                  {[
                    { label:"Current",   value:`S${project.current_sprint || 0}`,  color:C.blue  },
                    { label:"Completed", value:Math.max(0,(project.current_sprint||1)-1), color:C.green },
                    { label:"Avg Issues/Sprint",
                      value:D.bySprint.length ? Math.round(D.total/D.bySprint.length) : "—",
                      color:C.slate },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:"2rem", fontWeight:800, color, lineHeight:1 }}>{value}</div>
                      <div style={{ fontSize:"0.7rem", color:C.slate, marginTop:4, fontWeight:600,
                        textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</div>
                    </div>
                  ))}
                </div>
                <SprintTimeline current={project.current_sprint || 1} />
                {isSuperAdmin && (
                  <button onClick={async () => {
                    const next = (project.current_sprint || 0) + 1;
                    try {
                      await updateProject(id, { current_sprint: next });
                      setProject({ ...project, current_sprint: next });
                      toast.success(`Moved to Sprint ${next}`);
                    } catch { toast.error("Failed to update sprint"); }
                  }} style={{
                    marginTop:"1rem", padding:"8px 18px",
                    background:C.blue, color:"#fff", border:"none",
                    borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:"0.85rem",
                  }}>
                    → Advance to Next Sprint
                  </button>
                )}
                {D.bySprint.length > 0 && (
                  <div style={{ height:150, marginTop:"1.25rem" }}>
                    <div style={{ fontSize:"0.72rem", color:C.slate, fontWeight:600,
                      marginBottom:4, textTransform:"uppercase", letterSpacing:"0.04em" }}>
                      Issues per Sprint (done vs total)
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={D.bySprint} barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="sprint" tick={{ fontSize:10 }} />
                        <YAxis tick={{ fontSize:10 }} />
                        <Tooltip />
                        <Bar dataKey="total" name="Total"  fill="#dbeafe" radius={[4,4,0,0]} />
                        <Bar dataKey="done"  name="Done"   fill={C.green} radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1.5rem" }}>
              <Card>
                <SectionTitle>📌 Issues by Status</SectionTitle>
                {D.byStatus.length ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={D.byStatus} dataKey="count" nameKey="status"
                        cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {D.byStatus.map((_, idx) => (
                          <Cell key={idx} fill={TEAM_COLORS[idx % TEAM_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={8} wrapperStyle={{ fontSize:"0.75rem" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color:C.slate, textAlign:"center", padding:"2rem" }}>No data</div>
                )}
              </Card>
              <Card>
                <SectionTitle>🏗️ Workload by Team</SectionTitle>
                {D.byTeam.length ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={D.byTeam} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize:10 }} />
                      <YAxis dataKey="team" type="category" tick={{ fontSize:10 }} width={70} />
                      <Tooltip />
                      <Bar dataKey="count" name="Issues" radius={[0,4,4,0]}>
                        {D.byTeam.map((_, i) => (
                          <Cell key={i} fill={TEAM_COLORS[i % TEAM_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color:C.slate, textAlign:"center", padding:"2rem" }}>No data</div>
                )}
              </Card>
              <Card>
                <SectionTitle>🐞 Issue Breakdown</SectionTitle>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:"1rem" }}>
                  {[
                    { label:"Bugs",    value:D.bugs,    color:C.red      },
                    { label:"Tasks",   value:D.tasks,   color:C.blueSoft },
                    { label:"Solved",  value:D.solved,  color:C.green    },
                    { label:"Pending", value:D.pending, color:C.orange   },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{
                      background:`${color}0f`, border:`1px solid ${color}30`,
                      borderRadius:10, padding:"12px 10px", textAlign:"center",
                    }}>
                      <div style={{ fontSize:"1.6rem", fontWeight:800, color }}>{value}</div>
                      <div style={{ fontSize:"0.68rem", color:C.slate, fontWeight:600,
                        textTransform:"uppercase" }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:"0.78rem", color:C.slate, marginBottom:4 }}>
                  Resolution Rate:{" "}
                  <b style={{ color:C.green }}>
                    {D.total ? Math.round((D.solved/D.total)*100) : 0}%
                  </b>
                </div>
                <div style={{ background:"#e2e8f0", borderRadius:99, height:8 }}>
                  <div style={{
                    height:"100%", borderRadius:99, background:C.green,
                    width:`${D.total ? (D.solved/D.total)*100 : 0}%`,
                  }}/>
                </div>
              </Card>
            </div>
            <Card>
              <SectionTitle sub="Issues resolved over time">📈 Issues Solved Trend</SectionTitle>
              <div style={{ height:260 }}>
                {stats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:11 }} />
                      <Tooltip contentStyle={{ borderRadius:10, border:`1px solid ${C.border}` }} />
                      <Line type="monotone" dataKey="solved" stroke={C.blue}
                        strokeWidth={3} dot={{ r:5, fill:C.blue }} activeDot={{ r:7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                    height:"100%", color:C.slate, flexDirection:"column", gap:8 }}>
                    <span style={{ fontSize:"2rem" }}>📉</span>
                    <span>No trend data available yet</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
        {tab === "issues" && (
          <Card>
            <SectionTitle sub={`${D.total} total · ${D.solved} solved · ${D.pending} pending`}>
              All Issues
            </SectionTitle>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"1rem" }}>
              {D.byStatus.map(({ status, count }) => {
                const s = STATUS_COLOR[status.toLowerCase()] || STATUS_COLOR.open;
                return (
                  <span key={status} style={{
                    padding:"4px 12px", borderRadius:99, fontSize:"0.72rem",
                    fontWeight:700, background:s.bg, color:s.color,
                  }}>
                    {status}: {count}
                  </span>
                );
              })}
            </div>
            <div style={{ overflowX:"auto", borderRadius:10, border:`1px solid ${C.border}` }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:820 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:`2px solid ${C.border}` }}>
                    {["#","Type","Sprint","Status","Team","Severity","Created","Closed","Description"].map((h) => (
                      <th key={h} style={{
                        padding:"11px 14px", textAlign:"left", fontSize:"0.72rem",
                        fontWeight:700, color:C.slate, textTransform:"uppercase",
                        letterSpacing:"0.04em", whiteSpace:"nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {issues.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding:"2rem", textAlign:"center", color:C.slate }}>
                        No issues found for this project.
                      </td>
                    </tr>
                  ) : issues.map((issue) => {
                    const iid   = issue.issue_id || issue.issueid || issue.IssueID;
                    const isBug = (issue.issuetype||issue.issue_type||"").toLowerCase() === "bug";
                    const status = issue.status || "Open";
                    return (
                      <tr key={iid} style={{
                        borderBottom:`1px solid #f1f5f9`,
                        background: isBug ? "#fff8f7" : "#fff",
                      }}>
                        <td style={{ padding:"10px 14px", fontWeight:700,
                          fontSize:"0.85rem", color:C.slate }}>#{iid}</td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{
                            padding:"2px 9px", borderRadius:99, fontSize:"0.72rem", fontWeight:700,
                            background: isBug ? "#fef2f2" : "#eff6ff",
                            color:      isBug ? C.red     : C.blue,
                          }}>
                            {isBug ? "Bug" : "Task"}
                          </span>
                        </td>
                        <td style={{ padding:"10px 14px", fontSize:"0.85rem" }}>
                          {issue.sprint || "—"}
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <StatusBadge status={status} />
                        </td>
                        <td style={{ padding:"10px 14px", fontSize:"0.85rem" }}>
                          {issue.assigneeteam || "—"}
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{
                            padding:"2px 8px", borderRadius:99,
                            fontSize:"0.7rem", fontWeight:700,
                            background: isBug ? "#fef2f2" : "#f0fdf4",
                            color:      isBug ? C.red     : C.green,
                          }}>
                            {isBug ? "High" : "Low"}
                          </span>
                        </td>
                        <td style={{ padding:"10px 14px", fontSize:"0.8rem", color:C.slate }}>
                          {issue.createddate
                            ? new Date(issue.createddate).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding:"10px 14px", fontSize:"0.8rem", color:C.slate }}>
                          {issue.closeddate
                            ? new Date(issue.closeddate).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding:"10px 14px", fontSize:"0.8rem", color:C.slate,
                          maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {issue.description || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === "members" && (
          <div style={{ display:"grid", gap:"1.5rem" }}>
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:"1rem" }}>
              {D.teams.map((team, idx) => {
                const ti   = issues.filter((i) => i.assigneeteam === team);
                const done = ti.filter((i) => (i.status||"").toLowerCase() === "done").length;
                const clr  = TEAM_COLORS[idx % TEAM_COLORS.length];
                return (
                  <div key={team} style={{
                    background:"#fff", borderRadius:14, border:`1px solid ${C.border}`,
                    padding:"1.25rem", borderTop:`4px solid ${clr}`,
                  }}>
                    <div style={{ fontSize:"1rem", fontWeight:700, color:C.navy, marginBottom:4 }}>
                      {team}
                    </div>
                    <div style={{ fontSize:"0.8rem", color:C.slate, marginBottom:"0.75rem" }}>
                      {ti.length} issues assigned
                    </div>
                    <div style={{ background:"#e2e8f0", borderRadius:99, height:6 }}>
                      <div style={{
                        height:"100%", borderRadius:99, background:clr,
                        width:`${ti.length ? (done/ti.length)*100 : 0}%`,
                      }}/>
                    </div>
                    <div style={{ fontSize:"0.72rem", color:C.slate, marginTop:4 }}>
                      {done}/{ti.length} resolved
                    </div>
                    {ti.length > 15 && (
                      <div style={{
                        marginTop:8, padding:"5px 10px", background:"#fef2f2",
                        borderRadius:8, fontSize:"0.72rem", color:C.red, fontWeight:600,
                      }}>
                        ⚠ Overloaded — consider rebalancing
                      </div>
                    )}
                  </div>
                );
              })}
              {D.teams.length === 0 && (
                <div style={{ gridColumn:"1/-1", padding:"2rem",
                  textAlign:"center", color:C.slate }}>
                  No team data yet — teams are derived from issue assignments.
                </div>
              )}
            </div>
            <Card>
              <SectionTitle sub="Users directly assigned to this project">
                👤 Project Members
              </SectionTitle>
              {members.length > 0 ? (
                <div style={{ display:"grid", gap:10 }}>
                  {members.map((m) => (
                    <div key={m.id || m.user_id} style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"10px 14px", background:"#f8fafc",
                      borderRadius:10, border:`1px solid ${C.border}`,
                    }}>
                      <div style={{
                        width:38, height:38, borderRadius:"50%",
                        background:C.blue, color:"#fff",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontWeight:700, fontSize:"0.9rem", flexShrink:0,
                      }}>
                        {(m.name || m.email || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:"0.9rem", color:C.navy }}>
                          {m.name || m.email}
                        </div>
                        <div style={{ fontSize:"0.75rem", color:C.slate }}>{m.email}</div>
                      </div>
                      <span style={{
                        padding:"3px 10px", borderRadius:99, fontSize:"0.72rem",
                        fontWeight:700, background:"#eff6ff", color:C.blue,
                        textTransform:"capitalize",
                      }}>
                        {m.role || "member"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding:"1.5rem", background:"#f8fafc", borderRadius:10,
                  border:`1px dashed ${C.border}`, color:C.slate,
                  fontSize:"0.85rem", textAlign:"center",
                }}>
                  <div style={{ fontSize:"1.5rem", marginBottom:8 }}>👥</div>
                  To show individual members here, add a{" "}
                  <code style={{ background:"#e2e8f0", padding:"1px 6px", borderRadius:4 }}>
                    GET /projects/:id/members
                  </code>{" "}
                  endpoint that returns users from the{" "}
                  <code style={{ background:"#e2e8f0", padding:"1px 6px", borderRadius:4 }}>
                    project_assignments
                  </code>{" "}
                  table joined with users.<br /><br />
                  Team breakdown above is derived from issue <code>assigneeteam</code> field.
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
};

export default ProjectDetail;
