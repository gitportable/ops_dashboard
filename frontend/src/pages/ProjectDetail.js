import React, { useEffect, useState, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../auth/AuthContext";
import {
  getProjectById,
  getProjectStats,
  getProjectMembers,
  getProjectInsights,
  updateProject,
  updateBudget,
} from "../api/projectApi";
import { getProjectIssues } from "../api/issueApi";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "react-hot-toast";

/* ── palette ──────────────────────────────────────────────────────────────── */
const C = {
  navy: "#0f172a", blue: "#1e40af", blueSoft: "#3b82f6", sky: "#0ea5e9",
  green: "#16a34a", emerald: "#059669", red: "#dc2626", orange: "#f97316",
  yellow: "#eab308", purple: "#7c3aed", pink: "#ec4899", slate: "#64748b",
  bg: "#f1f5f9", card: "#ffffff", border: "#e2e8f0",
};

const STATUS_MAP = {
  done:          { bg: "#dcfce7", fg: "#15803d", icon: "✅" },
  "in progress": { bg: "#dbeafe", fg: "#1d4ed8", icon: "🔄" },
  open:          { bg: "#f3f4f6", fg: "#374151", icon: "📋" },
  verified:      { bg: "#f5f3ff", fg: "#7c3aed", icon: "🔍" },
  "needs info":  { bg: "#fff7ed", fg: "#c2410c", icon: "❓" },
  escalated:     { bg: "#fef2f2", fg: "#dc2626", icon: "🚨" },
};

const SEV_MAP = {
  critical: { bg: "#fef2f2", fg: "#dc2626" },
  high:     { bg: "#fff7ed", fg: "#ea580c" },
  medium:   { bg: "#fffbeb", fg: "#ca8a04" },
  low:      { bg: "#f0fdf4", fg: "#16a34a" },
};

const PIE_COLORS = ["#3b82f6","#16a34a","#f97316","#7c3aed","#dc2626","#0891b2","#eab308","#ec4899"];
const ROLE_COLORS = { lead: "#7c3aed", developer: "#3b82f6", tester: "#16a34a", member: "#64748b" };

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());
const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
const daysBetween = (a, b) => {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

/* ── reusable sub-components ──────────────────────────────────────────────── */
const Card = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{
    background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
    boxShadow: "0 1px 6px rgba(0,0,0,0.04)", padding: "1.25rem", ...style,
  }}>
    {children}
  </div>
);

const Section = ({ title, sub, icon, right, children }) => (
  <div style={{ marginBottom: "0.25rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: C.navy }}>
          {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{title}
        </h3>
        {sub && <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: C.slate }}>{sub}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
    {children}
  </div>
);

const Chip = ({ label, bg, color, style = {} }) => (
  <span style={{
    display: "inline-block", padding: "3px 10px", borderRadius: 99,
    fontSize: "0.72rem", fontWeight: 700, background: bg, color, ...style,
  }}>{label}</span>
);

const Stat = ({ label, value, color = C.navy, sub, icon }) => (
  <div style={{
    background: "#f8fafc", borderRadius: 12, padding: "14px 16px",
    borderLeft: `3px solid ${color}`, flex: 1, minWidth: 100,
  }}>
    <div style={{ fontSize: "0.68rem", color: C.slate, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
    </div>
    <div style={{ fontSize: "1.4rem", fontWeight: 800, color, marginTop: 2, lineHeight: 1.2 }}>{value}</div>
    {sub && <div style={{ fontSize: "0.7rem", color: C.slate, marginTop: 2 }}>{sub}</div>}
  </div>
);

const Avatar = ({ name, email, size = 36, color = C.blue }) => {
  const initial = (name || email || "?")[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.4, flexShrink: 0,
    }}>{initial}</div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useContext(AuthContext);

  const [project, setProject] = useState(null);
  const [stats, setStats] = useState({});
  const [issues, setIssues] = useState([]);
  const [members, setMembers] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [issueFilter, setIssueFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const isSuperAdmin = ["admin", "superadmin"].includes((role || "").toLowerCase());

  /* ── data fetch ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, statsRes, issuesData] = await Promise.all([
          getProjectById(id),
          getProjectStats(id),
          getProjectIssues(id),
        ]);
        setProject(projRes.data);
        setStats(statsRes.data || {});
        setIssues(Array.isArray(issuesData) ? issuesData : []);

        // Non-critical fetches
        try {
          const memRes = await getProjectMembers(id);
          setMembers(Array.isArray(memRes.data) ? memRes.data : []);
        } catch { setMembers([]); }

        try {
          const insRes = await getProjectInsights(id);
          setInsights(insRes.data || null);
        } catch { setInsights(null); }

      } catch {
        toast.error("Error loading project details");
        navigate("/projects");
      } finally { setLoading(false); }
    };
    load();
  }, [id, navigate]);

  /* ── derived analytics ──────────────────────────────────────────────────── */
  const D = useMemo(() => {
    const total = issues.length;
    const solved = issues.filter(i => (i.closeddate));
    const done = solved.length;
    const pending = total - done;
    const bugs = issues.filter(i => (i.issuetype || i.issue_type || "").toLowerCase() === "bug").length;
    const tasks = total - bugs;
    const escalated = issues.filter(i => (i.status || "").toLowerCase() === "escalated").length;

    // Severity breakdown
    const sevMap = { critical: 0, high: 0, medium: 0, low: 0 };
    issues.forEach(i => {
      const s = (i.severity || "").toLowerCase();
      if (sevMap[s] !== undefined) sevMap[s]++;
    });

    // Status breakdown
    const statusMap = {};
    issues.forEach(i => {
      const s = i.closeddate ? "Done" : (i.status || "Open");
      statusMap[s] = (statusMap[s] || 0) + 1;
    });

    // Team workload
    const teamMap = {};
    issues.forEach(i => {
      const t = i.assigneeteam || "Unassigned";
      if (!teamMap[t]) teamMap[t] = { team: t, total: 0, done: 0 };
      teamMap[t].total++;
      if (i.closeddate) teamMap[t].done++;
    });

    // Sprint breakdown
    const sprintMap = {};
    issues.forEach(i => {
      const s = i.sprint || "No Sprint";
      if (!sprintMap[s]) sprintMap[s] = { sprint: s, total: 0, done: 0 };
      sprintMap[s].total++;
      if (i.closeddate) sprintMap[s].done++;
    });

    // Resolution trend (issues closed per week)
    const trendMap = {};
    issues.forEach(i => {
      if (i.closeddate) {
        const d = new Date(i.closeddate);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        trendMap[label] = (trendMap[label] || 0) + 1;
      }
    });

    // Issue creation timeline
    const createMap = {};
    issues.forEach(i => {
      if (i.createddate) {
        const d = new Date(i.createddate);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!createMap[label]) createMap[label] = { date: label, created: 0, closed: 0 };
        createMap[label].created++;
      }
      if (i.closeddate) {
        const d = new Date(i.closeddate);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!createMap[label]) createMap[label] = { date: label, created: 0, closed: 0 };
        createMap[label].closed++;
      }
    });

    // Average resolution time
    let totalResTime = 0;
    let resCount = 0;
    issues.forEach(i => {
      if (i.createddate && i.closeddate) {
        const days = daysBetween(i.createddate, i.closeddate);
        if (days !== null && days >= 0) { totalResTime += days; resCount++; }
      }
    });

    const teams = [...new Set(issues.map(i => i.assigneeteam).filter(Boolean))];

    return {
      total, done, pending, bugs, tasks, escalated, sevMap, teams,
      avgResolution: resCount ? Math.round(totalResTime / resCount) : 0,
      byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
      byTeam: Object.values(teamMap).sort((a, b) => b.total - a.total),
      bySprint: Object.values(sprintMap).sort((a, b) =>
        String(a.sprint).localeCompare(String(b.sprint), undefined, { numeric: true })),
      trendStats: Object.entries(trendMap)
        .map(([date, solved]) => ({ date, solved }))
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
      activityStream: Object.values(createMap)
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    };
  }, [issues]);

  /* ── filtered issues for the table ──────────────────────────────────────── */
  const filteredIssues = useMemo(() => {
    let arr = [...issues];
    if (issueFilter !== "all") {
      if (issueFilter === "bugs") arr = arr.filter(i => (i.issuetype || "").toLowerCase() === "bug");
      else if (issueFilter === "tasks") arr = arr.filter(i => (i.issuetype || "").toLowerCase() !== "bug");
      else if (issueFilter === "open") arr = arr.filter(i => !i.closeddate);
      else if (issueFilter === "done") arr = arr.filter(i => i.closeddate);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      arr = arr.filter(i =>
        (i.issueid || "").toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q) ||
        (i.assigneeteam || "").toLowerCase().includes(q) ||
        (i.sprint || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [issues, issueFilter, searchTerm]);

  /* ── loading state ──────────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "80vh", flexDirection: "column", gap: 16, background: C.bg }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        border: `4px solid ${C.border}`, borderTopColor: C.blue,
        animation: "spin 0.8s linear infinite",
      }} />
      <span style={{ color: C.slate, fontSize: "0.9rem" }}>Loading project…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!project) return null;

  /* ── computed project fields ─────────────────────────────────────────────── */
  const pName = project.project_name || project.projectname || project.name || `Project ${id}`;
  const bAlloc = parseFloat(project.budgetallocated || project.budget_allocated || 0);
  const bUsed = parseFloat(project.budgetused || project.budget_used || 0);
  const budgetPct = pct(bUsed, bAlloc);
  const budgetColor = budgetPct > 90 ? C.red : budgetPct > 70 ? C.orange : C.green;
  const startDate = project.startdate || project.start_date;
  const endDate = project.enddate || project.end_date;
  const durationDays = daysBetween(startDate, endDate);
  const elapsed = startDate ? daysBetween(startDate, new Date()) : null;
  const timeProgress = (durationDays && elapsed) ? Math.min(100, Math.round((elapsed / durationDays) * 100)) : null;
  const currentSprint = project.current_sprint || project.sprint ||
    (D.bySprint.length > 0 ? D.bySprint[D.bySprint.length - 1].sprint : "—");

  /* ── tab button ──────────────────────────────────────────────────────────── */
  const TabBtn = ({ tid, label, count }) => (
    <button onClick={() => setTab(tid)} style={{
      padding: "8px 18px", borderRadius: 99, border: "none", cursor: "pointer",
      fontWeight: 700, fontSize: "0.82rem", transition: "all 0.2s",
      background: tab === tid ? C.blue : "transparent",
      color: tab === tid ? "#fff" : C.slate,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {label}
      {count !== undefined && (
        <span style={{
          background: tab === tid ? "rgba(255,255,255,0.25)" : "#e2e8f0",
          padding: "1px 7px", borderRadius: 99, fontSize: "0.7rem",
        }}>{count}</span>
      )}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a8a 60%, #312e81 100%)`,
        padding: "1.75rem 2.5rem 3rem", position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        {[180, 300, 450].map((sz, i) => (
          <div key={i} style={{
            position: "absolute", width: sz, height: sz, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.04)",
            top: -sz * 0.3, right: -sz * 0.3 + i * 40,
          }} />
        ))}

        <button onClick={() => navigate("/projects")} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff", borderRadius: 8, padding: "6px 14px",
          fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", marginBottom: "1rem",
        }}>
          ← Back to Projects
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem", flexWrap: "wrap" }}>
          {/* Project icon */}
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", flexShrink: 0,
          }}>📁</div>

          {/* Project title + meta */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, color: "#fff", fontSize: "1.6rem", fontWeight: 800 }}>{pName}</h1>
              <Chip label={project.status || "Active"}
                bg={project.status === "Active" ? "#dcfce7" : "#f3f4f6"}
                color={project.status === "Active" ? "#15803d" : "#374151"} />
            </div>
            <div style={{ display: "flex", gap: "1.5rem", marginTop: 8, flexWrap: "wrap" }}>
              {[
                ["ID", `#${project.project_id || project.projectid || id}`],
                ["Started", fmtDate(startDate)],
                ["Deadline", fmtDate(endDate)],
                ["Sprint", currentSprint],
                ["Teams", D.teams.length || "—"],
                ["Members", members.length || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero KPI pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              ["Total", D.total, C.blueSoft],
              ["Resolved", D.done, C.green],
              ["Pending", D.pending, C.orange],
              ["Bugs", D.bugs, C.red],
              ["Escalated", D.escalated, "#ef4444"],
            ].map(([label, value, color]) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 68,
              }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB BAR ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderBottom: `1px solid ${C.border}`,
        padding: "0.6rem 2.5rem", display: "flex", gap: 4,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <TabBtn tid="overview" label="📊 Overview" />
        <TabBtn tid="issues" label="🐛 Issues" count={D.total} />
        <TabBtn tid="team" label="👥 Team" count={members.length} />
        <TabBtn tid="analytics" label="📈 Analytics" />
      </div>

      {/* ── PAGE BODY ────────────────────────────────────────────────────────── */}
      <div style={{ padding: "1.5rem 2.5rem" }}>

        {/* ════════════ OVERVIEW TAB ════════════ */}
        {tab === "overview" && (
          <div style={{ display: "grid", gap: "1.25rem" }}>

            {/* Row 1: Key Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
              <Stat label="Resolution Rate" value={`${D.total ? Math.round((D.done / D.total) * 100) : 0}%`} color={C.green} icon="✅" />
              <Stat label="Avg Resolution" value={`${D.avgResolution}d`} color={C.blueSoft} icon="⏱️" sub="days to close" />
              <Stat label="Bug Ratio" value={`${D.total ? Math.round((D.bugs / D.total) * 100) : 0}%`} color={C.red} icon="🐛" sub={`${D.bugs} of ${D.total}`} />
              <Stat label="Budget Used" value={`${budgetPct}%`} color={budgetColor} icon="💰" sub={`$${fmt(bUsed)} / $${fmt(bAlloc)}`} />
              <Stat label="Time Elapsed" value={timeProgress !== null ? `${timeProgress}%` : "—"} color={timeProgress > 90 ? C.red : C.blueSoft} icon="📅"
                sub={durationDays ? `${elapsed || 0} of ${durationDays} days` : undefined} />
            </div>

            {/* Row 2: Budget + Timeline + Sprint */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>

              {/* Budget Health */}
              <Card>
                <Section title="Budget Health" icon="💰" sub="Allocation vs. consumption">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Chip label={budgetPct > 90 ? "⚠ Critical" : budgetPct > 70 ? "⚡ Moderate" : "✅ Healthy"}
                      bg={`${budgetColor}18`} color={budgetColor} />
                    <span style={{ fontSize: "1.6rem", fontWeight: 800, color: budgetColor }}>{budgetPct}%</span>
                  </div>
                  <div style={{ background: "#e2e8f0", borderRadius: 99, height: 10, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", borderRadius: 99, width: `${budgetPct}%`, background: budgetColor, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                    {[
                      { l: "Allocated", v: `$${fmt(bAlloc)}`, c: C.blueSoft },
                      { l: "Spent", v: `$${fmt(bUsed)}`, c: budgetColor },
                      { l: "Remaining", v: `$${fmt(bAlloc - bUsed)}`, c: C.green },
                      { l: "Burn Rate", v: `${budgetPct}%`, c: C.slate },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px", borderLeft: `3px solid ${c}` }}>
                        <div style={{ fontSize: "0.65rem", color: C.slate, textTransform: "uppercase", fontWeight: 600 }}>{l}</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: c, marginTop: 1 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {isSuperAdmin && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                      <BudgetEditor projectId={project.project_id || project.projectid} used={bUsed}
                        onSave={(val) => setProject({ ...project, budgetused: val })} />
                    </div>
                  )}
                </Section>
              </Card>

              {/* Timeline */}
              <Card>
                <Section title="Project Timeline" icon="📅" sub="Duration and progress">
                  <div style={{ display: "flex", gap: "1.5rem", marginBottom: 16 }}>
                    {[
                      { l: "Start", v: fmtDate(startDate), c: C.green },
                      { l: "Deadline", v: fmtDate(endDate), c: C.red },
                      { l: "Duration", v: durationDays ? `${durationDays} days` : "—", c: C.blueSoft },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ fontSize: "0.65rem", color: C.slate, textTransform: "uppercase", fontWeight: 600 }}>{l}</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: c, marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {timeProgress !== null && (
                    <>
                      <div style={{ background: "#e2e8f0", borderRadius: 99, height: 8, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          width: `${timeProgress}%`,
                          background: timeProgress > 100 ? C.red : `linear-gradient(90deg, ${C.green}, ${C.blueSoft})`,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "0.7rem", color: C.slate }}>
                        <span style={{ color: timeProgress > 100 ? C.red : C.green, fontWeight: 700 }}>
                          {timeProgress > 100 ? `⚠ ${timeProgress - 100}% overdue` : `${timeProgress}% elapsed`}
                        </span>
                        <span>{durationDays - (elapsed || 0)} days remaining</span>
                      </div>
                    </>
                  )}
                  {/* Severity Breakdown */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: C.slate, marginBottom: 8, textTransform: "uppercase" }}>
                      Severity Breakdown
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {Object.entries(D.sevMap).map(([sev, count]) => {
                        const s = SEV_MAP[sev] || SEV_MAP.low;
                        return (
                          <div key={sev} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 10px", background: s.bg, borderRadius: 8,
                          }}>
                            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: s.fg }}>{count}</span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: s.fg, textTransform: "capitalize" }}>{sev}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Section>
              </Card>

              {/* Sprint Progress */}
              <Card>
                <Section title="Sprint Progress" icon="🚀" sub="Velocity across sprints">
                  <div style={{ display: "flex", gap: "1.5rem", marginBottom: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: C.blue, lineHeight: 1 }}>{currentSprint}</div>
                      <div style={{ fontSize: "0.65rem", color: C.slate, fontWeight: 600, textTransform: "uppercase", marginTop: 4 }}>Current</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: C.green, lineHeight: 1 }}>{D.bySprint.length}</div>
                      <div style={{ fontSize: "0.65rem", color: C.slate, fontWeight: 600, textTransform: "uppercase", marginTop: 4 }}>Sprints</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: C.slate, lineHeight: 1 }}>
                        {D.bySprint.length ? Math.round(D.total / D.bySprint.length) : "—"}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: C.slate, fontWeight: 600, textTransform: "uppercase", marginTop: 4 }}>Avg/Sprint</div>
                    </div>
                  </div>
                  {D.bySprint.length > 0 && (
                    <div style={{ height: 150 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={D.bySprint} barSize={14}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="sprint" tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ borderRadius: 10, fontSize: "0.8rem" }} />
                          <Bar dataKey="total" name="Total" fill="#dbeafe" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="done" name="Done" fill={C.green} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {isSuperAdmin && (
                    <button onClick={async () => {
                      const next = (parseInt(String(currentSprint).replace(/\D/g, '')) || 0) + 1;
                      const nextSprint = `Sprint ${next}`;
                      try {
                        await updateProject(id, { current_sprint: nextSprint });
                        setProject({ ...project, current_sprint: nextSprint });
                        toast.success(`Moved to ${nextSprint}`);
                      } catch { toast.error("Failed to update sprint"); }
                    }} style={{
                      marginTop: 8, padding: "7px 16px", background: C.blue, color: "#fff",
                      border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", width: "100%",
                    }}>
                      → Advance Sprint
                    </button>
                  )}
                </Section>
              </Card>
            </div>

            {/* Row 3: Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
              {/* Issue Status Pie */}
              <Card>
                <Section title="Issues by Status" icon="📌">
                  {D.byStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={D.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%"
                          innerRadius={45} outerRadius={75} paddingAngle={3}>
                          {D.byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "0.72rem" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyState msg="No status data" />}
                </Section>
              </Card>

              {/* Team Workload */}
              <Card>
                <Section title="Team Workload" icon="🏗️">
                  {D.byTeam.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={D.byTeam} layout="vertical" barSize={12}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="team" type="category" tick={{ fontSize: 10 }} width={65} />
                        <Tooltip />
                        <Bar dataKey="total" name="Total" fill="#dbeafe" radius={[0, 3, 3, 0]} />
                        <Bar dataKey="done" name="Done" fill={C.green} radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState msg="No team data" />}
                </Section>
              </Card>

              {/* Issue Breakdown */}
              <Card>
                <Section title="Issue Breakdown" icon="🐞">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[
                      { l: "Bugs", v: D.bugs, c: C.red },
                      { l: "Tasks", v: D.tasks, c: C.blueSoft },
                      { l: "Resolved", v: D.done, c: C.green },
                      { l: "Open", v: D.pending, c: C.orange },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{
                        background: `${c}0d`, border: `1px solid ${c}25`,
                        borderRadius: 8, padding: "10px 8px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: c }}>{v}</div>
                        <div style={{ fontSize: "0.65rem", color: C.slate, fontWeight: 600, textTransform: "uppercase" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: C.slate, marginBottom: 4 }}>
                    Resolution: <b style={{ color: C.green }}>{D.total ? Math.round((D.done / D.total) * 100) : 0}%</b>
                  </div>
                  <div style={{ background: "#e2e8f0", borderRadius: 99, height: 6 }}>
                    <div style={{ height: "100%", borderRadius: 99, background: C.green, width: `${D.total ? (D.done / D.total) * 100 : 0}%` }} />
                  </div>
                </Section>
              </Card>
            </div>

            {/* Row 4: Trend Chart */}
            <Card>
              <Section title="Issue Activity Stream" icon="📈" sub="Issues created vs. resolved over time">
                <div style={{ height: 240 }}>
                  {D.activityStream.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={D.activityStream}>
                        <defs>
                          <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={C.orange} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={C.orange} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradClosed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={C.green} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}` }} />
                        <Area type="monotone" dataKey="created" name="Created" stroke={C.orange} fill="url(#gradCreated)" strokeWidth={2} />
                        <Area type="monotone" dataKey="closed" name="Resolved" stroke={C.green} fill="url(#gradClosed)" strokeWidth={2} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "0.75rem" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <EmptyState msg="No trend data available yet" icon="📉" />}
                </div>
              </Section>
            </Card>
          </div>
        )}

        {/* ════════════ ISSUES TAB ════════════ */}
        {tab === "issues" && (
          <Card>
            <Section title="All Issues" icon="🐛"
              sub={`${D.total} total · ${D.done} resolved · ${D.pending} open`}
              right={
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text" placeholder="Search issues…" value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                      fontSize: "0.82rem", outline: "none", width: 200,
                    }}
                  />
                  <select value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: "0.82rem" }}>
                    <option value="all">All</option>
                    <option value="bugs">Bugs</option>
                    <option value="tasks">Tasks</option>
                    <option value="open">Open</option>
                    <option value="done">Resolved</option>
                  </select>
                </div>
              }
            >
              {/* Status pills */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
                {D.byStatus.map(({ status, count }) => {
                  const s = STATUS_MAP[status.toLowerCase()] || STATUS_MAP.open;
                  return <Chip key={status} label={`${s.icon} ${status}: ${count}`} bg={s.bg} color={s.fg} />;
                })}
              </div>

              <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${C.border}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: `2px solid ${C.border}` }}>
                      {["#", "Type", "Sprint", "Status", "Team", "Severity", "Created", "Closed"].map(h => (
                        <th key={h} style={{
                          padding: "10px 12px", textAlign: "left", fontSize: "0.7rem",
                          fontWeight: 700, color: C.slate, textTransform: "uppercase",
                          letterSpacing: "0.04em", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: C.slate }}>No matching issues.</td></tr>
                    ) : filteredIssues.map((issue) => {
                      const iid = issue.issue_id || issue.issueid;
                      const isBug = (issue.issuetype || "").toLowerCase() === "bug";
                      const status = issue.closeddate ? "Done" : (issue.status || "Open");
                      const sSty = STATUS_MAP[status.toLowerCase()] || STATUS_MAP.open;
                      const sev = (issue.severity || "").toLowerCase();
                      const sevSty = SEV_MAP[sev] || SEV_MAP.low;
                      return (
                        <tr key={iid} style={{ borderBottom: "1px solid #f1f5f9", background: isBug ? "#fffbfb" : "#fff" }}>
                          <td style={{ padding: "9px 12px", fontWeight: 700, fontSize: "0.82rem", color: C.slate }}>#{iid}</td>
                          <td style={{ padding: "9px 12px" }}>
                            <Chip label={isBug ? "Bug" : "Task"} bg={isBug ? "#fef2f2" : "#eff6ff"} color={isBug ? C.red : C.blue} />
                          </td>
                          <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>{issue.sprint || "—"}</td>
                          <td style={{ padding: "9px 12px" }}>
                            <Chip label={status} bg={sSty.bg} color={sSty.fg} />
                          </td>
                          <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>{issue.assigneeteam || "—"}</td>
                          <td style={{ padding: "9px 12px" }}>
                            <Chip label={sev || "—"} bg={sevSty.bg} color={sevSty.fg} style={{ textTransform: "capitalize" }} />
                          </td>
                          <td style={{ padding: "9px 12px", fontSize: "0.78rem", color: C.slate }}>
                            {issue.createddate ? new Date(issue.createddate).toLocaleDateString() : "—"}
                          </td>
                          <td style={{ padding: "9px 12px", fontSize: "0.78rem", color: C.slate }}>
                            {issue.closeddate ? new Date(issue.closeddate).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 8, fontSize: "0.75rem", color: C.slate }}>
                Showing {filteredIssues.length} of {D.total} issues
              </div>
            </Section>
          </Card>
        )}

        {/* ════════════ TEAM TAB ════════════ */}
        {tab === "team" && (
          <div style={{ display: "grid", gap: "1.25rem" }}>

            {/* Team Performance Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
              {D.byTeam.map((t, idx) => {
                const clr = PIE_COLORS[idx % PIE_COLORS.length];
                const pctDone = t.total ? Math.round((t.done / t.total) * 100) : 0;
                return (
                  <div key={t.team} style={{
                    background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`,
                    padding: "1.25rem", borderTop: `4px solid ${clr}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.navy }}>{t.team}</div>
                      <Chip label={`${pctDone}%`} bg={`${clr}18`} color={clr} />
                    </div>
                    <div style={{ fontSize: "0.78rem", color: C.slate, marginBottom: 8 }}>
                      {t.total} issues · {t.done} resolved · {t.total - t.done} open
                    </div>
                    <div style={{ background: "#e2e8f0", borderRadius: 99, height: 6 }}>
                      <div style={{ height: "100%", borderRadius: 99, background: clr, width: `${pctDone}%`, transition: "width 0.5s" }} />
                    </div>
                    {t.total > 15 && (
                      <div style={{ marginTop: 8, padding: "4px 8px", background: "#fef2f2", borderRadius: 6, fontSize: "0.7rem", color: C.red, fontWeight: 600 }}>
                        ⚠ Heavy workload
                      </div>
                    )}
                  </div>
                );
              })}
              {D.byTeam.length === 0 && (
                <div style={{ gridColumn: "1/-1", padding: "2rem", textAlign: "center", color: C.slate }}>
                  No team data — teams are derived from issue assignments.
                </div>
              )}
            </div>

            {/* Individual Members */}
            <Card>
              <Section title="Project Members" icon="👤" sub={`${members.length} members assigned to this project`}>
                {members.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                    {members.map((m) => {
                      const roleClr = ROLE_COLORS[m.role_in_project] || ROLE_COLORS.member;
                      const avatarClr = PIE_COLORS[m.id % PIE_COLORS.length];
                      return (
                        <div key={m.id} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 14px", background: "#f8fafc",
                          borderRadius: 12, border: `1px solid ${C.border}`,
                          transition: "box-shadow 0.2s",
                        }}>
                          <Avatar name={m.name} email={m.email} color={avatarClr} />
                          <div style={{ flex: 1, overflow: "hidden" }}>
                            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: C.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {m.name || m.email.split("@")[0]}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: C.slate, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {m.email}
                            </div>
                          </div>
                          <Chip label={m.role_in_project || "member"} bg={`${roleClr}18`} color={roleClr} style={{ textTransform: "capitalize", flexShrink: 0 }} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState msg="No members assigned yet. Assign users from the Projects page." icon="👥" />
                )}
              </Section>
            </Card>
          </div>
        )}

        {/* ════════════ ANALYTICS TAB ════════════ */}
        {tab === "analytics" && (
          <div style={{ display: "grid", gap: "1.25rem" }}>

            {/* Row 1: Resolution Trend + Insights */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
              <Card>
                <Section title="Resolution Trend" icon="📈" sub="Issues resolved over time">
                  <div style={{ height: 260 }}>
                    {D.trendStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={D.trendStats}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ borderRadius: 10 }} />
                          <Line type="monotone" dataKey="solved" stroke={C.blue} strokeWidth={3}
                            dot={{ r: 4, fill: C.blue }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyState msg="No resolution data yet" icon="📉" />}
                  </div>
                </Section>
              </Card>

              <Card>
                <Section title="Project Insights" icon="💡" sub="Key metrics at a glance">
                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      { l: "Duration", v: insights?.duration_days ? `${insights.duration_days} days` : (durationDays ? `${durationDays} days` : "—"), c: C.blueSoft, i: "📅" },
                      { l: "Avg Resolution Time", v: `${D.avgResolution} days`, c: C.green, i: "⏱️" },
                      { l: "Total Issues", v: D.total, c: C.navy, i: "📋" },
                      { l: "Bug/Task Ratio", v: D.tasks > 0 ? `${(D.bugs / D.tasks).toFixed(1)}:1` : `${D.bugs}:0`, c: C.red, i: "🐛" },
                      { l: "Escalation Rate", v: `${D.total ? Math.round((D.escalated / D.total) * 100) : 0}%`, c: C.orange, i: "🚨" },
                      { l: "Team Count", v: D.teams.length, c: C.purple, i: "👥" },
                    ].map(({ l, v, c, i }) => (
                      <div key={l} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", background: "#f8fafc", borderRadius: 10,
                        borderLeft: `3px solid ${c}`,
                      }}>
                        <span style={{ fontSize: "1.1rem" }}>{i}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.68rem", color: C.slate, textTransform: "uppercase", fontWeight: 600 }}>{l}</div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: c }}>{v}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              </Card>
            </div>

            {/* Row 2: Monthly Insights Chart */}
            {insights?.monthly_insights?.length > 0 && (
              <Card>
                <Section title="Monthly Resolution" icon="📅" sub="Bugs and tasks resolved per month">
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.monthly_insights} barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ borderRadius: 10 }} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "0.75rem" }} />
                        <Bar dataKey="bugs_solved" name="Bugs Resolved" fill={C.red} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="tasks_solved" name="Tasks Resolved" fill={C.blueSoft} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              </Card>
            )}

            {/* Row 3: Sprint velocity */}
            <Card>
              <Section title="Sprint Velocity" icon="🚀" sub="Issues resolved per sprint">
                <div style={{ height: 240 }}>
                  {D.bySprint.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={D.bySprint} barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="sprint" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ borderRadius: 10 }} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "0.75rem" }} />
                        <Bar dataKey="total" name="Total" fill="#dbeafe" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="done" name="Resolved" fill={C.green} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState msg="No sprint data yet" icon="🚀" />}
                </div>
              </Section>
            </Card>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { opacity: 0.92; }
        tr:hover { background: #f8fafc !important; }
      `}</style>
    </div>
  );
};

/* ── Budget editor sub-component ───────────────────────────────────────────── */
const BudgetEditor = ({ projectId, used, onSave }) => {
  const [val, setVal] = useState(used ?? "");
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    setSaving(true);
    try {
      await updateBudget(projectId, Number(val));
      toast.success("Budget updated");
      onSave(Number(val));
    } catch { toast.error("Failed to update budget"); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="number" value={val} onChange={(e) => setVal(e.target.value)}
        style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid #e2e8f0`, fontSize: "0.82rem", width: 120, outline: "none" }}
        placeholder="Budget used ($)" />
      <button onClick={handle} disabled={saving} style={{
        padding: "6px 14px", background: "#1e40af", color: "#fff", border: "none",
        borderRadius: 8, cursor: saving ? "not-allowed" : "pointer",
        fontSize: "0.82rem", opacity: saving ? 0.6 : 1, fontWeight: 600,
      }}>
        {saving ? "Saving…" : "Update"}
      </button>
    </div>
  );
};

/* ── Empty state sub-component ──────────────────────────────────────────── */
const EmptyState = ({ msg, icon = "📊" }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
    height: "100%", minHeight: 120, color: "#64748b", gap: 8,
  }}>
    <span style={{ fontSize: "2rem" }}>{icon}</span>
    <span style={{ fontSize: "0.85rem" }}>{msg}</span>
  </div>
);

export default ProjectDetail;